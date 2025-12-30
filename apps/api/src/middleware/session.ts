import { createMiddleware } from "hono/factory";

export const sessionMiddleware = createMiddleware(async (c, next) => {
  // Session logic will be implemented here
  // For now, it's a placeholder
  await next();
});
