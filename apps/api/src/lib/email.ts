export const sendEmail = async (to: string, subject: string, body: string) => {
  // Placeholder for Resend integration
  console.log(`Sending email to ${to}: ${subject}`);
  // In a real implementation, this would use fetch to the Resend API
};

export const sendVerificationEmail = async (to: string, token: string) => {
  const verificationUrl = `https://membran.app/api/auth/verify?token=${token}`;
  await sendEmail(
    to,
    "Verify your Membran account",
    `Please verify your email by clicking here: ${verificationUrl}`,
  );
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const resetUrl = `https://membran.app/reset-password?token=${token}`;
  await sendEmail(
    to,
    "Reset your Membran password",
    `You requested a password reset. Use this link: ${resetUrl}`,
  );
};
