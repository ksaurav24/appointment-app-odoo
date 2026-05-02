import type { z } from "zod";
import type {
  forgotPasswordSchema,
  loginSchema,
  otpVerificationSchema,
  signupSchema,
} from "@/lib/validations";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export type UserRole = "organiser" | "customer";

export interface AuthResult {
  user: AuthUser;
  token: string;
  message: string;
}

export interface ApiEnvelope<T> {
  data: T;
  error?: string | null;
}

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type OtpVerificationFormValues = z.infer<typeof otpVerificationSchema>;
