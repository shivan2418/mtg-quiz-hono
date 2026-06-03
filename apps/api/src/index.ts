import { Hono } from 'hono';
import type { AuthPayload } from './auth';
import { auth } from './routes/auth';
import { quizzesRoute as quizzes } from './routes/quizzes';

export type Variables = {
  user: AuthPayload;
};

const app = new Hono<{ Variables: Variables }>()
  .route('/auth', auth)
  .route('/quizzes', quizzes);

export default app;
