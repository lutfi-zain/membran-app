import { z } from "zod";

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export const VerificationSchema = z.object({
  token: z.string().min(32),
});

export const DiscordConnectSchema = z.object({
  state: z.string(),
  code: z.string(),
});

export type VerificationInput = z.infer<typeof VerificationSchema>;
export type DiscordConnectInput = z.infer<typeof DiscordConnectSchema>;
