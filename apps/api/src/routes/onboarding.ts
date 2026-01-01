/**
 * Onboarding State API Routes
 *
 * Manages user onboarding progress tracking for bot connection
 * and pricing tier configuration steps.
 *
 * Endpoints:
 * - GET /api/onboarding/state - Fetch current onboarding state
 * - PUT /api/onboarding/state - Update onboarding progress
 * - POST /api/onboarding/complete - Mark onboarding as completed
 */

import { zValidator } from "@hono/zod-validator";
import { createDb, onboardingStates, sessions } from "@membran/db";
import {
  OnboardingStateSchema,
  UpdateOnboardingStateSchema,
} from "@membran/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { alphabet, generateRandomString } from "oslo/crypto";
import { rateLimitMiddleware } from "../middleware/rate-limit";

// ============================================================================
// Types & Configuration
// ============================================================================

type OnboardingEnv = {
  DB: D1Database;
  SESSION_SECRET: string;
};

const generateId = (length: number) =>
  generateRandomString(length, alphabet("0-9", "a-z"));

// ============================================================================
// Router Setup
// ============================================================================

const router = new Hono<{ Bindings: OnboardingEnv }>();

// Apply rate limiting to all onboarding endpoints
router.use("*", rateLimitMiddleware);

// Helper function to get authenticated user from session
async function getAuthenticatedUser(
  db: ReturnType<typeof createDb>,
  sessionId: string | undefined
) {
  if (!sessionId) {
    return null;
  }

  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, sessionId),
    with: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}

// ============================================================================
// GET /api/onboarding/state - Fetch Onboarding State
// ============================================================================

/**
 * Returns the current onboarding state for the authenticated user.
 *
 * Auto-creates a default onboarding state if one doesn't exist.
 */
router.get("/", async (c) => {
  const sessionId = getCookie(c, "auth_session");

  if (!sessionId) {
    return c.json(
      { error: "UNAUTHORIZED", message: "Authentication required" },
      401
    );
  }

  const db = createDb(c.env.DB);

  // Verify session and get user
  const user = await getAuthenticatedUser(db, sessionId);
  if (!user) {
    return c.json(
      { error: "UNAUTHORIZED", message: "Invalid session" },
      401
    );
  }

  // Fetch onboarding state
  let state = await db.query.onboardingStates.findFirst({
    where: (onboardingStates, { eq }) => eq(onboardingStates.userId, user.id),
  });

  // Auto-create if doesn't exist
  if (!state) {
    const now = new Date();
    const newState = {
      id: generateId(25),
      userId: user.id,
      botConnected: false,
      pricingConfigured: false,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(onboardingStates).values(newState);
    state = newState;
  }

  return c.json({
    id: state.id,
    userId: state.userId,
    botConnected: Boolean(state.botConnected),
    pricingConfigured: Boolean(state.pricingConfigured),
    completedAt: state.completedAt?.getTime() || null,
    createdAt: state.createdAt.getTime(),
    updatedAt: state.updatedAt.getTime(),
  } satisfies OnboardingStateSchema);
});

// ============================================================================
// PUT /api/onboarding/state - Update Onboarding Progress
// ============================================================================

/**
 * Updates onboarding progress flags (botConnected, pricingConfigured).
 *
 * Called automatically by bot connection and pricing tier creation endpoints.
 */
router.put("/", zValidator("json", UpdateOnboardingStateSchema), async (c) => {
  const sessionId = getCookie(c, "auth_session");

  if (!sessionId) {
    return c.json(
      { error: "UNAUTHORIZED", message: "Authentication required" },
      401
    );
  }

  const db = createDb(c.env.DB);

  // Verify session and get user
  const user = await getAuthenticatedUser(db, sessionId);
  if (!user) {
    return c.json(
      { error: "UNAUTHORIZED", message: "Invalid session" },
      401
    );
  }

  const updates = c.req.valid("json");

  // Ensure at least one field is provided
  if (
    updates.botConnected === undefined &&
    updates.pricingConfigured === undefined
  ) {
    return c.json(
      {
        error: "INVALID_INPUT",
        message: "At least one field (botConnected or pricingConfigured) must be provided",
      },
      400
    );
  }

  // Check if onboarding state exists
  const existingState = await db.query.onboardingStates.findFirst({
    where: (onboardingStates, { eq }) => eq(onboardingStates.userId, user.id),
  });

  if (!existingState) {
    return c.json(
      {
        error: "NOT_FOUND",
        message: "Onboarding state not found for user",
      },
      404
    );
  }

  // Update onboarding state
  const now = new Date();
  await db
    .update(onboardingStates)
    .set({
      ...(updates.botConnected !== undefined && {
        botConnected: updates.botConnected,
      }),
      ...(updates.pricingConfigured !== undefined && {
        pricingConfigured: updates.pricingConfigured,
      }),
      updatedAt: now,
    })
    .where(eq(onboardingStates.userId, user.id));

  // Fetch updated state
  const state = await db.query.onboardingStates.findFirst({
    where: (onboardingStates, { eq }) => eq(onboardingStates.userId, user.id),
  });

  return c.json({
    id: state.id,
    userId: state.userId,
    botConnected: Boolean(state.botConnected),
    pricingConfigured: Boolean(state.pricingConfigured),
    completedAt: state.completedAt?.getTime() || null,
    createdAt: state.createdAt.getTime(),
    updatedAt: state.updatedAt.getTime(),
  } satisfies OnboardingStateSchema);
});

// ============================================================================
// POST /api/onboarding/complete - Mark Onboarding as Complete
// ============================================================================

/**
 * Marks onboarding as completed for the authenticated user.
 *
 * Validates that both bot connection and pricing configuration are complete
 * before allowing completion.
 */
router.post("/complete", async (c) => {
  const sessionId = getCookie(c, "auth_session");

  if (!sessionId) {
    return c.json(
      { error: "UNAUTHORIZED", message: "Authentication required" },
      401
    );
  }

  const db = createDb(c.env.DB);

  // Verify session and get user
  const user = await getAuthenticatedUser(db, sessionId);
  if (!user) {
    return c.json(
      { error: "UNAUTHORIZED", message: "Invalid session" },
      401
    );
  }

  // Fetch onboarding state
  const state = await db.query.onboardingStates.findFirst({
    where: (onboardingStates, { eq }) => eq(onboardingStates.userId, user.id),
  });

  if (!state) {
    return c.json(
      {
        error: "NOT_FOUND",
        message: "Onboarding state not found for user",
      },
      404
    );
  }

  // Validate both steps are complete
  if (!state.botConnected || !state.pricingConfigured) {
    return c.json(
      {
        error: "ONBOARDING_INCOMPLETE",
        message:
          "Cannot complete onboarding. Both bot connection and pricing configuration are required.",
      },
      400
    );
  }

  // Mark as complete
  const now = new Date();
  await db
    .update(onboardingStates)
    .set({ completedAt: now, updatedAt: now })
    .where(eq(onboardingStates.userId, user.id));

  // Fetch updated state
  const updated = await db.query.onboardingStates.findFirst({
    where: (onboardingStates, { eq }) => eq(onboardingStates.userId, user.id),
  });

  return c.json({
    id: updated.id,
    userId: updated.userId,
    botConnected: Boolean(updated.botConnected),
    pricingConfigured: Boolean(updated.pricingConfigured),
    completedAt: updated.completedAt?.getTime() || null,
    createdAt: updated.createdAt.getTime(),
    updatedAt: updated.updatedAt.getTime(),
  } satisfies OnboardingStateSchema);
});

export { router as onboardingRouter };
