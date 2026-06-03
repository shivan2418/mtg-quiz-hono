import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ScryfallCard {
  name: string;
  set: string;
  set_name: string;
  released_at: string;
  lang: string;
  collector_number: string;
}

function bulkDataPath() {
  if (process.env.BULK_DATA_PATH) return process.env.BULK_DATA_PATH;
  return join(import.meta.dirname, '../data/default-cards-20260602090812.json');
}

const targetSets = new Set([
  'lea', 'leb', '2ed', '3ed', '4ed', 'arn', 'atq', 'leg', 'drk', 'fem',
  'ice', 'hml', 'all', 'chr', '5ed', 'mir', 'vis', 'wth', 'tmp', 'sth',
  'exo', '6ed', 'usg', 'ulg', 'uds',
  'mmq', 'nem', 'pcy',
  'inv', 'pls', 'apc', '7ed', 'ody', 'tor', 'jud',
  'ons', 'lgn', 'scg', '8ed', 'mrd', 'dst', '5dn',
  'chk', 'bok', 'sok', '9ed', 'rav', 'gpt', 'dis',
  'csp', 'tsp', 'plc', 'fut', '10e', 'lrw', 'mor',
  'shm', 'eve',
]);

const sets = new Map<
  string,
  { setName: string; year: string; total: number; uniqueArt: number; cards: string[] }
>();

console.log('Processing bulk data...');
const raw = readFileSync(bulkDataPath(), 'utf8');
const allCards: ScryfallCard[] = JSON.parse(raw);

for (const c of allCards) {
  if (!targetSets.has(c.set)) continue;
  if (c.lang !== 'en') continue;

  if (!sets.has(c.set)) {
    sets.set(c.set, {
      setName: c.set_name,
      year: c.released_at.slice(0, 4),
      total: 0,
      uniqueArt: 0,
      cards: [],
    });
  }

  const s = sets.get(c.set)!;
  s.total++;

  if (!s.cards.includes(c.name)) {
    s.cards.push(c.name);
    s.uniqueArt = s.cards.length;
  }
}

const results = [...sets.entries()]
  .sort((a, b) => {
    const ya = parseInt(a[1].year);
    const yb = parseInt(b[1].year);
    if (ya !== yb) return ya - yb;
    return a[1].setName.localeCompare(b[1].setName);
  })
  .map(([code, s]) => ({
    code,
    name: s.setName,
    year: s.year,
    totalCards: s.total,
    uniqueArtwork: s.uniqueArt,
  }));

const totalCards = results.reduce((sum, r) => sum + r.totalCards, 0);
const totalUnique = results.reduce((sum, r) => sum + r.uniqueArtwork, 0);

const output = {
  summary: { totalSets: results.length, totalCards, totalUniqueArtwork: totalUnique },
  sets: results,
};

const outPath = join(import.meta.dirname, '../data/set-card-counts.json');
writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`\n${results.length} sets, ${totalCards} total cards, ${totalUnique} unique artwork`);
for (const r of results) {
  console.log(
    `  ${r.code.padEnd(5)} ${r.name.padEnd(30)} ${String(r.totalCards).padStart(4)} cards  ${String(r.uniqueArtwork).padStart(4)} unique`,
  );
}
console.log(`\nOutput: ${outPath}`);
