/**
 * Email Verification Middleware
 * Ensures user has verified email before accessing protected routes
 */

import { createDb, sessions, users } from '@membran/db';
import { eq } from 'drizzle-orm';
import { getCookie } from 'hono/cookie';
import type { Context, Next } from 'hono';

export async function emailVerifiedMiddleware(c: Context, next: Next) {
  const sessionId = getCookie(c, 'auth_session');

  if (!sessionId) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      },
      401
    );
  }

  const db = createDb(c.env.DB);
  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
    with: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired session',
        },
      },
      401
    );
  }

  if (!session.user.emailVerified) {
    return c.json(
      {
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email address to continue',
        },
      },
      403
    );
  }

  // Attach user to context for use in handlers
  c.set('userId', session.user.id);
  c.set('user', session.user);

  await next();
}
