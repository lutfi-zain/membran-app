import { useQuery } from "@tanstack/react-query";

export interface OnboardingState {
  id: string;
  userId: string;
  botConnected: boolean;
  pricingConfigured: boolean;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export type OnboardingStep = "account" | "bot" | "pricing" | "complete";

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  isComplete: boolean;
  canAccessDashboard: boolean;
  nextStepRoute: string;
}

/**
 * Fetches the current onboarding state for the authenticated user.
 *
 * Uses TanStack Query for caching and automatic revalidation.
 * Returns null if user is not authenticated.
 */
export function useOnboarding() {
  return useQuery<OnboardingState>({
    queryKey: ["onboarding", "state"],
    queryFn: async () => {
      const res = await fetch("/api/onboarding/state");
      if (!res.ok) {
        throw new Error("Failed to fetch onboarding state");
      }
      return res.json();
    },
    staleTime: 30_000, // Revalidate every 30 seconds
    revalidateOnFocus: true,
    revalidateOnWindowFocus: true,
  });
}

/**
 * Calculates onboarding progress from the current state.
 *
 * Returns the current step, completion status, dashboard access,
 * and the next step route the user should complete.
 */
export function useOnboardingProgress(): OnboardingProgress {
  const { data } = useOnboarding();

  if (!data) {
    return {
      currentStep: "account" as const,
      isComplete: false,
      canAccessDashboard: false,
      nextStepRoute: "/onboarding/bot",
    };
  }

  if (data.completedAt) {
    return {
      currentStep: "complete" as const,
      isComplete: true,
      canAccessDashboard: true,
      nextStepRoute: "/dashboard",
    };
  }

  if (!data.botConnected) {
    return {
      currentStep: "bot" as const,
      isComplete: false,
      canAccessDashboard: false,
      nextStepRoute: "/onboarding/bot",
    };
  }

  if (!data.pricingConfigured) {
    return {
      currentStep: "pricing" as const,
      isComplete: false,
      canAccessDashboard: false,
      nextStepRoute: "/onboarding/pricing",
    };
  }

  // Both complete but not marked
  return {
    currentStep: "complete" as const,
    isComplete: true,
    canAccessDashboard: true,
    nextStepRoute: "/dashboard",
  };
}

/**
 * Updates onboarding progress flags.
 *
 * @param updates - Object with botConnected and/or pricingConfigured flags
 * @returns Promise with the updated onboarding state
 */
export async function updateOnboardingState(updates: {
  botConnected?: boolean;
  pricingConfigured?: boolean;
}): Promise<OnboardingState> {
  const res = await fetch("/api/onboarding/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    throw new Error("Failed to update onboarding state");
  }

  return res.json();
}

/**
 * Marks onboarding as completed for the authenticated user.
 *
 * Validates that both bot connection and pricing configuration
 * are complete before allowing completion.
 *
 * @returns Promise with the updated onboarding state
 */
export async function completeOnboarding(): Promise<OnboardingState> {
  const res = await fetch("/api/onboarding/complete", {
    method: "POST",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to complete onboarding");
  }

  return res.json();
}
