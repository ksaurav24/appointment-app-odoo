import type { z } from "zod";
import type {
  forgotPasswordSchema,
  loginSchema,
  orgDetailsSchema,
  orgSetupSchema,
  otpVerificationSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validations";

// ── Auth types ─────────────────────────────────────────────────────────────────

// Mirrors the SafeUser shape returned by GET /auth/me and POST /auth/login.
// Field names match the backend exactly (fullName not name, role not userRole).
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  // "CUSTOMER" | "ORGANIZER" | "ADMIN" — matches Prisma Role enum from backend.
  role: "CUSTOMER" | "ORGANIZER" | "ADMIN";
  isActive: boolean;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Role used in Zustand for routing decisions during signup flow.
// "organiser" (lowercase) is a frontend-only concept for role selection UI.
export type UserRole = "organiser" | "customer";

// POST /auth/register response.
// Note: no token or user object — login happens after email verification.
export interface RegisterResult {
  userId: string;
  organizationId?: string;
  message: string;
}

// Payload for the organizer signup path — combines user credentials with org details.
// Passed to registerOrgUser() which calls POST /auth/register with the organization field.
export interface OrgRegistrationPayload {
  user: {
    fullName: string;
    email: string;
    password: string;
  };
  org: {
    name: string;
    slug: string;
    description?: string;
    contactPhone?: string;
    address?: string;
    timezone?: string;
  };
}

// POST /auth/login response.
// Either 2FA is required (no user/cookies yet) or user is returned with cookies set.
export interface LoginResult {
  twoFactorRequired?: true;
  user?: AuthUser;
  message?: string;
}

// POST /auth/verify-email response.
export interface VerifyEmailResult {
  message: string;
}

// POST /auth/forgot-password response.
export interface ForgotPasswordResult {
  message: string;
}

// POST /auth/reset-password response.
export interface ResetPasswordResult {
  message: string;
}

// All API responses from the backend are wrapped in this envelope shape.
// T is the actual data type — e.g. ApiEnvelope<AuthUser>.
export interface ApiEnvelope<T> {
  data: T;
  error?: string | null;
}

// Form value types are derived from Zod schemas — never written manually.
// This ensures one source of truth: schema change = type change automatically.
export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type OtpVerificationFormValues = z.infer<typeof otpVerificationSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// ── Organisation types ─────────────────────────────────────────────────────────

// Derived from Zod schemas — never duplicate field definitions.
export type OrgSetupFormValues = z.infer<typeof orgSetupSchema>;
export type OrgDetailsFormValues = z.infer<typeof orgDetailsSchema>;

// Mirrors the `organizations` table in schema.md.
// When the backend returns an org object it will match this shape exactly.
export interface Organization {
  id: string;
  organiserId: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string;
  address: string;
  timezone: string;
  isActive: boolean;   // false until admin approves
  createdAt: string;
  updatedAt: string;
}

// Full payload sent to POST /organizations.
// logoFile is sent as multipart/form-data, not JSON.
// BACKEND NOTE: backend must accept multipart and upload logo to cloud storage.
export interface CreateOrgPayload {
  name: string;
  slug: string;
  description: string;
  contactPhone: string;
  address: string;
  timezone: string;
  logoFile?: File | null;
}

// Lightweight shape used for org cards on the public browse/search page.
export interface OrgListing {
  id: string;
  name: string;
  slug: string;
  address: string;
  description: string;
  appointmentCount: number;
  workingHours: string;
  logoUrl: string | null;
}

// Full organisation detail shown on the public profile page (/organisations/[slug]).
// Extends OrgListing with contact + timezone fields that are too detailed for cards.
// BACKEND NOTE: GET /organizations/public/:slug must return this shape.
export interface OrgDetail extends OrgListing {
  contactPhone: string;
  contactEmail: string | null;
  timezone: string;
}

// Data collected during the multi-step appointment booking wizard.
export interface BookingData {
  date: string | null;
  timeSlot: string | null;
  concern: string;
  notes: string;
}
