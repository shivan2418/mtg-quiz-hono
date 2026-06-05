import { Hono } from 'hono';
import { db } from './db';
import { questions, quizzes, quizFormatSets, quizFormats, cards } from './db/schema';
import { eq, sql, and, isNotNull, desc, count, avg } from 'drizzle-orm';
import { auth } from './routes/auth';
import { quizzesRoute as quizRoutes } from './routes/quizzes';
import { autocomplete, autocompleteFuzzy } from './db/queries';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const setsPath = join(import.meta.dirname, '../../../data/set-card-counts.json');
const setsData = JSON.parse(readFileSync(setsPath, 'utf8')).sets as {
  code: string; name: string; year: string; totalCards: number; uniqueArtwork: number;
}[];

let formatCountsCache: Record<string, number> | null = null;

async function getFormatCounts(): Promise<Record<string, number>> {
  if (formatCountsCache) return formatCountsCache;
  const allFormats = await db
    .select({ id: quizFormats.id })
    .from(quizFormats);

  const results: Record<string, number> = {};
  for (const format of allFormats) {
    const setRows = await db
      .select({ setCode: quizFormatSets.setCode })
      .from(quizFormatSets)
      .where(eq(quizFormatSets.formatId, format.id))
      .orderBy(quizFormatSets.position);
    const codes = setRows.map((s) => s.setCode);
    const row = await db.execute<{ unique_artwork: number }>(
      sql`SELECT COUNT(DISTINCT "Card"."title")::int AS unique_artwork FROM "Card" WHERE "Card"."set" IN (${sql.join(codes.map((c: string) => sql`${c}`), sql`, `)})`,
    );
    results[format.id] = row.rows[0]?.unique_artwork ?? 0;
  }
  formatCountsCache = results;
  return results;
}

