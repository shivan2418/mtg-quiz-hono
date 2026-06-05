import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './index';
import { cards, users, quizFormats, quizFormatSets } from './schema';
import { hash } from 'bcryptjs';
import { formats, allSetCodes } from './formats';

function bulkDataPath() {
  if (process.env.BULK_DATA_PATH) return process.env.BULK_DATA_PATH;
  const seedDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(seedDir, '../../../..');
  return path.join(repoRoot, 'data/default-cards-20260602090812.json');
}

interface ScryfallCard {
  id: string;
  name: string;
  set: string;
  released_at: string;
  lang: string;
  image_uris?: { art_crop?: string; png?: string; large?: string };
}

async function seed() {
  console.log('Loading bulk data...');
  const raw = readFileSync(bulkDataPath(), 'utf8');
  const allCards: ScryfallCard[] = JSON.parse(raw);
  console.log(`Loaded ${allCards.length} cards`);

  // Collect all set codes from all formats
  const allSets = new Set(allSetCodes());
  console.log(`\nFormats: ${formats.map((f) => `${f.name} (${f.setCodes.length} sets)`).join(', ')}`);
  console.log(`Target sets: ${allSets.size} — ${[...allSets].sort().join(', ')}`);

  // Insert one row per (name, set, collector_number) — each printing
  const seen = new Set<string>();
  const cardData: { title: string; file: string; set: string; year: number }[] = [];
  const setsFound = new Set<string>();

  for (const c of allCards) {
    if (!allSets.has(c.set)) continue;
    if (c.lang !== 'en') continue;
    setsFound.add(c.set);

    const key = `${c.name}|${c.set}`;
    if (seen.has(key)) continue;
    seen.add(key);

    cardData.push({
      title: c.name,
      file: c.image_uris?.art_crop ?? c.image_uris?.png ?? '',
      set: c.set,
      year: parseInt(c.released_at?.slice(0, 4) ?? '1993'),
    });
  }

  console.log(`Sets found: ${[...setsFound].sort().join(', ')}`);
  console.log(`Unique cards to seed: ${cardData.length}`);

  // --- Formats ---
  console.log('\nSeeding formats...');
  for (const [fi, format] of formats.entries()) {
    const enabled = format.id === 'standard' || format.id === 'classic';
    await db
      .insert(quizFormats)
      .values({ id: format.id, name: format.name, description: format.description, enabled, sortOrder: fi })
      .onConflictDoUpdate({ target: quizFormats.id, set: { name: format.name, description: format.description, enabled, sortOrder: fi } });

    for (const [si, code] of format.setCodes.entries()) {
      await db
        .insert(quizFormatSets)
        .values({ formatId: format.id, setCode: code, position: si })
        .onConflictDoNothing({ target: [quizFormatSets.formatId, quizFormatSets.setCode] });
    }
  }
  console.log(`Seeded ${formats.length} formats`);

  // --- Cards ---
  console.log(`\nInserting ${cardData.length} cards...`);
  await db.insert(cards).values(cardData);

  // --- User ---
  console.log('Seeding user...');
  const [user] = await db
    .insert(users)
    .values({
      email: 'admin@mtgquiz.com',
      name: 'Admin',
      password: await hash('admin123', 10),
      admin: true,
    })
    .onConflictDoNothing()
    .returning();
  if (!user) {
    console.log('User already exists, skipping');
  } else {
    console.log(`User created: ${user.email}`);
  }
  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
