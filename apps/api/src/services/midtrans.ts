/**
 * Midtrans Service
 * Wrapper for Midtrans Core API to create transactions
 */

const MIDTRANS_API_BASE = 'https://app.sandbox.midtrans.com/snap/v1' as const;

// Environment interface for Midtrans service
export interface MidtransEnv {
  MIDTRANS_SERVER_KEY: string;
  MIDTRANS_ENVIRONMENT?: string;
}

// Use production URL if environment is set to production
function getApiBase(env: MidtransEnv): string {
  const environment = env.MIDTRANS_ENVIRONMENT || 'sandbox';
  if (environment === 'production') {
    return 'https://app.midtrans.com/snap/v1';
  }
  return MIDTRANS_API_BASE;
}

/**
 * Get server key for authentication
 */
function getServerKey(env: MidtransEnv): string {
  const key = env.MIDTRANS_SERVER_KEY;
  if (!key) {
    throw new Error('MIDTRANS_SERVER_KEY environment variable is not set');
  }
  return key;
}

/**
 * Create a transaction with Midtrans Snap API
 */
export async function createTransaction(
  env: MidtransEnv,
  params: {
    orderId: string;
    amount: number;
    customerEmail: string;
    tierName: string;
    memberId: string;
  }
): Promise<{
  success: boolean;
  redirectUrl?: string;
  token?: string;
  error?: string;
}> {
  try {
    const serverKey = getServerKey(env);
    const apiBase = getApiBase(env);

    // Prepare transaction details
    const transactionDetails = {
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.amount,
      },
      customer_details: {
        email: params.customerEmail,
        // We can add more customer details if available
      },
      item_details: [
        {
          id: params.tierName,
          price: params.amount,
          quantity: 1,
          name: params.tierName,
        },
      ],
      // Custom metadata for our reference
      custom_field1: params.memberId, // Store member ID for webhook processing
    };

    // Make API request
    const response = await fetch(`${apiBase}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(serverKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(transactionDetails),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Midtrans API error:', response.status, errorText);
      return {
        success: false,
        error: `Midtrans API error: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json();

    // Return redirect URL and token
    return {
      success: true,
      redirectUrl: data.redirect_url,
      token: data.token,
    };
  } catch (error) {
    console.error('Error creating Midtrans transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get transaction status from Midtrans
 */
export async function getTransactionStatus(
  env: MidtransEnv,
  orderId: string
): Promise<{
  success: boolean;
  status?: string;
  transactionStatus?: string;
  error?: string;
}> {
  try {
    const serverKey = getServerKey(env);
    const apiBase = getApiBase(env);

    const response = await fetch(`${apiBase}/transactions/${orderId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(serverKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Midtrans API error: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      status: data.transaction_status,
      transactionStatus: data.transaction_status,
    };
  } catch (error) {
    console.error('Error getting Midtrans transaction status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate unique order ID
 * Format: SUB-{subscriptionId}-{timestamp}
 */
export function generateOrderId(subscriptionId: string): string {
  const timestamp = Date.now();
  return `SUB-${subscriptionId}-${timestamp}`;
}

/**
 * Calculate expiry timestamp (24 hours from now)
 */
export function getPaymentExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
}
