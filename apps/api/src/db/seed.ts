import { db } from './index';
import { cards, users, quizzes, questions } from './schema';
import { hash } from 'bcryptjs';

async function seed() {
  // --- Cards ---
  const cardData: { title: string; set: typeof cards.$inferSelect.set; year: number }[] = [
    // Alpha (1993)
    { title: 'Black Lotus', set: 'ALPHA', year: 1993 },
    { title: 'Mox Pearl', set: 'ALPHA', year: 1993 },
    { title: 'Ancestral Recall', set: 'ALPHA', year: 1993 },
    { title: 'Time Walk', set: 'ALPHA', year: 1993 },
    { title: 'Shivan Dragon', set: 'ALPHA', year: 1993 },
    { title: 'Serra Angel', set: 'ALPHA', year: 1993 },
    { title: 'Lightning Bolt', set: 'ALPHA', year: 1993 },
    { title: 'Counterspell', set: 'ALPHA', year: 1993 },
    { title: 'Dark Ritual', set: 'ALPHA', year: 1993 },
    { title: 'Giant Growth', set: 'ALPHA', year: 1993 },
    // Beta (1993)
    { title: 'Volcanic Island', set: 'BETA', year: 1993 },
    { title: 'Underground Sea', set: 'BETA', year: 1993 },
    { title: 'Chaos Orb', set: 'BETA', year: 1993 },
    { title: 'Birds of Paradise', set: 'BETA', year: 1993 },
    { title: 'Wrath of God', set: 'BETA', year: 1993 },
    // Unlimited (1993)
    { title: 'Mox Sapphire', set: 'UNLIMITED', year: 1993 },
    { title: 'Mox Jet', set: 'UNLIMITED', year: 1993 },
    { title: 'Mox Ruby', set: 'UNLIMITED', year: 1993 },
    { title: 'Mox Emerald', set: 'UNLIMITED', year: 1993 },
    { title: 'Timetwister', set: 'UNLIMITED', year: 1993 },
    // Revised (1994)
    { title: 'Savannah Lions', set: 'REVISED', year: 1994 },
    { title: 'Kird Ape', set: 'REVISED', year: 1994 },
    { title: 'Swords to Plowshares', set: 'REVISED', year: 1994 },
    { title: 'Hypnotic Specter', set: 'REVISED', year: 1994 },
    { title: 'Sol Ring', set: 'REVISED', year: 1994 },
    // Fourth Edition (1995)
    { title: 'Ball Lightning', set: 'FOURTH_EDITION', year: 1995 },
    { title: 'Sylvan Library', set: 'FOURTH_EDITION', year: 1995 },
    { title: 'Nevinyrrals Disk', set: 'FOURTH_EDITION', year: 1995 },
    { title: 'Armageddon', set: 'FOURTH_EDITION', year: 1995 },
    { title: 'Stasis', set: 'FOURTH_EDITION', year: 1995 },
    // Fifth Edition (1997)
    { title: 'City of Brass', set: 'FIFTH_EDITION', year: 1997 },
    { title: 'Necropotence', set: 'FIFTH_EDITION', year: 1997 },
    { title: 'Urzas Mine', set: 'FIFTH_EDITION', year: 1997 },
    { title: 'Urzas Power Plant', set: 'FIFTH_EDITION', year: 1997 },
    { title: 'Urzas Tower', set: 'FIFTH_EDITION', year: 1997 },
    // Sixth Edition (1999)
    { title: 'Enlightened Tutor', set: 'SIXTH_EDITION', year: 1999 },
    { title: 'Vampiric Tutor', set: 'SIXTH_EDITION', year: 1999 },
    { title: 'Worldly Tutor', set: 'SIXTH_EDITION', year: 1999 },
    { title: 'Mystical Tutor', set: 'SIXTH_EDITION', year: 1999 },
    { title: 'Regrowth', set: 'SIXTH_EDITION', year: 1999 },
    // Seventh Edition (2001)
    { title: 'Worship', set: 'SEVENTH_EDITION', year: 2001 },
    { title: 'Opposition', set: 'SEVENTH_EDITION', year: 2001 },
    { title: 'Static Orb', set: 'SEVENTH_EDITION', year: 2001 },
    { title: 'Counterspell', set: 'SEVENTH_EDITION', year: 2001 },
    { title: 'Wrath of God', set: 'SEVENTH_EDITION', year: 2001 },
    // Eighth Edition (2003)
    { title: 'Bribery', set: 'EIGHTH_EDITION', year: 2003 },
    { title: 'Obliterate', set: 'EIGHTH_EDITION', year: 2003 },
    { title: 'Blood Moon', set: 'EIGHTH_EDITION', year: 2003 },
    { title: 'Boil', set: 'EIGHTH_EDITION', year: 2003 },
    { title: 'Choke', set: 'EIGHTH_EDITION', year: 2003 },
    // Ninth Edition (2005)
    { title: 'Hypnotic Specter', set: 'NINTH_EDITION', year: 2005 },
    { title: 'Serra Angel', set: 'NINTH_EDITION', year: 2005 },
    { title: 'Kird Ape', set: 'NINTH_EDITION', year: 2005 },
    { title: 'Giant Growth', set: 'NINTH_EDITION', year: 2005 },
    { title: 'Will-o-the-Wisp', set: 'NINTH_EDITION', year: 2005 },
    // Tenth Edition (2007)
    { title: 'Platinum Angel', set: 'TENTH_EDITION', year: 2007 },
    { title: 'Lord of the Pit', set: 'TENTH_EDITION', year: 2007 },
    { title: 'Mahamoti Djinn', set: 'TENTH_EDITION', year: 2007 },
    { title: 'Nightmare', set: 'TENTH_EDITION', year: 2007 },
    { title: 'Shivan Dragon', set: 'TENTH_EDITION', year: 2007 },
  ];

  console.log('Seeding cards...');
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
      seed: 42,
      completed: false,
      userId: user.id,
    })
    .returning();
  if (!quiz) throw new Error('Failed to create quiz');

  // --- Questions ---
  console.log('Seeding questions...');
  const questionData: { imageUrl: string; answer: string; quizId: number }[] = [
    { imageUrl: 'https://cards.scryfall.io/large/front/0/0/00000000-0000-0000-0000-000000000001.jpg', answer: 'Black Lotus', quizId: quiz.id },
    { imageUrl: 'https://cards.scryfall.io/large/front/0/0/00000000-0000-0000-0000-000000000002.jpg', answer: 'Ancestral Recall', quizId: quiz.id },
    { imageUrl: 'https://cards.scryfall.io/large/front/0/0/00000000-0000-0000-0000-000000000003.jpg', answer: 'Lightning Bolt', quizId: quiz.id },
    { imageUrl: 'https://cards.scryfall.io/large/front/0/0/00000000-0000-0000-0000-000000000004.jpg', answer: 'Counterspell', quizId: quiz.id },
    { imageUrl: 'https://cards.scryfall.io/large/front/0/0/00000000-0000-0000-0000-000000000005.jpg', answer: 'Shivan Dragon', quizId: quiz.id },
  ];
  await db.insert(questions).values(questionData);

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
