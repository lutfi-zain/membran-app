/**
 * TierSelector Component
 * Display pricing tiers with selection and payment buttons
 */

import { PaymentButton } from './PaymentButton';
import { usePublicPricingTiers } from '../hooks/usePublicPricingTiers';

interface Tier {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  duration: 'monthly' | 'yearly' | 'lifetime';
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
}

interface TierSelectorProps {
  serverId: string;
  selectedTierId: string | null;
  onTierSelect: (tierId: string) => void;
}

export function TierSelector({
  serverId,
  selectedTierId,
  onTierSelect,
}: TierSelectorProps) {
  const { data: pricingData, isLoading, error } = usePublicPricingTiers(serverId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5865F2]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 font-medium">Failed to load pricing tiers</p>
        <p className="text-sm text-red-500 mt-1">
          {error.message || 'Please try again later'}
        </p>
      </div>
    );
  }

  const tiersList = pricingData?.tiers || [];

  if (tiersList.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No pricing tiers available for this server.</p>
      </div>
    );
  }

  // Sort by display order
  const sortedTiers = [...tiersList].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedTiers.map((tier: Tier) => {
        const isSelected = selectedTierId === tier.id;
        const pricePerMonth = calculateMonthlyPrice(tier.priceCents, tier.duration);

        return (
          <div
            key={tier.id}
            className={`
              relative p-6 rounded-xl border-2 transition-all
              ${isSelected ? 'border-[#5865F2] shadow-lg' : 'border-gray-200 hover:border-gray-300'}
              ${tier.isFeatured ? 'ring-2 ring-[#5865F2] ring-offset-2' : ''}
            `}
          >
            {tier.isFeatured && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-[#5865F2] text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                  Most Popular
                </span>
              </div>
            )}

            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
              {tier.description && (
                <p className="text-sm text-gray-600 mt-2">{tier.description}</p>
              )}
            </div>

            <div className="text-center mb-6">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-gray-900">
                  ${(tier.priceCents / 100).toFixed(2)}
                </span>
                <span className="text-gray-500">/{tier.duration === 'lifetime' ? 'lifetime' : tier.duration}</span>
              </div>
              {tier.duration !== 'lifetime' && (
                <p className="text-sm text-gray-500 mt-1">
                  ${pricePerMonth}/month
                </p>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => onTierSelect(tier.id)}
                className={`
                  w-full px-4 py-2 rounded-lg font-semibold transition-colors
                  ${isSelected
                    ? 'bg-[#5865F2] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {isSelected ? 'Selected' : 'Select Tier'}
              </button>

              {isSelected && (
                <PaymentButton
                  tierId={tier.id}
                  serverId={serverId}
                  tierName={tier.name}
                  disabled={!tier.isActive}
                />
              )}

              {!tier.isActive && (
                <p className="text-sm text-center text-gray-400">
                  This tier is currently unavailable
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Calculate monthly price for display
 */
function calculateMonthlyPrice(
  priceCents: number,
  duration: 'monthly' | 'yearly' | 'lifetime'
): number {
  if (duration === 'monthly') {
    return priceCents / 100;
  }

  if (duration === 'yearly') {
    return (priceCents / 100 / 12).toFixed(2) as unknown as number;
  }

  // Lifetime - calculate as if it's a 2-year period for comparison
  return ((priceCents / 100) / 24).toFixed(2) as unknown as number;
}
