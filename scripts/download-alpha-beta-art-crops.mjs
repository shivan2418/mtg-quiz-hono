import { createReadStream } from "node:fs";
import { mkdir, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const dataDir = path.join(rootDir, "data");
const targetSets = new Set(["lea", "leb"]);

const defaults = {
  delayMs: 75,
  dryRun: false,
  force: false,
  limit: Number.POSITIVE_INFINITY,
  manifest: null,
  outputDir: path.join(dataDir, "art-crops"),
  retries: 3,
};

function usage() {
  return `Usage: pnpm download-alpha-beta-art-crops [options]

Downloads all Limited Edition Alpha and Beta art_crop images from the latest data/default-cards-*.json file.

Options:
  --input <path>       Input JSON file. Defaults to latest data/default-cards-*.json
  --output <path>      Output directory. Defaults to data/art-crops
  --manifest <path>    Manifest JSON path. Defaults to <output>/alpha-beta-manifest.json
  --limit <number>     Download at most this many art crops
  --delay-ms <number>  Delay after each download request. Defaults to ${defaults.delayMs}
  --retries <number>   Retry failed downloads this many times. Defaults to ${defaults.retries}
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

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--force") {
      options.force = true;
      continue;
    }

    if (arg === "--input") {
      options.input = path.resolve(requiredValue(args, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--output") {
      options.outputDir = path.resolve(requiredValue(args, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--manifest") {
      options.manifest = path.resolve(requiredValue(args, index, arg));
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
      options.input = path.resolve(arg);
      continue;
    }

    throw new Error(`Unexpected argument: ${arg}`);
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

async function findLatestDefaultCardsFile() {
  const files = await readdir(dataDir);
  const candidates = files.filter((file) => /^default-cards-.*\.json$/.test(file));

  if (candidates.length === 0) {
    throw new Error(`No data/default-cards-*.json file found in ${dataDir}`);
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

async function collectAlphaBetaEntries(input, limit) {
  const reader = readline.createInterface({
    crlfDelay: Number.POSITIVE_INFINITY,
    input: createReadStream(input, { encoding: "utf8" }),
  });

  const entries = [];
  const setCounts = { lea: 0, leb: 0 };
  let lineNumber = 0;
  let missingArtCrop = 0;

  for await (const line of reader) {
    lineNumber += 1;
    const card = parseCardLine(line, lineNumber);

    if (!card || !targetSets.has(card.set)) {
      continue;
    }

    setCounts[card.set] += 1;

    const artCropUrl = card.image_uris?.art_crop;

    if (typeof artCropUrl !== "string") {
      missingArtCrop += 1;
      continue;
    }

    if (entries.length < limit) {
      entries.push({
        file: `${card.id}${extensionForUrl(artCropUrl)}`,
        cardId: card.id,
        oracleId: card.oracle_id ?? "",
        name: card.name ?? "",
        displayName: card.name ?? "",
        layout: card.layout ?? "",
        set: card.set,
        setName: card.set_name ?? "",
        collectorNumber: card.collector_number ?? "",
        releasedAt: card.released_at ?? "",
        scryfallUri: card.scryfall_uri ?? "",
        artCropUrl,
      });
    }
  }

  entries.sort(compareEntries);

  return { entries, missingArtCrop, setCounts };
}

function compareEntries(left, right) {
  if (left.set !== right.set) {
    return left.set.localeCompare(right.set);
  }

  return compareCollectorNumbers(left.collectorNumber, right.collectorNumber);
}

function compareCollectorNumbers(left, right) {
  const leftNumber = Number.parseInt(left, 10);
  const rightNumber = Number.parseInt(right, 10);

  if (Number.isInteger(leftNumber) && Number.isInteger(rightNumber) && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right);
}

function extensionForUrl(url) {
  try {
    return path.extname(new URL(url).pathname).toLowerCase() || ".jpg";
  } catch {
    return ".jpg";
  }
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

async function downloadEntry(entry, outputPath, options) {
  if (options.dryRun) {
    if (!options.force && (await fileExists(outputPath))) {
      console.log(`${entry.file} exists (skip)`);
      return "skipped";
    }

    console.log(`${entry.file} <- ${entry.artCropUrl}`);
    return "dry-run";
  }

  if (!options.force && (await fileExists(outputPath))) {
    return "skipped";
  }

  const tempPath = `${outputPath}.download`;
  let lastError;

  for (let attempt = 1; attempt <= options.retries; attempt += 1) {
    try {
      const response = await fetch(entry.artCropUrl, {
        headers: {
          "User-Agent": "mtg-quiz-hono alpha beta art crop downloader",
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

  const input = options.input ?? (await findLatestDefaultCardsFile());
  const manifestPath = options.manifest ?? path.join(options.outputDir, "alpha-beta-manifest.json");

  if (!options.dryRun) {
    await mkdir(options.outputDir, { recursive: true });
    await mkdir(path.dirname(manifestPath), { recursive: true });
  }

  console.log(`Input: ${input}`);
  console.log(`Output: ${options.outputDir}`);
  console.log(`Manifest: ${manifestPath}`);
  console.log("Sets: lea, leb");

  const { entries, missingArtCrop, setCounts } = await collectAlphaBetaEntries(input, options.limit);
  const progress = createProgressBar(entries.length);
  const manifest = [];

  let downloaded = 0;
  let dryRun = 0;
  let failed = 0;
  let skipped = 0;

  for (const entry of entries) {
    const outputPath = path.join(options.outputDir, entry.file);

    try {
      const result = await downloadEntry(entry, outputPath, options);

      if (result === "downloaded" || result === "skipped") {
        manifest.push(entry);
      }

      if (result === "downloaded") {
        downloaded += 1;
      }

      if (result === "dry-run") {
        dryRun += 1;
      }

      if (result === "skipped") {
        skipped += 1;
      }

      if (result === "downloaded" && options.delayMs > 0) {
        await sleep(options.delayMs);
      }
    } catch (error) {
      failed += 1;
      progress.clear();
      console.error(`Failed ${entry.file}: ${error.message}`);
    }

    progress.increment({ downloaded, failed, skipped });
  }

  progress.finish({ downloaded, failed, skipped });

  if (!options.dryRun) {
    await writeFile(`${manifestPath}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`);
    await rename(`${manifestPath}.tmp`, manifestPath);
  }

  console.log(
    `Done. alpha=${setCounts.lea} beta=${setCounts.leb} targets=${entries.length} downloaded=${downloaded} skipped=${skipped} dryRun=${dryRun} missingArtCrop=${missingArtCrop} manifestEntries=${manifest.length} failed=${failed}`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
