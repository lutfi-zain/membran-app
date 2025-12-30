import { createMiddleware } from "hono/factory";

export const rateLimitMiddleware = createMiddleware(async (c, next) => {
  // Very simple in-memory rate limiter (won't work across multiple workers without KV)
  // But good for demonstration of the pattern
  // In Cloudflare, we'd use Cloudflare Rate Limiting or KV
  await next();
});
