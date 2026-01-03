/**
 * PricingPage Component
 * Main pricing page with tier selection
 */

import { useState } from 'react';
import { TierSelector } from '../components/TierSelector';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../services/api-client';

interface PricingPageProps {
  serverId: string;
}

export function PricingPage({ serverId }: PricingPageProps) {
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

  // Check if user is authenticated
  const { data: userData, isLoading: authLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.getMe(),
    retry: false,
  });

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5865F2]" />
      </div>
    );
  }

  const user = userData?.user;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Subscription Plan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Unlock premium features and support the server. Select a tier that
            best fits your needs.
          </p>

          {!user && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg inline-block">
              <p className="text-sm text-yellow-700">
                <a href="/auth/discord" className="font-semibold underline">
                  Sign in with Discord
                </a>{' '}
                to purchase a subscription
              </p>
            </div>
          )}

          {user && !user.emailVerified && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg inline-block">
              <p className="text-sm text-yellow-700">
                Please{' '}
                <button
                  onClick={() => authApi.sendVerificationEmail(user.email)}
                  className="font-semibold underline"
                >
                  verify your email
                </button>{' '}
                before purchasing
              </p>
            </div>
          )}
        </div>

        {/* Tier Selector */}
        <TierSelector
          serverId={serverId}
          selectedTierId={selectedTierId}
          onTierSelect={setSelectedTierId}
        />

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <details className="group bg-white rounded-lg border border-gray-200 p-6">
              <summary className="cursor-pointer font-semibold text-gray-900 list-none flex items-center justify-between">
                How do I cancel my subscription?
                <span className="transition group-open:rotate-180">
                  <svg
                    fill="none"
                    height="24"
                    shapeRendering="geometricPrecision"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                    width="24"
                  >
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="text-gray-600 mt-4">
                You can cancel your subscription at any time from your member
                portal. Your benefits will continue until the end of your current
                billing period.
              </p>
            </details>

            <details className="group bg-white rounded-lg border border-gray-200 p-6">
              <summary className="cursor-pointer font-semibold text-gray-900 list-none flex items-center justify-between">
                Can I upgrade or downgrade my plan?
                <span className="transition group-open:rotate-180">
                  <svg
                    fill="none"
                    height="24"
                    shapeRendering="geometricPrecision"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                    width="24"
                  >
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="text-gray-600 mt-4">
                Yes! You can upgrade your plan at any time with pro-rated credit
                for your remaining subscription. Downgrades will take effect at
                the end of your current billing period.
              </p>
            </details>

            <details className="group bg-white rounded-lg border border-gray-200 p-6">
              <summary className="cursor-pointer font-semibold text-gray-900 list-none flex items-center justify-between">
                What payment methods do you accept?
                <span className="transition group-open:rotate-180">
                  <svg
                    fill="none"
                    height="24"
                    shapeRendering="geometricPrecision"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                    width="24"
                  >
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="text-gray-600 mt-4">
                We accept various payment methods through Midtrans including
                GoPay, OVO, Dana, bank transfers, and credit/debit cards.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
