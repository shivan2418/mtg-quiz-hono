import { Hono } from 'hono';
import { db } from '../db';
import { quizzes, questions, cards } from '../db/schema';
import { eq, sql, and, isNotNull } from 'drizzle-orm';
import { resolveUserId } from '../auth';
import { getFormat } from '../db/formats';

export const quizzesRoute = new Hono()
  .get('/', async (c) => {
    const userId = c.req.query('userId');
    const format = c.req.query('format');
    let query = db.select().from(quizzes);

    if (userId) {
      query = query.where(
        and(
          eq(quizzes.userId, Number(userId)),
          isNotNull(quizzes.userId),
        ),
      ) as typeof query;
    }

    if (format) {
      query = query.where(eq(quizzes.format, format)) as typeof query;
    }

    const result = await query;
    return c.json(result);
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const rows = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, id));
    const quiz = rows[0];
    if (!quiz) return c.json({ error: 'Not found' }, 404);
    const stripped = {
      ...quiz,
      results: (quiz.results ?? []).map(({ cardId: _, ...r }: Record<string, unknown>) => r),
    };
    return c.json(stripped);
  })
  .get('/:id/questions', async (c) => {
    const id = c.req.param('id');
    const rows = await db
      .select({
        id: questions.id,
        imageUrl: questions.imageUrl,
        quizId: questions.quizId,
      })
      .from(questions)
      .where(eq(questions.quizId, id));
    return c.json(rows);
  })
  .post('/', async (c) => {
    const userId = await resolveUserId(c.req.header('Authorization'));

    const { seed: rawSeed, formatId, setCodes } = await c.req.json<{
      seed?: number;
      formatId?: string;
      setCodes?: string[];
    }>();

    const seed = rawSeed ?? Math.floor(Math.random() * 100000);
    const codes = setCodes ?? getFormat(formatId ?? 'classic')?.setCodes ?? ['lea', 'leb'];

    // DISTINCT ON (title) ensures each card name appears only once (one artwork)
    const query = sql`
      SELECT * FROM (
        SELECT DISTINCT ON ("Card"."title") *
        FROM "Card"
        WHERE "Card"."set" IN (${sql.join(codes.map((c) => sql`${c}`), sql`, `)})
        ORDER BY "Card"."title", RANDOM()
      ) sub
      ORDER BY RANDOM()
      LIMIT 30
    `;
    const cardResult = await db.execute<typeof cards.$inferSelect>(query);
    const cardRows = cardResult.rows;

    if (cardRows.length === 0) {
      return c.json(
        { error: `No cards found for the selected sets. Run the seed script.` },
        400,
      );
    }

    const [quiz] = await db
      .insert(quizzes)
      .values({ seed, format: formatId ?? 'custom', questionCount: cardRows.length, userId })
      .returning();
    if (!quiz) return c.json({ error: 'Failed to create quiz' }, 500);

    const imageBaseUrl = (process.env.IMAGE_STATIC_BASE_URL ?? '/art-crops').replace(/\/+$/, '');

    await db.insert(questions).values(
      cardRows.map((card) => ({
        imageUrl: card.file.startsWith('http')
          ? card.file
          : `${imageBaseUrl}/${card.file}`,
        answer: card.title,
        quizId: quiz.id,
        cardId: card.id,
      })),
    );

    const result = await db
      .select({
        id: questions.id,
        imageUrl: questions.imageUrl,
        quizId: questions.quizId,
      })
      .from(questions)
      .where(eq(questions.quizId, quiz.id));

    return c.json({ quiz, questions: result }, 201);
  });
