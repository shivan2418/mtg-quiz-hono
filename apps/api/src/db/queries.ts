import { db } from './index';
import { cards } from './schema';
import { asc, sql, desc } from 'drizzle-orm';

function normalize(q: string): string {
  return q.toLowerCase().trim();
}

export async function autocomplete(qRaw: string): Promise<string[]> {
  const q = normalize(qRaw);
  if (q.length < 3) return [];

  const rows = await db
    .select({
      title: cards.title,
    })
    .from(cards)
    .where(sql`${cards.titleNorm} LIKE ${'%' + q + '%'}`)
    .groupBy(cards.title)
    .orderBy(
      desc(sql`bool_or(${cards.titleNorm} LIKE ${q + '%'})`),
      asc(sql`min(length(${cards.title}))`),
      asc(cards.title),
    )
    .limit(20);

  return rows.map((r) => r.title);
}

export async function autocompleteFuzzy(qRaw: string): Promise<string[]> {
  const q = normalize(qRaw);
  if (q.length < 3) return [];

  const rows = await db
    .select({
      title: cards.title,
    })
    .from(cards)
    .where(sql`${cards.titleNorm} % ${q}`)
    .groupBy(cards.title)
    .orderBy(
      desc(sql`max(similarity(${cards.titleNorm}, ${q}))`),
      desc(sql`bool_or(${cards.titleNorm} LIKE ${q + '%'})`),
      asc(sql`min(length(${cards.title}))`),
      asc(cards.title),
    )
    .limit(20);

  return rows.map((r) => r.title);
}
