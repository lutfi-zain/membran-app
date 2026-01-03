/**
 * PaymentButton Component
 * Triggers payment flow for a selected tier
 */

import { useCreatePayment } from '../hooks/usePayment';

interface PaymentButtonProps {
  tierId: string;
  serverId: string;
  tierName: string;
  disabled?: boolean;
  className?: string;
}

export function PaymentButton({
  tierId,
  serverId,
  tierName,
  disabled = false,
  className = '',
}: PaymentButtonProps) {
  const createPayment = useCreatePayment();

  const handleClick = () => {
    createPayment.mutate({
      tierId,
      serverId,
    });
  };

  const isLoading = createPayment.isPending;
  const isError = createPayment.isError;
  const errorMessage = createPayment.error?.message;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={`
          px-6 py-3 rounded-lg font-semibold text-white
          bg-[#5865F2] hover:bg-[#4752C4] active:bg-[#3c45a5]
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-150
          ${className}
        `}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : (
          `Subscribe to ${tierName}`
        )}
      </button>

      {isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 font-medium">Payment Failed</p>
          <p className="text-sm text-red-500 mt-1">
            {errorMessage || 'An error occurred while creating your payment. Please try again.'}
          </p>
        </div>
      )}

      {createPayment.data?.success && !createPayment.data.data.redirectUrl && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-600 font-medium">Payment Created</p>
          <p className="text-sm text-yellow-500 mt-1">
            Transaction ID: {createPayment.data.data.transactionId}
          </p>
        </div>
      )}
    </div>
  );
}
