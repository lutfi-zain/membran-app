import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { sessionMiddleware } from "./middleware/session";
import { authRouter } from "./routes/auth";
import { botRouter } from "./routes/bot";
import { rolesRouter } from "./routes/roles";
import { pricingRouter } from "./routes/pricing";
import { onboardingRouter } from "./routes/onboarding";

type Bindings = {
  DB: D1Database;
  SESSION_SECRET: string;
  SENTRY_DSN?: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_REDIRECT_URI: string;
  DISCORD_BOT_TOKEN: string;
  ENCRYPTION_KEY: string;
  CRON_SECRET?: string;
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
app.route("/api/auth", authRouter); // Also serve auth routes under /api for frontend consistency
app.route("/api/bot", botRouter);
app.route("/api/roles", rolesRouter);
app.route("/api/pricing", pricingRouter);
app.route("/api/onboarding", onboardingRouter);

export default app;
