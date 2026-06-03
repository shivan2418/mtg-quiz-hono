import { createReadStream } from "node:fs";
import { mkdir, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const dataDir = path.join(rootDir, "data");

const defaults = {
  delayMs: 75,
  force: false,
  dryRun: false,
  includeSplit: false,
  includeTokens: false,
  limit: Number.POSITIVE_INFINITY,
  outputDir: path.join(dataDir, "art-crops"),
  retries: 3,
};

function usage() {
  return `Usage: pnpm download-art-crops [options]

Downloads Scryfall art_crop images from the latest data/unique-artwork-*.json file.

Options:
  --input <path>       Input JSON file. Defaults to latest data/unique-artwork-*.json
  --output <path>      Output directory. Defaults to data/art-crops
  --limit <number>     Download at most this many art crops
  --delay-ms <number>  Delay after each download request. Defaults to ${defaults.delayMs}
  --retries <number>   Retry failed downloads this many times. Defaults to ${defaults.retries}
  --include-split      Include split cards. Defaults to excluding them
  --include-tokens     Include tokens. Defaults to excluding them
  --force              Re-download files that already exist
  --dry-run            Print what would be downloaded without writing files
  --help               Show this help
`;
}

function parseArgs(args) {
  const options = { ...defaults, input: null };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help") {
      options.help = true;
      continue;
    }

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--include-split") {
      options.includeSplit = true;
      continue;
    }

    if (arg === "--include-tokens") {
      options.includeTokens = true;
      continue;
    }

    if (arg === "--input") {
      options.input = requiredValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.outputDir = path.resolve(requiredValue(args, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--limit") {
      options.limit = parsePositiveInteger(requiredValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === "--delay-ms") {
      options.delayMs = parseNonNegativeInteger(requiredValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg === "--retries") {
      options.retries = parsePositiveInteger(requiredValue(args, index, arg), arg);
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (!options.input) {
      options.input = arg;
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}`);
  }

  if (options.input) {
    options.input = path.resolve(options.input);
  }

  return options;
}

function requiredValue(args, index, option) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }

  return value;
}

function parsePositiveInteger(value, option) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${option} must be a positive integer`);
  }

  return parsed;
}

function parseNonNegativeInteger(value, option) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${option} must be a non-negative integer`);
  }

  return parsed;
}

async function findLatestUniqueArtworkFile() {
  const files = await readdir(dataDir);
  const candidates = files.filter((file) => /^unique-artwork-.*\.json$/.test(file));

  if (candidates.length === 0) {
    throw new Error(`No data/unique-artwork-*.json file found in ${dataDir}`);
  }

  const withStats = await Promise.all(
    candidates.map(async (file) => ({
      file,
      stats: await stat(path.join(dataDir, file)),
    })),
  );

  withStats.sort((left, right) => right.stats.mtimeMs - left.stats.mtimeMs);

  return path.join(dataDir, withStats[0].file);
}

function parseCardLine(line, lineNumber) {
  const trimmed = line.trim();

  if (!trimmed || trimmed === "[" || trimmed === "]") {
    return null;
  }

  const json = trimmed.endsWith(",") ? trimmed.slice(0, -1) : trimmed;

  try {
    return JSON.parse(json);
  } catch (error) {
    throw new Error(`Failed to parse JSON on line ${lineNumber}: ${error.message}`);
  }
}

function artCropEntries(card) {
  if (!card || typeof card.id !== "string") {
    return [];
  }

  const topLevelUrl = card.image_uris?.art_crop;

  if (typeof topLevelUrl === "string") {
    return [
      {
        cardId: card.id,
        filename: `${card.id}${extensionForUrl(topLevelUrl)}`,
        name: card.name ?? "",
        source: "card",
        url: topLevelUrl,
      },
    ];
  }

  if (!Array.isArray(card.card_faces)) {
    return [];
  }

  return card.card_faces.flatMap((face, index) => {
    const faceUrl = face?.image_uris?.art_crop;

    if (typeof faceUrl !== "string") {
      return [];
    }

    const faceNumber = index + 1;

    return [
      {
        cardId: card.id,
        faceIndex: index,
        filename: `${card.id}__face-${faceNumber}${extensionForUrl(faceUrl)}`,
        name: card.name ?? "",
        faceName: face.name ?? "",
        source: `face-${faceNumber}`,
        url: faceUrl,
      },
    ];
  });
}

function excludedReason(card, options) {
  if (!options.includeSplit && isSplitCard(card)) {
    return "split";
  }

  if (!options.includeTokens && isTokenCard(card)) {
    return "token";
  }

  return null;
}

function isSplitCard(card) {
  return card?.layout === "split" || card?.layout === "aftermath";
}

function isTokenCard(card) {
  if (typeof card?.layout === "string" && card.layout.includes("token")) {
    return true;
  }

  return typeof card?.type_line === "string" && card.type_line.startsWith("Token ");
}

function extensionForUrl(url) {
  try {
    return path.extname(new URL(url).pathname).toLowerCase() || ".jpg";
  } catch {
    return ".jpg";
  }
}

async function countArtCropTargets(input, options) {
  const reader = readline.createInterface({
    crlfDelay: Number.POSITIVE_INFINITY,
    input: createReadStream(input, { encoding: "utf8" }),
  });

  let lineNumber = 0;
  let targets = 0;

  rows: for await (const line of reader) {
    lineNumber += 1;
    const card = parseCardLine(line, lineNumber);

    if (!card) {
      continue;
    }

    if (excludedReason(card, options)) {
      continue;
    }

    for (const entry of artCropEntries(card)) {
      if (targets >= options.limit) {
        break rows;
      }

      if (entry) {
        targets += 1;
      }
    }
  }

  return targets;
}

function createProgressBar(total) {
  const width = 32;
  const stream = process.stderr;
  let current = 0;
  let lastLogged = 0;
  let lastRendered = "";
  let renderedFinal = false;

  function line(stats) {
    const ratio = total === 0 ? 1 : current / total;
    const filled = Math.round(width * ratio);
    const bar = `${"#".repeat(filled)}${"-".repeat(width - filled)}`;
    const percent = Math.floor(ratio * 100)
      .toString()
      .padStart(3, " ");

    return `Progress [${bar}] ${current}/${total} ${percent}% downloaded=${stats.downloaded} skipped=${stats.skipped} failed=${stats.failed}`;
  }

  function render(stats, force = false) {
    const nextLine = line(stats);

    if (stream.isTTY) {
      const clear = " ".repeat(Math.max(0, lastRendered.length - nextLine.length));
      stream.write(`\r${nextLine}${clear}`);
      lastRendered = nextLine;
      return;
    }

    if (force || current === total || current - lastLogged >= 100) {
      stream.write(`${nextLine}\n`);
      lastLogged = current;
      renderedFinal = current === total;
    }
  }

  return {
    clear() {
      if (!stream.isTTY || !lastRendered) {
        return;
      }

      stream.write(`\r${" ".repeat(lastRendered.length)}\r`);
      lastRendered = "";
    },
    increment(stats) {
      current += 1;
      render(stats);
    },
    finish(stats) {
      current = total;

      if (stream.isTTY || !renderedFinal) {
        render(stats, true);
      }

      if (stream.isTTY) {
        stream.write("\n");
      }
    },
  };
}

async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function downloadArtCrop(entry, outputPath, options) {
  if (options.dryRun) {
    if (!options.force && (await fileExists(outputPath))) {
      console.log(`${entry.filename} exists (skip)`);
      return "skipped";
    }

    console.log(`${entry.filename} <- ${entry.url}`);
    return "dry-run";
  }

  if (!options.force && (await fileExists(outputPath))) {
    return "skipped";
  }

  const tempPath = `${outputPath}.download`;
  let lastError;

  for (let attempt = 1; attempt <= options.retries; attempt += 1) {
    try {
      const response = await fetch(entry.url, {
        headers: {
          "User-Agent": "mtg-quiz-hono art crop downloader",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      if (buffer.length === 0) {
        throw new Error("Downloaded file was empty");
      }

      await writeFile(tempPath, buffer);
      await rename(tempPath, outputPath);
      return "downloaded";
    } catch (error) {
      lastError = error;

      if (attempt < options.retries) {
        await sleep(attempt * 1000);
      }
    }
  }

  await unlink(tempPath).catch((error) => {
    if (error.code !== "ENOENT") {
      throw error;
    }
  });

  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usage());
    return;
  }

  const input = options.input ?? (await findLatestUniqueArtworkFile());

  if (!options.dryRun) {
    await mkdir(options.outputDir, { recursive: true });
  }

  console.log(`Input: ${input}`);
  console.log(`Output: ${options.outputDir}`);
  console.log("Names: <card-id>.jpg or <card-id>__face-N.jpg");
  console.log(
    `Filters: ${options.includeSplit ? "including" : "excluding"} split cards, ${options.includeTokens ? "including" : "excluding"} tokens`,
  );

  const totalTargets = await countArtCropTargets(input, options);
  const progress = createProgressBar(totalTargets);

  const reader = readline.createInterface({
    crlfDelay: Number.POSITIVE_INFINITY,
    input: createReadStream(input, { encoding: "utf8" }),
  });

  let failed = 0;
  let downloaded = 0;
  let dryRun = 0;
  let excluded = 0;
  let missingArtCrop = 0;
  let scanned = 0;
  let skipped = 0;
  let targets = 0;
  let lineNumber = 0;

  rows: for await (const line of reader) {
    lineNumber += 1;
    const card = parseCardLine(line, lineNumber);

    if (!card) {
      continue;
    }

    scanned += 1;

    if (excludedReason(card, options)) {
      excluded += 1;
      continue;
    }

    const entries = artCropEntries(card);

    if (entries.length === 0) {
      missingArtCrop += 1;
      continue;
    }

    for (const entry of entries) {
      if (targets >= options.limit) {
        break rows;
      }

      targets += 1;
      const outputPath = path.join(options.outputDir, entry.filename);

      try {
        const result = await downloadArtCrop(entry, outputPath, options);

        if (result === "downloaded") {
          downloaded += 1;
        }

        if (result === "skipped") {
          skipped += 1;
        }

        if (result === "dry-run") {
          dryRun += 1;
        }

        if (result === "downloaded" && options.delayMs > 0) {
          await sleep(options.delayMs);
        }
      } catch (error) {
        failed += 1;
        progress.clear();
        console.error(`Failed ${entry.filename}: ${error.message}`);
      }

      progress.increment({ downloaded, failed, skipped });
    }
  }

  progress.finish({ downloaded, failed, skipped });

  console.log(
    `Done. scanned=${scanned} targets=${targets} downloaded=${downloaded} skipped=${skipped} dryRun=${dryRun} excluded=${excluded} missingArtCrop=${missingArtCrop} failed=${failed}`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
