import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { sessionMiddleware } from "./middleware/session";
import { authRouter } from "./routes/auth";

type Bindings = {
  DB: D1Database;
  SESSION_SECRET: string;
  SENTRY_DSN?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", async (c, next) => {
  if (c.env?.SENTRY_DSN) {
    // Sentry init placeholder
  }
  await next();
});

app.use("*", cors());
app.use("*", csrf());
app.use("*", sessionMiddleware);

app.get("/", (c) => c.text("Membran API"));
app.route("/auth", authRouter);

export default app;
