import { Hono } from 'hono';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { compare, hash } from 'bcryptjs';
import { signToken, verifyToken } from '../auth';

export const auth = new Hono()
  .post('/register', async (c) => {
    const { email, password, name } = await c.req.json<{
      email: string;
      password: string;
      name?: string;
    }>();
    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400);
    }
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    if (existing.length > 0) {
      return c.json({ error: 'Email already registered' }, 409);
    }
    const hashed = await hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({ email, password: hashed, name: name ?? null, admin: false })
      .returning();
    if (!user) return c.json({ error: 'Failed to create user' }, 500);
    const { password: _, ...safe } = user;
    return c.json({ user: safe }, 201);
  })
  .post('/login', async (c) => {
    const { email, password } = await c.req.json<{
      email: string;
      password: string;
    }>();
    if (!email || !password) {
      return c.json({ error: 'Email and password required' }, 400);
    }
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    const user = rows[0];
    if (!user || !(await compare(password, user.password))) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });
    const { password: _, ...safe } = user;
    return c.json({ token, user: safe });
  })
  .post('/logout', (c) => {
    return c.json({ message: 'Logged out' });
  })
  .get('/me', async (c) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.id));
    const user = rows[0];
    if (!user) return c.json({ error: 'User not found' }, 404);
    const { password: _, ...safe } = user;
    return c.json(safe);
  });
