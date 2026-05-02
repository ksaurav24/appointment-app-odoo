import type { z } from "zod";
import type {
  forgotPasswordSchema,
  loginSchema,
  orgDetailsSchema,
  orgSetupSchema,
  otpVerificationSchema,
  signupSchema,
} from "@/lib/validations";

// \u2500\u2500 Auth types \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

// Role determines routing after OTP and what features the user can access.
export type UserRole = "organiser" | "customer";

// Returned by login, signup, and OTP endpoints.
export interface AuthResult {
  user: AuthUser;
  token: string;
  message: string;
}

// All API responses from the backend are wrapped in this envelope shape.
// T is the actual data type \u2014 e.g. ApiEnvelope<AuthResult>.
export interface ApiEnvelope<T> {
  data: T;
  error?: string | null;
}

// Form value types are derived from Zod schemas \u2014 never written manually.
// This ensures one source of truth: schema change = type change automatically.
export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type OtpVerificationFormValues = z.infer<typeof otpVerificationSchema>;

// \u2500\u2500 Organisation types \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

// Derived from Zod schemas \u2014 never duplicate field definitions.
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
