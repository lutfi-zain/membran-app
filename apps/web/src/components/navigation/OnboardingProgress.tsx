import type { OnboardingStep } from "../../hooks/useOnboarding";

interface OnboardingProgressProps {
  currentStep: OnboardingStep;
}

/**
 * Onboarding Progress Indicator
 *
 * Displays 3-step progress indicator with current step highlighted.
 * Used across all onboarding pages for consistent UX.
 *
 * Steps:
 * 1. Account Confirmation (implicit - completed via signup)
 * 2. Connect Bot
 * 3. Configure Pricing
 */
export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  const steps: { key: OnboardingStep; label: string }[] = [
    { key: "account", label: "Account" },
    { key: "bot", label: "Connect Bot" },
    { key: "pricing", label: "Configure Pricing" },
  ];

  const getCurrentStepIndex = () => {
    if (currentStep === "complete") return 3;
    return steps.findIndex((s) => s.key === currentStep);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step.key} className="flex items-center">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isCurrent
                      ? "bg-blue-500 text-white ring-4 ring-blue-100"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isCompleted ? "✓" : index + 1}
                </div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    isCurrent ? "text-blue-600" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    isCompleted ? "bg-green-500" : "bg-gray-200"
                  }`}
                  style={{ marginTop: "-1.5rem" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
