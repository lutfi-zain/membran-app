import { z } from "zod";

// Types
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

// Zod Schemas
export const OnboardingStateSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  botConnected: z.boolean(),
  pricingConfigured: z.boolean(),
  completedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const UpdateOnboardingStateSchema = z
  .object({
    botConnected: z.boolean().optional(),
    pricingConfigured: z.boolean().optional(),
  })
  .refine(
    (data) => data.botConnected !== undefined || data.pricingConfigured !== undefined,
    {
      message: "At least one field must be provided",
    }
  );

export const CompleteOnboardingResponseSchema = OnboardingStateSchema;

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});
