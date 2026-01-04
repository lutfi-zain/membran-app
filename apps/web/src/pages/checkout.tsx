/**
 * CheckoutPage Component
 * Handles payment confirmation/redirect from Midtrans
 */

import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { usePaymentStatus } from '../hooks/usePayment';

export function CheckoutPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');

  // Use URLSearchParams for consistent parameter parsing
  const urlParams = new URLSearchParams(window.location.search);
  const transactionId = urlParams.get('transaction_id');
  const orderId = urlParams.get('order_id');
  const statusCode = urlParams.get('status_code');
  const transactionStatus = urlParams.get('transaction_status');

  const { data: paymentStatus, isLoading } = usePaymentStatus(transactionId);

  useEffect(() => {
    if (!transactionId) {
      // No transaction ID, redirect to pricing
      navigate({ to: '/pricing' });
      return;
    }

    // Determine status from URL params for immediate feedback
    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      setStatus('success');
    } else if (transactionStatus === 'pending' || transactionStatus === 'authorize') {
      setStatus('pending');
    } else if (
      transactionStatus === 'deny' ||
      transactionStatus === 'cancel' ||
      transactionStatus === 'expire' ||
      transactionStatus === 'failure'
    ) {
      setStatus('failed');
    }
  }, [transactionId, transactionStatus, navigate]);

  // Poll payment status to get final confirmation
  useEffect(() => {
    if (paymentStatus?.data) {
      const finalStatus = paymentStatus.data.status;

      if (finalStatus === 'Success') {
        setStatus('success');
      } else if (finalStatus === 'Failed' || finalStatus === 'Refunded') {
        setStatus('failed');
      } else if (finalStatus === 'Pending') {
        setStatus('pending');
      }
    }
  }, [paymentStatus]);

  const renderContent = () => {
    // Show loading state only if we're still loading AND we don't have a URL status
    if ((isLoading || status === 'loading') && !transactionStatus) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#5865F2]" />
          <p className="mt-6 text-lg text-gray-600">Processing your payment...</p>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>

          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            Your subscription has been activated. You now have access to all the
            benefits of your chosen tier.
          </p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate({ to: '/member-portal' })}
              className="px-6 py-3 bg-[#5865F2] text-white rounded-lg font-semibold hover:bg-[#4752C4] transition-colors"
            >
              View My Subscription
            </button>
            <button
              onClick={() => navigate({ to: '/' })}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>

          {paymentStatus?.data && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-gray-600">
                Transaction ID: {paymentStatus.data.transactionId}
              </p>
              <p className="text-sm text-gray-600">
                Amount: ${(paymentStatus.data.amount / 100).toFixed(2)}{' '}
                {paymentStatus.data.currency}
              </p>
              {paymentStatus.data.paymentDate && (
                <p className="text-sm text-gray-600">
                  Paid: {new Date(paymentStatus.data.paymentDate).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    if (status === 'failed') {
      return (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Failed
          </h1>

          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            We couldn't process your payment. This could be due to insufficient
            funds, an expired card, or payment was cancelled.
          </p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate({ to: '/pricing' })}
              className="px-6 py-3 bg-[#5865F2] text-white rounded-lg font-semibold hover:bg-[#4752C4] transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate({ to: '/' })}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
            <p className="text-sm text-blue-800">
              <strong>Need help?</strong> If you believe this is an error, please
              contact our support team.
            </p>
          </div>
        </div>
      );
    }

    if (status === 'pending') {
      return (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-6">
            <svg
              className="w-8 h-8 text-yellow-600 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Pending
          </h1>

          <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
            Your payment is being processed. For certain payment methods like
            bank transfers, it may take some time to complete.
          </p>

          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            We'll send you a confirmation email once your payment is complete.
          </p>

          <button
            onClick={() => navigate({ to: '/member-portal' })}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Check Status Later
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
