import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './index';
import { cards, users, quizzes, questions } from './schema';
import { hash } from 'bcryptjs';

const questionCount = 30;
const defaultImageStaticBaseUrl = '/art-crops';

type AlphaBetaManifestEntry = {
  file: string;
  name: string;
  set: 'lea' | 'leb';
};

function alphaBetaManifestPath() {
  if (process.env.ALPHA_BETA_MANIFEST_PATH) {
    return process.env.ALPHA_BETA_MANIFEST_PATH;
  }

  const seedDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(seedDir, '../../../..');

  return path.join(repoRoot, 'data/art-crops/alpha-beta-manifest.json');
}

function loadAlphaBetaCards() {
  const manifestPath = alphaBetaManifestPath();
  const manifest = JSON.parse(
    readFileSync(manifestPath, 'utf8'),
  ) as AlphaBetaManifestEntry[];
  const byName = new Map<string, AlphaBetaManifestEntry>();

  for (const entry of manifest) {
    if (entry.set !== 'lea' && entry.set !== 'leb') continue;

    const existing = byName.get(entry.name);
    if (!existing || (entry.set === 'lea' && existing.set !== 'lea')) {
      byName.set(entry.name, entry);
    }
  }

  return [...byName.values()];
}

function quizSeed() {
  if (!process.env.SEED_QUIZ_SEED) {
    return Math.floor(Math.random() * 1_000_000_000);
  }

  const seed = Number(process.env.SEED_QUIZ_SEED);
  if (!Number.isInteger(seed)) {
    throw new Error('SEED_QUIZ_SEED must be an integer');
  }

  return seed;
}

function sampleCards(
  sourceCards: AlphaBetaManifestEntry[],
  count: number,
  seed: number,
) {
  if (sourceCards.length < count) {
    throw new Error(
      `Need ${count} Alpha/Beta cards with downloaded images, found ${sourceCards.length}`,
    );
  }

  const random = seededRandom(seed);
  const shuffled = [...sourceCards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffled[index]!;
    shuffled[index] = shuffled[swapIndex]!;
    shuffled[swapIndex] = current;
  }

  return shuffled.slice(0, count);
}

function seededRandom(seed: number) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function imageUrlFor(file: string) {
  const baseUrl = process.env.IMAGE_STATIC_BASE_URL ?? defaultImageStaticBaseUrl;
  return `${baseUrl.replace(/\/+$/, '')}/${file}`;
}

async function seed() {
  const seedValue = quizSeed();
  const alphaBetaCards = loadAlphaBetaCards();
  const quizCards = sampleCards(alphaBetaCards, questionCount, seedValue);

  // --- Cards ---
  console.log(`Seeding ${alphaBetaCards.length} cards from manifest...`);
  const cardData = alphaBetaCards.map((entry) => ({
    title: entry.name,
    file: entry.file,
    set: (entry.set === 'lea' ? 'ALPHA' : 'BETA') as typeof cards.$inferSelect.set,
    year: 1993,
  }));
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
    .returning();
  if (!user) throw new Error('Failed to create user');

  // --- Quiz ---
  console.log('Seeding quiz...');
  const [quiz] = await db
    .insert(quizzes)
    .values({
      seed: seedValue,
      questionCount,
      completed: false,
      userId: user.id,
    })
    .returning();
  if (!quiz) throw new Error('Failed to create quiz');

  // --- Questions ---
  console.log(`Seeding ${questionCount} Alpha/Beta questions...`);
  console.log(
    `Using image static base URL: ${process.env.IMAGE_STATIC_BASE_URL ?? defaultImageStaticBaseUrl}`,
  );
  const questionData: { imageUrl: string; answer: string; quizId: string }[] =
    quizCards.map((card) => ({
      imageUrl: imageUrlFor(card.file),
      answer: card.name,
      quizId: quiz.id,
    }));
  await db.insert(questions).values(questionData);

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
