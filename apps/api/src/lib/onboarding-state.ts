/**
 * Onboarding State Business Logic
 *
 * Core business logic functions for managing user onboarding progress.
 * Provides a clean abstraction layer for onboarding state operations.
 *
 * Functions:
 * - createOnboardingState: Create initial onboarding state for a user
 * - getOnboardingState: Fetch onboarding state by user ID
 * - updateOnboardingState: Update onboarding progress flags
 * - completeOnboarding: Mark onboarding as completed
 */

import { createDb, onboardingStates } from "@membran/db";
import { eq } from "drizzle-orm";

/**
 * Create initial onboarding state for a newly registered user.
 *
 * @param db - Database instance
 * @param userId - User ID to create onboarding state for
 * @returns The created onboarding state
 */
export async function createOnboardingState(
  db: ReturnType<typeof createDb>,
  userId: string
) {
  const now = new Date();
  const state = {
    id: crypto.randomUUID(),
    userId,
    botConnected: false,
    pricingConfigured: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(onboardingStates).values(state);
  return state;
}

/**
 * Fetch onboarding state by user ID.
 *
 * @param db - Database instance
 * @param userId - User ID to fetch onboarding state for
 * @returns The onboarding state or null if not found
 */
export async function getOnboardingState(
  db: ReturnType<typeof createDb>,
  userId: string
) {
  const state = await db.query.onboardingStates.findFirst({
    where: (onboardingStates, { eq }) => eq(onboardingStates.userId, userId),
  });

  return state;
}

/**
 * Update onboarding progress flags.
 *
 * @param db - Database instance
 * @param userId - User ID to update onboarding state for
 * @param updates - Object with botConnected and/or pricingConfigured flags
 * @returns The updated onboarding state
 */
export async function updateOnboardingState(
  db: ReturnType<typeof createDb>,
  userId: string,
  updates: {
    botConnected?: boolean;
    pricingConfigured?: boolean;
  }
) {
  const now = new Date();
  await db
    .update(onboardingStates)
    .set({
      ...(updates.botConnected !== undefined && { botConnected: updates.botConnected }),
      ...(updates.pricingConfigured !== undefined && {
        pricingConfigured: updates.pricingConfigured,
      }),
      updatedAt: now,
    })
    .where(eq(onboardingStates.userId, userId));

  const state = await db.query.onboardingStates.findFirst({
    where: (onboardingStates, { eq }) => eq(onboardingStates.userId, userId),
  });

  return state;
}

/**
 * Mark onboarding as completed for a user.
 *
 * Validates that both bot connection and pricing configuration
 * are complete before marking onboarding as done.
 *
 * @param db - Database instance
 * @param userId - User ID to complete onboarding for
 * @returns The updated onboarding state with completedAt set
 * @throws Error if onboarding steps are not complete
 */
export async function completeOnboarding(
  db: ReturnType<typeof createDb>,
  userId: string
) {
  // Fetch current state
  const state = await getOnboardingState(db, userId);

  if (!state) {
    throw new Error("Onboarding state not found for user");
  }

  // Validate both steps are complete
  if (!state.botConnected || !state.pricingConfigured) {
    throw new Error(
      "Cannot complete onboarding. Both bot connection and pricing configuration are required."
    );
  }

  // Mark as complete
  const now = new Date();
  await db
    .update(onboardingStates)
    .set({ completedAt: now, updatedAt: now })
    .where(eq(onboardingStates.userId, userId));

  // Return updated state
  const updated = await getOnboardingState(db, userId);
  return updated;
}

/**
 * Auto-complete onboarding if both steps are done but not yet marked.
 *
 * Checks if botConnected and pricingConfigured are both true but
 * completedAt is null, and if so, marks onboarding as complete.
 *
 * @param db - Database instance
 * @param userId - User ID to check and potentially complete onboarding for
 * @returns The onboarding state (completed if applicable)
 */
export async function autoCompleteOnboarding(
  db: ReturnType<typeof createDb>,
  userId: string
) {
  const state = await getOnboardingState(db, userId);

  if (!state) {
    return null;
  }

  // If both steps are complete but not marked, complete now
  if (
    state.botConnected &&
    state.pricingConfigured &&
    !state.completedAt
  ) {
    return await completeOnboarding(db, userId);
  }

  return state;
}

/**
 * Calculate the next onboarding step for a user.
 *
 * @param state - Onboarding state
 * @returns The next step route the user should complete
 */
export function getNextOnboardingStep(state: {
  botConnected: boolean;
  pricingConfigured: boolean;
  completedAt: Date | null;
}): string {
  if (state.completedAt) {
    return "/dashboard";
  }

  if (!state.botConnected) {
    return "/onboarding/bot";
  }

  if (!state.pricingConfigured) {
    return "/onboarding/pricing";
  }

  // Both complete but not marked
  return "/dashboard";
}