const app = new Hono()
  .route('/auth', auth)
  .route('/quizzes', quizRoutes)
  .get('/formats', async (c) => {
    const counts = await getFormatCounts();
    const setNameByCode = new Map(setsData.map((s) => [s.code, s.name]));
    const dbFormats = await db
      .select({ id: quizFormats.id, name: quizFormats.name, description: quizFormats.description })
      .from(quizFormats)
      .where(eq(quizFormats.enabled, true))
      .orderBy(quizFormats.sortOrder);

    const result = await Promise.all(dbFormats.map(async (f) => {
      const setRows = await db
        .select({ setCode: quizFormatSets.setCode })
        .from(quizFormatSets)
        .where(eq(quizFormatSets.formatId, f.id))
        .orderBy(quizFormatSets.position);
      const setCodes = setRows.map((s) => s.setCode);
      const lastSet = setNameByCode.get(setCodes[setCodes.length - 1]!) ?? setCodes[setCodes.length - 1]!;

      const iconicCards: Record<string, string[]> = {
        standard: ['Tarmogoyf', 'Dark Confidant'],
        classic: ['Black Lotus', 'Shivan Dragon'],
      };

      const titles = iconicCards[f.id] ?? [];
      let sampleRows: { file: string }[];
      if (titles.length > 0) {
        sampleRows = (await db.execute<{ file: string }>(
          sql`SELECT DISTINCT ON ("Card"."title") "file" FROM "Card" WHERE "Card"."title" IN (${sql.join(titles.map((t: string) => sql`${t}`), sql`, `)}) AND "Card"."set" IN (${sql.join(setCodes.map((c: string) => sql`${c}`), sql`, `)})`,
        )).rows;
      } else {
        sampleRows = [];
      }

      const imageBaseUrl = (process.env.IMAGE_STATIC_BASE_URL ?? '/art-crops').replace(/\/+$/, '');
      const samples = sampleRows.map((r) =>
        r.file.startsWith('http') ? r.file : `${imageBaseUrl}/${r.file}`,
      );
      if (samples.length < 2) {
        const fallback = await db.execute<{ file: string }>(
          sql`SELECT "file" FROM (SELECT DISTINCT ON ("Card"."title") "Card"."file" FROM "Card" WHERE "Card"."set" IN (${sql.join(setCodes.map((c: string) => sql`${c}`), sql`, `)}) ORDER BY "Card"."title") sub ORDER BY RANDOM() LIMIT ${sql.raw(String(2 - samples.length))}`,
        );
        samples.push(...fallback.rows.map((r) =>
          r.file.startsWith('http') ? r.file : `${imageBaseUrl}/${r.file}`,
        ));
      }

      return { ...f, setCodes, uniqueArtwork: counts[f.id] ?? 0, lastSet, samples };
    }));
    return c.json(result);
  })
  .get('/sets', (c) => {
    return c.json(setsData);
  })
  .get('/autocomplete', async (c) => {
    const q = c.req.query('q') ?? '';
    const fuzzy = c.req.query('fuzzy') === '1';
    const results = fuzzy ? await autocompleteFuzzy(q) : await autocomplete(q);
    return c.json(results);
  })
  .post('/comparison', async (c) => {
    const { quizId } = await c.req.json<{ quizId: string }>();

    const quizRows = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId));
    const quiz = quizRows[0];
    if (!quiz) return c.json({ error: 'Quiz not found' }, 404);
    if (!quiz.completedAt) return c.json({ notCompleted: true });

    const formatName = await db
      .select({ name: quizFormats.name })
      .from(quizFormats)
      .where(eq(quizFormats.id, quiz.format))
      .then((r) => r[0]?.name ?? quiz.format);

    const siblingRows = await db
      .select({ score: quizzes.score, questionCount: quizzes.questionCount })
      .from(quizzes)
      .where(and(
        eq(quizzes.format, quiz.format),
        sql`${quizzes.completedAt} IS NOT NULL`,
        sql`${quizzes.questionCount} > 0`,
      ));

    const others = siblingRows.filter((s) => s.score != null && s.questionCount > 0);
    const total = others.length;

    if (total <= 1) {
      return c.json({ formatName, total, firstAttempt: true });
    }

    const avgScore = others.reduce((sum, s) => sum + (s.score! / s.questionCount), 0) / total;
    const myPct = (quiz.score ?? 0) / quiz.questionCount;
    const betterCount = others.filter((s) => (s.score! / s.questionCount) > myPct).length;
    const rank = betterCount + 1;
    const percentile = Math.round(((total - betterCount - 1) / (total - 1)) * 100);

    return c.json({
      formatName,
      total,
      rank,
      percentile,
      averagePct: Math.round(avgScore * 100),
      questionCount: quiz.questionCount,
    });
  })
  .post('/answer', async (c) => {
    const { quizId, questionId, answer } = await c.req.json<{
      quizId: string;
      questionId: number;
      answer: string;
    }>();

    const qRows = await db
      .select()
      .from(questions)
      .where(eq(questions.id, questionId));
    const question = qRows[0];
    if (!question || question.quizId !== quizId) {
      return c.json({ error: 'Question not found' }, 404);
    }

    const check = await db.execute(
      sql`SELECT regexp_replace(lower(immutable_unaccent(${question.answer})), '[ -]', '', 'g') = regexp_replace(lower(immutable_unaccent(${answer})), '[ -]', '', 'g') AS correct`,
    );
    const correct = (check.rows[0] as { correct: boolean }).correct;

    const quizRows = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId));
    const quiz = quizRows[0];
    if (!quiz) return c.json({ error: 'Quiz not found' }, 404);

    const result = {
      questionIndex: quiz.currentIndex,
      guess: answer || null,
      correct,
      correctAnswer: correct ? answer : question.answer,
      imageUrl: question.imageUrl,
      cardId: question.cardId,
    };

    const nextIndex = quiz.currentIndex + 1;
    const nextScore = (quiz.score ?? 0) + (correct ? 1 : 0);
    const nextResults = [...(quiz.results ?? []), result];
    const isComplete = nextIndex >= quiz.questionCount;

    await db
      .update(quizzes)
      .set({
        currentIndex: nextIndex,
        score: nextScore,
        results: nextResults,
        ...(isComplete ? { completedAt: new Date() } : {}),
      })
      .where(eq(quizzes.id, quizId));

    const response: Record<string, unknown> = { correct, correctAnswer: question.answer };
    response.state = {
      currentIndex: nextIndex,
      score: nextScore,
      completedAt: isComplete ? new Date() : null,
      results: nextResults.map(({ cardId: _, ...r }) => r),
    };

    return c.json(response);
  });

export default app;
