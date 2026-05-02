import { z } from "zod";

// Validates login credentials before attempting sign in.
export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

// Validates signup details with strict password quality rules.
export const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[a-z]/, "Password must include a lowercase letter.")
      .regex(/[A-Z]/, "Password must include an uppercase letter.")
      .regex(/[^A-Za-z0-9]/, "Password must include a special character."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

// Validates forgot-password input before sending reset OTP.
export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address."),
});

// Validates OTP code and destination email.
export const otpVerificationSchema = z.object({
  email: z.email("Enter a valid email address."),
  code: z
    .string()
    .regex(/^\d{6}$/, "OTP must be a 6-digit code."),
});
