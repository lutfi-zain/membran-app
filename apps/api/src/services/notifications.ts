/**
 * Notification Service
 * Handles email and DM notifications for payment events
 *
 * For Cloudflare Workers - environment variables must be passed as parameters
 */

import { Resend } from 'resend';

// Environment interface for notification service
export interface NotificationEnv {
  RESEND_API_KEY: string;
  FROM_EMAIL: string;
  APP_URL: string;
}

/**
 * Get Resend client (must be created fresh each call in Workers)
 */
function getResendClient(apiKey: string): Resend {
  return new Resend(apiKey);
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  env: NotificationEnv,
  email: string,
  verificationToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient(env.RESEND_API_KEY);
    const appUrl = env.APP_URL;

    const verificationUrl = `${appUrl}/auth/verify-email?token=${verificationToken}`;

    await resend.emails.send({
      from: env.FROM_EMAIL,
      to: email,
      subject: 'Verify your email address',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .button { display: inline-block; padding: 12px 24px; background-color: #5865F2; color: white; text-decoration: none; border-radius: 4px; }
              .footer { margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Verify Your Email Address</h2>
              <p>Thank you for signing up! Please click the button below to verify your email address:</p>
              <p><a href="${verificationUrl}" class="button">Verify Email</a></p>
              <p>Or copy and paste this link into your browser:</p>
              <p>${verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
              <div class="footer">
                <p>If you didn't request this, please ignore this email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send payment success notification
 */
export async function sendPaymentSuccessEmail(
  env: NotificationEnv,
  email: string,
  tierName: string,
  amount: number,
  currency: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient(env.RESEND_API_KEY);

    await resend.emails.send({
      from: env.FROM_EMAIL,
      to: email,
      subject: 'Payment Successful - Subscription Activated',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .success { background-color: #d4edda; padding: 15px; border-radius: 4px; margin: 20px 0; }
              .footer { margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Payment Successful! 🎉</h2>
              <div class="success">
                <p>Your subscription has been activated successfully.</p>
              </div>
              <h3>Subscription Details:</h3>
              <ul>
                <li><strong>Tier:</strong> ${tierName}</li>
                <li><strong>Amount:</strong> ${(amount / 100).toFixed(2)} ${currency}</li>
              </ul>
              <p>You can now access all the benefits of your subscription.</p>
              <div class="footer">
                <p>Thank you for your subscription!</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send payment success email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send payment failed notification
 */
export async function sendPaymentFailedEmail(
  env: NotificationEnv,
  email: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient(env.RESEND_API_KEY);
    const appUrl = env.APP_URL;

    await resend.emails.send({
      from: env.FROM_EMAIL,
      to: email,
      subject: 'Payment Failed - Please Try Again',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .error { background-color: #f8d7da; padding: 15px; border-radius: 4px; margin: 20px 0; }
              .button { display: inline-block; padding: 12px 24px; background-color: #5865F2; color: white; text-decoration: none; border-radius: 4px; }
              .footer { margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Payment Failed</h2>
              <div class="error">
                <p>Your payment could not be processed.</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              </div>
              <p>Please try again or contact support if the problem persists.</p>
              <p><a href="${appUrl}/pricing" class="button">Try Again</a></p>
              <div class="footer">
                <p>If you need help, please contact our support team.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send payment failed email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send subscription expiry warning
 */
export async function sendSubscriptionExpiringEmail(
  env: NotificationEnv,
  email: string,
  tierName: string,
  expiryDate: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResendClient(env.RESEND_API_KEY);
    const appUrl = env.APP_URL;

    await resend.emails.send({
      from: env.FROM_EMAIL,
      to: email,
      subject: 'Subscription Expiring Soon',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .warning { background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; }
              .button { display: inline-block; padding: 12px 24px; background-color: #5865F2; color: white; text-decoration: none; border-radius: 4px; }
              .footer { margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Subscription Expiring Soon</h2>
              <div class="warning">
                <p>Your subscription will expire on <strong>${expiryDate.toLocaleDateString()}</strong></p>
              </div>
              <h3>Current Subscription:</h3>
              <ul>
                <li><strong>Tier:</strong> ${tierName}</li>
                <li><strong>Expiry Date:</strong> ${expiryDate.toLocaleDateString()}</li>
              </ul>
              <p>Renew now to continue enjoying your benefits!</p>
              <p><a href="${appUrl}/member-portal" class="button">Renew Subscription</a></p>
              <div class="footer">
                <p>Thank you for being a valued subscriber!</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send subscription expiring email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
