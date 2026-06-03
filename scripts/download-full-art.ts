import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

type ManifestEntry = {
  file: string;
  cardId: string;
  oracleId?: string;
  name: string;
  displayName?: string;
  layout?: string;
  set: 'lea' | 'leb';
  setName?: string;
  collectorNumber?: string;
  releasedAt?: string;
  scryfallUri?: string;
  artCropUrl?: string;
};

type FullArtEntry = {
  file: string;
  cardId: string;
  name: string;
  set: 'lea' | 'leb';
  imageUrl: string;
};

const QUALITY = (process.env.SCRYFALL_QUALITY ?? 'png') as 'png' | 'large';
const OUT_DIR = process.env.FULL_ART_DIR ?? join(import.meta.dirname, '../data/full-art');
const MANIFEST_IN =
  process.env.MANIFEST_PATH ??
  join(import.meta.dirname, '../data/art-crops/alpha-beta-manifest.json');
const MANIFEST_OUT = join(OUT_DIR, 'full-art-manifest.json');
const DELAY_MS = Number(process.env.SCRYFALL_DELAY) || 50;
const MAX_RETRIES = 3;
const CONCURRENCY = Number(process.env.SCRYFALL_CONCURRENCY) || 8;

function bar(filled: number, total: number, width = 40): string {
  const frac = Math.min(filled / total, 1);
  const n = Math.round(frac * width);
  const pct = (frac * 100).toFixed(1).padStart(6);
  return `[${'#'.repeat(n)}${'-'.repeat(width - n)}] ${pct}% ${filled}/${total}`;
}

function imageUrl(cardId: string): string {
  const a = cardId[0]!;
  const b = cardId[1]!;
  return QUALITY === 'png'
    ? `https://cards.scryfall.io/png/front/${a}/${b}/${cardId}.png`
    : `https://cards.scryfall.io/large/front/${a}/${b}/${cardId}.jpg`;
}

function sanitiseFilename(name: string): string {
  const map: Record<string, string> = {
    À: 'A', Á: 'A', Â: 'A', Ã: 'A', Ä: 'A', Å: 'A',
    à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a',
    È: 'E', É: 'E', Ê: 'E', Ë: 'E',
    è: 'e', é: 'e', ê: 'e', ë: 'e',
    Ì: 'I', Í: 'I', Î: 'I', Ï: 'I',
    ì: 'i', í: 'i', î: 'i', ï: 'i',
    Ò: 'O', Ó: 'O', Ô: 'O', Õ: 'O', Ö: 'O', Ø: 'O',
    ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ø: 'o',
    Ù: 'U', Ú: 'U', Û: 'U', Ü: 'U',
    ù: 'u', ú: 'u', û: 'u', ü: 'u',
    Ç: 'C', ç: 'c',
    Ñ: 'N', ñ: 'n',
    Æ: 'AE', æ: 'ae',
    Œ: 'OE', œ: 'oe',
  };
  let s = name;
  for (const [k, v] of Object.entries(map)) s = s.replace(new RegExp(k, 'g'), v);
  s = s.replace(/[\\/:*?"<>|]/g, '');
  s = s.replace(/ /g, '_');
  s = s.replace(/[^\w.-]/g, '');
  return s;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastDraw = 0;

function redraw(ok: number, skip: number, fail: number, total: number) {
  const now = Date.now();
  if (now - lastDraw < 100 && ok + skip + fail < total) return;
  lastDraw = now;
  process.stdout.write(
    `\r  ${bar(ok + skip + fail, total)}  ok:${ok}  skip:${skip}  fail:${fail}`,
  );
}

async function download(
  entry: ManifestEntry,
): Promise<{ entry: FullArtEntry; skipped: boolean } | { entry: null; error: string }> {
  const filename = `${entry.cardId}.${QUALITY === 'png' ? 'png' : 'jpg'}`;
  const outPath = join(OUT_DIR, filename);

  if (existsSync(outPath) && statSync(outPath).size > 0) {
    return {
      entry: {
        file: filename,
        cardId: entry.cardId,
        name: entry.name,
        set: entry.set,
        imageUrl: imageUrl(entry.cardId),
      },
      skipped: true,
    };
  }

  const url = imageUrl(entry.cardId);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          return { entry: null, error: `404 not found` };
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(outPath, buf);
      return {
        entry: {
          file: filename,
          cardId: entry.cardId,
          name: entry.name,
          set: entry.set,
          imageUrl: url,
        },
        skipped: false,
      };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(1000 * attempt);
        continue;
      }
      return { entry: null, error: (err as Error).message };
    }
  }
  return { entry: null, error: 'unknown' };
}

async function main() {
  console.log(
    `Quality: ${QUALITY} | Concurrency: ${CONCURRENCY} | Output: ${OUT_DIR}`,
  );
  mkdirSync(OUT_DIR, { recursive: true });

  const manifest: ManifestEntry[] = JSON.parse(readFileSync(MANIFEST_IN, 'utf8'));

  // Deduplicate by cardId+set
  const seen = new Set<string>();
  const deduped: ManifestEntry[] = [];
  for (const e of manifest) {
    const key = `${e.cardId}_${e.set}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(e);
    }
  }
  console.log(`${manifest.length} entries → ${deduped.length} unique`);
  const total = deduped.length;

  let ok = 0;
  let skip = 0;
  let fail = 0;
  const results: FullArtEntry[] = [];

  // Concurrent download pool
  let cursor = 0;
  async function worker() {
    while (cursor < deduped.length) {
      const i = cursor++;
      const entry = deduped[i]!;
      const result = await download(entry);

      if ('entry' in result && result.entry) {
        results.push(result.entry);
        if (result.skipped) skip++;
        else ok++;
      } else {
        fail++;
      }
      redraw(ok, skip, fail, total);

      if (cursor < deduped.length) await sleep(DELAY_MS);
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  process.stdout.write(
    `\r  ${bar(total, total)}  ok:${ok}  skip:${skip}  fail:${fail}\n`,
  );

  // Sort by name for easy reading
  results.sort((a, b) => a.name.localeCompare(b.name) || a.set.localeCompare(b.set));

  writeFileSync(MANIFEST_OUT, JSON.stringify(results, null, 2));
  console.log(`\n${results.length} cards → ${MANIFEST_OUT}`);

  if (fail > 0) {
    console.log(`${fail} failed. Run again to retry.`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
