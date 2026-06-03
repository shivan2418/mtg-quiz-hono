import { Hono } from 'hono';
import { db } from '../db';
import { quizzes, questions, cards } from '../db/schema';
import { eq, sql, and, isNotNull, inArray } from 'drizzle-orm';
import { verifyToken } from '../auth';
import { defaultFormat, getFormat } from '../db/formats';

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
    return c.json(quiz);
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
    const header = c.req.header('Authorization');
    let userId: number | undefined;
    if (header?.startsWith('Bearer ')) {
      const payload = verifyToken(header.slice(7));
      if (payload) userId = payload.id;
    }

    const { seed: rawSeed, formatId } = await c.req.json<{ seed?: number; formatId?: string }>();
    const seed = rawSeed ?? Math.floor(Math.random() * 100000);
    const fmt = getFormat(formatId ?? defaultFormat.id) ?? defaultFormat;

    const cardRows = await db
      .select()
      .from(cards)
      .where(inArray(cards.set, fmt.setCodes))
      .orderBy(sql`RANDOM()`)
      .limit(30);

    if (cardRows.length === 0) {
      return c.json(
        { error: `No cards found for format "${fmt.name}". Run the seed script.` },
        400,
      );
    }

    const [quiz] = await db
      .insert(quizzes)
      .values({ seed, format: fmt.id, questionCount: cardRows.length, completed: false, userId })
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
