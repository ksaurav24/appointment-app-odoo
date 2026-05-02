import { z } from "zod";

// Validates login credentials before attempting sign in.
export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

// Validates signup details with strict password quality rules.
// Field: fullName (matches backend RegisterDto.fullName)
export const signupSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters.").max(120),
    email: z.email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password cannot exceed 72 characters.")
      .regex(/[a-z]/, "Password must include a lowercase letter.")
      .regex(/[A-Z]/, "Password must include an uppercase letter.")
      .regex(/[^A-Za-z0-9]/, "Password must include a special character."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

// Validates forgot-password input before sending reset email.
export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address."),
});

// Validates OTP code and destination email.
// Matches backend VerifyEmailDto: email + 6-digit code.
export const otpVerificationSchema = z.object({
  email: z.email("Enter a valid email address."),
  code: z
    .string()
    .regex(/^\d{6}$/, "OTP must be a 6-digit code."),
});

// Validates password reset form (token comes from URL, not from form).
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required."),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password cannot exceed 72 characters.")
      .regex(/[a-z]/, "Password must include a lowercase letter.")
      .regex(/[A-Z]/, "Password must include an uppercase letter.")
      .regex(/[^A-Za-z0-9]/, "Password must include a special character."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

// ─── Organiser Onboarding Schemas ─────────────────────────────────────────────

// Step 1: Set up your organisation — name + URL slug.
// The slug must be URL-safe: lowercase, numbers, hyphens only.
// This will be the public URL path (e.g. app.com/acme-clinic).
export const orgSetupSchema = z.object({
  name: z.string().min(2, "Organisation name must be at least 2 characters."),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters.")
    .max(60, "Slug must be under 60 characters.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens only (e.g. my-org).",
    ),
});

// Step 2: Organisation profile details.
// logoFile is optional — organiser can add a logo later.
// File size and type are validated here so the user gets instant feedback
// before any upload attempt is made to the server.
export const orgDetailsSchema = z.object({
  description: z
    .string()
    .min(20, "Description must be at least 20 characters.")
    .max(500, "Keep description under 500 characters."),
  contactPhone: z
    .string()
    .regex(/^[+]?[0-9\s\-().]{7,20}$/, "Enter a valid phone number."),
  address: z.string().min(5, "Address must be at least 5 characters."),
  timezone: z.string().min(1, "Please select a timezone."),
  // File validated only if the user picks one — optional field.
  logoFile: z
    .instanceof(File)
    .refine((f) => f.size <= 2 * 1024 * 1024, "Logo must be under 2 MB.")
    .refine(
      (f) => ["image/jpeg", "image/png", "image/webp"].includes(f.type),
      "Logo must be a JPG, PNG, or WebP image.",
    )
    .optional()
    .nullable(),
});
