import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

export const VerificationBanner = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.emailVerified || dismissed) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex justify-between items-center">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Your email address is not verified. Please check your inbox.
              <button
                type="button"
                className="ml-2 font-medium underline hover:text-yellow-600"
                onClick={() => {
                  /* Resend logic */
                }}
              >
                Resend verification email
              </button>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-yellow-700 hover:text-yellow-600 font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
};
