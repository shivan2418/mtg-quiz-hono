const sets = [
  'lea','leb','2ed','3ed','4ed','arn','atq','leg','drk','fem',
  'ice','hml','all','chr','5ed','mir','vis','wth','tmp','sth',
  'exo','6ed','usg','ulg','uds',
];

const outDir = import.meta.dirname + '/../data/set-logos';

let ok = 0;
let fail = 0;

for (const code of sets) {
  const url = `https://svgs.scryfall.io/sets/${code}.svg`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`  ${code}: ${res.status} (skipping)`);
      fail++;
      continue;
    }
    await Bun.write(`${outDir}/${code}.svg`, res);
    ok++;
    console.log(`  ${code}: OK`);
  } catch (e) {
    console.log(`  ${code}: error (${(e as Error).message})`);
    fail++;
  }
}

console.log(`\n${ok} downloaded, ${fail} failed → ${outDir}`);
