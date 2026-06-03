import { Hono } from 'hono';
import { db } from './db';
import { questions } from './db/schema';
import { eq } from 'drizzle-orm';
import { auth } from './routes/auth';
import { quizzesRoute as quizRoutes } from './routes/quizzes';
import { autocomplete, autocompleteFuzzy } from './db/queries';

const app = new Hono()
  .route('/auth', auth)
  .route('/quizzes', quizRoutes)
  .get('/autocomplete', async (c) => {
    const q = c.req.query('q') ?? '';
    const fuzzy = c.req.query('fuzzy') === '1';
    const results = fuzzy ? await autocompleteFuzzy(q) : await autocomplete(q);
    return c.json(results);
  })
  .post('/answer', async (c) => {
    const { quizId, questionId, answer } = await c.req.json<{
      quizId: number;
      questionId: number;
      answer: string;
    }>();

    const rows = await db
      .select()
      .from(questions)
      .where(eq(questions.id, questionId));
    const question = rows[0];
    if (!question || question.quizId !== quizId) {
      return c.json({ error: 'Question not found' }, 404);
    }

    const correct =
      question.answer.toLowerCase().trim() === answer.toLowerCase().trim();

    if (correct) {
      return c.json({ correct: true });
    }
    return c.json({ correct: false, correctAnswer: question.answer });
  });

export default app;
