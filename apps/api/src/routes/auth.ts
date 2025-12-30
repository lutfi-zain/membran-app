import { zValidator } from "@hono/zod-validator";
import {
  createDb,
  passwordResetTokens,
  sessions,
  users,
  verificationTokens,
} from "@membran/db";
import { LoginSchema, SignupSchema } from "@membran/shared";
import { generateState } from "arctic";
import { and, eq, lt, ne } from "drizzle-orm";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { alphabet, generateRandomString } from "oslo/crypto";
import { z } from "zod";
import {
  createDiscordAuth,
  hashPassword,
  verifyPassword,
  generateVerificationToken,
  hashToken,
} from "../lib/auth";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/email";
import { rateLimitMiddleware } from "../middleware/rate-limit";

const generateId = (length: number) =>
  generateRandomString(length, alphabet("0-9", "a-z"));

const router = new Hono<{
  Bindings: {
    DB: D1Database;
    DISCORD_CLIENT_ID: string;
    DISCORD_CLIENT_SECRET: string;
    DISCORD_REDIRECT_URI: string;
  };
}>();

router.use("*", rateLimitMiddleware);

router.post("/signup", zValidator("json", SignupSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const db = createDb(c.env.DB);

  const existingUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });

  if (existingUser) {
    return c.json({ error: "Email already in use" }, 400);
  }

  const passwordHash = await hashPassword(password);
  const userId = generateId(15);

  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
  });

  const verificationToken = generateVerificationToken();
  const hashedToken = await hashToken(verificationToken);
  const verificationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

  await db.insert(verificationTokens).values({
    id: hashedToken,
    userId,
    expiresAt: verificationExpiresAt,
  });

  await sendVerificationEmail(email, verificationToken);

  const sessionId = generateId(40);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  setCookie(c, "auth_session", sessionId, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    expires: expiresAt,
  });

  return c.json({ success: true, userId });
});

router.post("/login", zValidator("json", LoginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const db = createDb(c.env.DB);

  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });

  if (!user || !user.passwordHash) {
    return c.json({ error: "Invalid email or password" }, 400);
  }

  const validPassword = await verifyPassword(user.passwordHash, password);
  if (!validPassword) {
    return c.json({ error: "Invalid email or password" }, 400);
  }

  const sessionId = generateId(40);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    expiresAt,
  });

  setCookie(c, "auth_session", sessionId, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    expires: expiresAt,
  });

  return c.json({ success: true });
});

router.post("/logout", async (c) => {
  const sessionId = getCookie(c, "auth_session");
  if (!sessionId) return c.json({ success: true });

  const db = createDb(c.env.DB);
  await db.delete(sessions).where(eq(sessions.id, sessionId));

  setCookie(c, "auth_session", "", {
    path: "/",
    maxAge: 0,
  });

  return c.json({ success: true });
});

router.get("/me", async (c) => {
  const sessionId = getCookie(c, "auth_session");
  if (!sessionId) return c.json({ user: null });

  const db = createDb(c.env.DB);
  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
    with: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ user: null });
  }

  return c.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      discordId: session.user.discordId,
      emailVerified: session.user.emailVerified,
    },
  });
});

router.post(
  "/forgot-password",
  zValidator("json", z.object({ email: z.string().email() })),
  async (c) => {
    const { email } = c.req.valid("json");
    const db = createDb(c.env.DB);

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });

    if (user) {
      const tokenId = generateId(40);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 1);

      await db.insert(passwordResetTokens).values({
        id: tokenId,
        userId: user.id,
        expiresAt,
      });

      await sendPasswordResetEmail(email, tokenId);
    }

    return c.json({
      success: true,
      message: "If an account exists, a reset link has been sent.",
    });
  },
);

router.post(
  "/reset-password",
  zValidator(
    "json",
    z.object({ token: z.string(), password: z.string().min(8) }),
  ),
  async (c) => {
    const { token, password } = c.req.valid("json");
    const db = createDb(c.env.DB);

    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: (t, { eq }) => eq(t.id, token),
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      return c.json({ error: "Invalid or expired token" }, 400);
    }

    const passwordHash = await hashPassword(password);

    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, resetToken.userId));

    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, token));

    return c.json({ success: true });
  },
);

