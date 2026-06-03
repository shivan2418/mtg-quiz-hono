import { sign, verify } from 'jsonwebtoken';
import { createMiddleware } from 'hono/factory';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

const SECRET = process.env.JWT_SECRET ?? 'changeme-in-production';

export interface AuthPayload {
  id: number;
  email: string;
  name: string | null;
}

export type Variables = {
  user: AuthPayload;
};

export function signToken(payload: AuthPayload): string {
  return sign(payload, SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return verify(token, SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export async function resolveUserId(header: string | undefined): Promise<number | null> {
  if (!header?.startsWith('Bearer ')) return null;
  const payload = verifyToken(header.slice(7));
  if (!payload) return null;
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, payload.id));
  return rows[0]?.id ?? null;
}

export const authGuard = createMiddleware<{ Variables: Variables }>(
  async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const payload = verifyToken(header.slice(7));
    if (!payload) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('user', payload);
    await next();
  },
);
