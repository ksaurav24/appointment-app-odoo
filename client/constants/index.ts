export const APP_NAME = "BookEase";
export const DEMO_OTP = "123456";

// Central route constants prevent hardcoded path typos in components.
// Any time you navigate somewhere, import ROUTES and use it.
// Never write a path string directly in a component.
export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  otpVerification: "/otp-verification",
  signupRole: "/signup-role",

  // Organiser onboarding — 3 sequential steps after role selection + OTP.
  onboardingSetup: "/onboarding/setup",
  onboardingDetails: "/onboarding/details",
  onboardingSubmitted: "/onboarding/submitted",

  // Customer dashboard — shown immediately after OTP verification for customers.
  dashboardUser: "/dashboard/user",

  // Routes linked from the customer dashboard quick-action cards.
  findAppointments: "/appointments",
  myBookings: "/bookings",
  myProfile: "/profile",

  // Organisation public profile — slug is dynamic.
  // Use orgProfilePath(slug) to build this URL.
  organisations: "/organisations",
} as const;

// Builds the public profile URL for an organisation.
// WHY a function (not in ROUTES): ROUTES is "as const" — it can only hold
// static strings. Dynamic paths with parameters must be plain functions.
// Usage: orgProfilePath("acme-clinic") → "/organisations/acme-clinic"
export const orgProfilePath = (slug: string) => `/organisations/${slug}`;

// IANA timezone identifiers shown in the timezone dropdown on Step 2.
// Kept here as a constant to avoid importing a heavy library just for a list.
// Add more as needed when backend supports them.
export const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;