router.get("/verify", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.redirect("/login?error=invalid_token");
  }

  const db = createDb(c.env.DB);
  const hashedToken = await hashToken(token);

  const verificationToken = await db.query.verificationTokens.findFirst({
    where: (t, { eq }) => eq(t.id, hashedToken),
  });

  if (!verificationToken || verificationToken.expiresAt < new Date()) {
    return c.redirect("/login?error=invalid_token");
  }

  await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, verificationToken.userId));

  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.id, hashedToken));

  // Cleanup expired tokens
  await db
    .delete(verificationTokens)
    .where(lt(verificationTokens.expiresAt, new Date()));

  return c.redirect("/dashboard?verified=true");
});

router.get("/connect/discord", async (c) => {
  const sessionId = getCookie(c, "auth_session");
  if (!sessionId) return c.json({ error: "Unauthorized" }, 401);

  const db = createDb(c.env.DB);
  const session = await db.query.sessions.findFirst({
    where: (s, { eq }) => eq(s.id, sessionId),
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const discord = createDiscordAuth(c.env);
  const state = generateState();
  const url = await discord.createAuthorizationURL(state, null, [
    "identify",
    "email",
  ]);

  setCookie(c, "discord_oauth_state", state, {
    path: "/",
    secure: true,
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "Lax",
  });

  return c.redirect(url.toString());
});

router.get("/connect/discord/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "discord_oauth_state");
  const sessionId = getCookie(c, "auth_session");

  if (!sessionId) return c.json({ error: "Unauthorized" }, 401);
  if (!code || !state || !storedState || state !== storedState) {
    return c.json({ error: "Invalid state" }, 400);
  }

  const db = createDb(c.env.DB);
  const session = await db.query.sessions.findFirst({
    where: (s, { eq }) => eq(s.id, sessionId),
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const discord = createDiscordAuth(c.env);

  try {
    const tokens = await discord.validateAuthorizationCode(code, null);
    const response = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokens.accessToken()}` },
    });
    const discordUser = (await response.json()) as { id: string };

    const existingDiscordUser = await db.query.users.findFirst({
      where: (u, { eq, and, ne }) =>
        and(eq(u.discordId, discordUser.id), ne(u.id, session.userId)),
    });

    if (existingDiscordUser) {
      return c.redirect("/settings?error=already_linked");
    }

    await db
      .update(users)
      .set({ discordId: discordUser.id })
      .where(eq(users.id, session.userId));

    return c.redirect("/settings?connected=discord");
  } catch (e) {
    console.error("Discord connection error:", e);
    return c.redirect("/settings?error=connection_failed");
  }
});

router.get("/discord", async (c) => {
  const discord = createDiscordAuth(c.env);
  const state = generateState();
  const url = await discord.createAuthorizationURL(state, null, [
    "identify",
    "email",
  ]);

  setCookie(c, "discord_oauth_state", state, {
    path: "/",
    secure: true,
    httpOnly: true,
    maxAge: 60 * 10,
    sameSite: "Lax",
  });

  return c.redirect(url.toString());
});

router.get("/discord/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "discord_oauth_state");

  if (!code || !state || !storedState || state !== storedState) {
    return c.json({ error: "Invalid state" }, 400);
  }

  const discord = createDiscordAuth(c.env);
  const db = createDb(c.env.DB);

  try {
    const tokens = await discord.validateAuthorizationCode(code, null);
    const response = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokens.accessToken()}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Discord API error:", response.status, errorText);
      return c.json({ error: "Failed to fetch Discord user" }, 500);
    }

    const discordUser = (await response.json()) as {
      id: string;
      email: string;
    };

    let user = await db.query.users.findFirst({
      where: (users, { eq, or }) =>
        or(
          eq(users.discordId, discordUser.id),
          eq(users.email, discordUser.email),
        ),
    });

    if (!user) {
      const userId = generateId(15);
      await db.insert(users).values({
        id: userId,
        email: discordUser.email,
        discordId: discordUser.id,
        emailVerified: true,
      });
      user = {
        id: userId,
        email: discordUser.email,
        discordId: discordUser.id,
        emailVerified: true,
        passwordHash: null,
        subscriptionPlan: "free",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } else if (!user.discordId) {
      return c.json({ error: "Email already registered with password." }, 400);
    }

    const sessionId = generateId(40);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt,
    });

    setCookie(c, "auth_session", sessionId, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      expires: expiresAt,
    });

    // Redirect to frontend onboarding page
    return c.redirect("http://localhost:5173/onboarding");
  } catch (e) {
    console.error("OAuth error:", e);
    return c.json(
      {
        error: "OAuth failed",
        details: e instanceof Error ? e.message : String(e),
      },
      500,
    );
  }
});

export { router as authRouter };
