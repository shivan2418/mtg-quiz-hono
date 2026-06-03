import { Hono } from 'hono';
import { db } from '../db';
import { quizzes, questions, cards } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { authGuard, type Variables } from '../auth';

export const quizzesRoute = new Hono<{ Variables: Variables }>()
  .get('/', async (c) => {
    const result = await db.select().from(quizzes);
    return c.json(result);
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const rows = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, id));
    const quiz = rows[0];
    if (!quiz) return c.json({ error: 'Not found' }, 404);
    return c.json(quiz);
  })
  .get('/:id/questions', async (c) => {
    const id = Number(c.req.param('id'));
    const result = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, id));
    return c.json(result);
  })
  .post('/', authGuard, async (c) => {
    const user = c.get('user');
    const { seed: rawSeed } = await c.req.json<{ seed?: number }>();
    const seed = rawSeed ?? Math.floor(Math.random() * 100000);

    const cardRows = await db
      .select()
      .from(cards)
      .orderBy(sql`RANDOM()`)
      .limit(5);

    if (cardRows.length === 0) {
      return c.json(
        { error: 'No cards in database. Run the seed script.' },
        400,
      );
    }

    const [quiz] = await db
      .insert(quizzes)
      .values({ seed, completed: false, userId: user.id })
      .returning();
    if (!quiz) return c.json({ error: 'Failed to create quiz' }, 500);

    await db.insert(questions).values(
      cardRows.map((card) => ({
        imageUrl: `https://cards.scryfall.io/placeholder/${card.title}.jpg`,
        answer: card.title,
        quizId: quiz.id,
      })),
    );

    const result = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, quiz.id));

    return c.json({ quiz, questions: result }, 201);
  });
