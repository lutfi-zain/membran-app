/**
 * usePayment Hook
 * TanStack Query wrapper for payment mutations
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { paymentsApi } from '../services/api-client';
import type { CreatePaymentRequest } from '@membran/shared';

/**
 * Create payment mutation
 */
export function useCreatePayment() {
  return useMutation({
    mutationFn: (request: CreatePaymentRequest) =>
      paymentsApi.createPayment(request),
    onSuccess: (data) => {
      // Redirect to Midtrans payment page
      if (data.success && data.data.redirectUrl) {
        window.location.href = data.data.redirectUrl;
      }
    },
    onError: (error: Error) => {
      console.error('Payment creation failed:', error);
      // Could show toast notification here
    },
  });
}

/**
 * Get payment status query
 */
export function usePaymentStatus(transactionId: string | null) {
  return useQuery({
    queryKey: ['payment', 'status', transactionId],
    queryFn: () => paymentsApi.getPaymentStatus(transactionId!),
    enabled: !!transactionId,
    refetchInterval: (data) => {
      // Poll less frequently once payment is complete
      const status = data?.data?.data?.status;
      if (status === 'Success' || status === 'Failed' || status === 'Refunded') {
        return false; // Stop polling
      }
      return 3000; // Poll every 3 seconds for pending payments
    },
  });
}
