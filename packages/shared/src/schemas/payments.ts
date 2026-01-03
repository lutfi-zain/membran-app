import { z } from 'zod';

// T039: Payment validation schemas

/**
 * Credit card validation schema
 */
export const creditCardSchema = z.object({
  cardNumber: z
    .string()
    .min(1, { message: 'Card number is required' })
    .regex(/^\d{13,19}$/, { message: 'Invalid card number' }),
  cardholderName: z
    .string()
    .min(1, { message: 'Cardholder name is required' })
    .min(2, { message: 'Cardholder name is too short' }),
  expirationDate: z
    .string()
    .min(1, { message: 'Expiration date is required' })
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'Invalid expiration date (MM/YY)' }),
  cvv: z
    .string()
    .min(1, { message: 'CVV is required' })
    .regex(/^\d{3,4}$/, { message: 'Invalid CVV' }),
});

export type CreditCardInput = z.infer<typeof creditCardSchema>;

/**
 * Payment method schema
 */
export const paymentMethodSchema = z.object({
  type: z.enum(['credit_card', 'debit_card', 'paypal', 'other'], {
    errorMap: () => ({ message: 'Invalid payment method type' }),
  }),
  provider: z.string().min(1, { message: 'Payment provider is required' }),
  isDefault: z.boolean().optional(),
});

export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;

/**
 * Transaction schema
 */
export const transactionSchema = z.object({
  amount: z
    .number()
    .positive({ message: 'Amount must be positive' })
    .min(0.01, { message: 'Minimum transaction amount is $0.01' }),
  currency: z.string().length(3, { message: 'Invalid currency code (e.g., USD)' }),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
