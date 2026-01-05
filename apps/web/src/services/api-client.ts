/**
 * API Client
 * Typed fetch wrappers for backend communication
 */

import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentStatusResponse,
} from '@membran/shared';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Helper to get session cookie for authenticated requests
 */
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Session is handled automatically by browser cookies
  return headers;
}

/**
 * Handle API errors
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  return response.json();
}

/**
 * Payment API client
 */
export const paymentsApi = {
  /**
   * Create a new payment transaction
   */
  async createPayment(
    request: CreatePaymentRequest
  ): Promise<CreatePaymentResponse> {
    const response = await fetch(`${API_URL}/api/payments/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });

    return handleResponse<CreatePaymentResponse>(response);
  },

  /**
   * Get payment status
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    const response = await fetch(`${API_URL}/api/payments/${transactionId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse<PaymentStatusResponse>(response);
  },
};

/**
 * Subscription API client
 */
export const subscriptionsApi = {
  /**
   * Get user's subscriptions
   */
  async getSubscriptions() {
    const response = await fetch(`${API_URL}/api/subscriptions`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  /**
   * Get single subscription
   */
  async getSubscription(id: string) {
    const response = await fetch(`${API_URL}/api/subscriptions/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },
};

/**
 * Pricing API client
 */
export const pricingApi = {
  /**
   * Get pricing tiers for a server
   */
  async getTiers(serverId: string) {
    const response = await fetch(`${API_URL}/pricing/servers/${serverId}/tiers`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },
};

/**
 * Auth API client
 */
export const authApi = {
  /**
   * Get current user
   */
  async getMe() {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string) {
    const response = await fetch(`${API_URL}/api/auth/send-verification`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email }),
    });

    return handleResponse(response);
  },
};
