import { Hono } from 'hono';
import { db } from './db';
import { questions, quizzes } from './db/schema';
import { eq, sql } from 'drizzle-orm';
import { auth } from './routes/auth';
import { quizzesRoute as quizRoutes } from './routes/quizzes';
import { autocomplete, autocompleteFuzzy } from './db/queries';
import { formats } from './db/formats';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const setsPath = join(import.meta.dirname, '../../../data/set-card-counts.json');
const setsData = JSON.parse(readFileSync(setsPath, 'utf8')).sets as {
  code: string; name: string; year: string; totalCards: number; uniqueArtwork: number;
}[];

let formatCountsCache: Record<string, number> | null = null;

async function getFormatCounts(): Promise<Record<string, number>> {
  if (formatCountsCache) return formatCountsCache;
  const results: Record<string, number> = {};
  for (const format of formats) {
    const row = await db.execute<{ unique_artwork: number }>(
      sql`SELECT COUNT(DISTINCT "Card"."title")::int AS unique_artwork FROM "Card" WHERE "Card"."set" IN (${sql.join(format.setCodes.map((c: string) => sql`${c}`), sql`, `)})`,
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
    return c.json(formats.map((f) => ({
      ...f,
      uniqueArtwork: counts[f.id] ?? 0,
      lastSet: (setNameByCode.get(f.setCodes[f.setCodes.length - 1]!) ?? f.setCodes[f.setCodes.length - 1]) as string,
    })));
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
