import axios from "axios";
import { DEMO_OTP } from "@/constants";
import type {
  ApiEnvelope,
  AuthUser,
  CreateOrgPayload,
  ForgotPasswordFormValues,
  ForgotPasswordResult,
  LoginFormValues,
  LoginResult,
  OrgDetail,
  OrgListing,
  OrgRegistrationPayload,
  Organization,
  OtpVerificationFormValues,
  RegisterResult,
  ResetPasswordFormValues,
  ResetPasswordResult,
  VerifyEmailResult,
} from "@/types";

// ─── Mock data (used when NEXT_PUBLIC_API_URL is not set) ─────────────────────

type MockUserRecord = {
  id: string;
  fullName: string;
  email: string;
  password: string;
  emailVerified: boolean;
};

// Mock organisations used when NEXT_PUBLIC_API_URL is not set.
const MOCK_ORGS: OrgListing[] = [
  {
    id: "1",
    name: "Workout Club",
    slug: "workout-club",
    address: "Bandra West, Mumbai",
    description:
      "Premium fitness center equipped with modern strength machines, cardio zones, and expert personal trainers to help you achieve your goals.",
    appointmentCount: 15,
    workingHours: "06:00 – 23:00",
    logoUrl: null,
  },
  {
    id: "2",
    name: "LeadsTrackr",
    slug: "leads-trackr",
    address: "Byculla, Mumbai",
    description:
      "We build a profitable CRM for business owners. Optimize your sales pipeline and manage customer relationships effortlessly.",
    appointmentCount: 0,
    workingHours: "09:00 – 17:00",
    logoUrl: null,
  },
  {
    id: "3",
    name: "Urban Oasis Spa",
    slug: "urban-oasis-spa",
    address: "Juhu, Mumbai",
    description:
      "A luxury wellness retreat offering deep tissue massages, aromatherapy, and rejuvenating facial treatments in a tranquil environment.",
    appointmentCount: 4,
    workingHours: "10:00 – 21:00",
    logoUrl: null,
  },
  {
    id: "4",
    name: "Bright Smiles Dental",
    slug: "bright-smiles-dental",
    address: "Andheri East, Mumbai",
    description:
      "Comprehensive dental care including routine checkups, cosmetic dentistry, and emergency treatments with state-of-the-art technology.",
    appointmentCount: 8,
    workingHours: "09:30 – 19:30",
    logoUrl: null,
  },
  {
    id: "5",
    name: "Nexus Tech Consulting",
    slug: "nexus-tech",
    address: "BKC, Mumbai",
    description:
      "Strategic IT consulting and digital transformation services for enterprise clients. Book an initial discovery call with our experts.",
    appointmentCount: 3,
    workingHours: "09:00 – 18:00",
    logoUrl: null,
  },
];

// Extended detail records keyed by slug.
// WHY a Record (not array): profile page looks up by slug — O(1) vs O(n) linear scan.
const MOCK_ORG_DETAILS: Record<string, OrgDetail> = {
  "workout-club": {
    ...MOCK_ORGS[0]!,
    contactPhone: "+91 98765 11111",
    contactEmail: "hello@workoutclub.in",
    timezone: "Asia/Kolkata",
  },
  "leads-trackr": {
    ...MOCK_ORGS[1]!,
    contactPhone: "+91 90012 22222",
    contactEmail: "sales@leadstrackr.com",
    timezone: "Asia/Kolkata",
  },
  "urban-oasis-spa": {
    ...MOCK_ORGS[2]!,
    contactPhone: "+91 88990 33333",
    contactEmail: "bookings@urbanoasis.in",
    timezone: "Asia/Kolkata",
  },
  "bright-smiles-dental": {
    ...MOCK_ORGS[3]!,
    contactPhone: "+91 77001 44444",
    contactEmail: "appointments@brightsmiles.in",
    timezone: "Asia/Kolkata",
  },
  "nexus-tech": {
    ...MOCK_ORGS[4]!,
    contactPhone: "+91 98100 55555",
    contactEmail: "consult@nexustech.in",
    timezone: "Asia/Kolkata",
  },
};

// In-memory mock user store (cleared on page refresh — development only).
const mockUsers = new Map<string, MockUserRecord>();

// ─── Axios instance ───────────────────────────────────────────────────────────

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// WHY withCredentials: true — the backend sets httpOnly access + refresh cookies.
// Axios must include credentials on every request so the browser sends those
// cookies automatically. No manual token handling needed.
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ─── Error helper ─────────────────────────────────────────────────────────────

function extractApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (Array.isArray(msg)) throw new Error(msg[0] as string);
    if (typeof msg === "string") throw new Error(msg);
    throw new Error(error.message ?? "An unexpected error occurred.");
  }
  throw error;
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function wait(delay = 500) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function buildMockUser(record: MockUserRecord): AuthUser {
  return {
    id: record.id,
    email: record.email,
    fullName: record.fullName,
    role: "CUSTOMER",
    isActive: true,
    emailVerified: record.emailVerified,
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

/**
 * POST /auth/register  (Customer path)
 * Registers a new customer. No organization object → backend sets role=CUSTOMER.
 * Returns { userId, message }. No cookies issued — user must verify email then login.
 */
export async function registerCustomer(creds: {
  fullName: string;
  email: string;
  password: string;
}): Promise<RegisterResult> {
  if (api.defaults.baseURL) {
    try {
      const { data } = await api.post<RegisterResult>("/auth/register", {
        fullName: creds.fullName,
        email: creds.email,
        password: creds.password,
      });
      return data;
    } catch (err) {
      extractApiError(err);
    }
  }

  // MOCK
  await wait();
  const key = creds.email.toLowerCase();
  if (mockUsers.has(key)) throw new Error("Email is already registered.");
  const user: MockUserRecord = {
    id: crypto.randomUUID(),
    fullName: creds.fullName.trim(),
    email: key,
    password: creds.password,
    emailVerified: false,
  };
  mockUsers.set(key, user);
  return {
    userId: user.id,
    message: "Account created — check your email for a verification code.",
  };
}

/**
 * POST /auth/register  (Organizer path)
 * Registers a new organizer with their organization data in one atomic transaction.
 * Backend sets role=ORGANIZER and creates the org record together.
 * Returns { userId, organizationId, message }.
 * No cookies issued — user must verify email then login.
 *
 * Backend RegisterOrganizationDto fields:
 *   name, slug, contactEmail (required)
 *   description, contactPhone, address, timezone (optional)
 */
export async function registerOrgUser(
  payload: OrgRegistrationPayload,
): Promise<RegisterResult> {
  if (api.defaults.baseURL) {
    try {
      const { data } = await api.post<RegisterResult>("/auth/register", {
        fullName: payload.user.fullName,
        email: payload.user.email,
        password: payload.user.password,
        organization: {
          name: payload.org.name,
          slug: payload.org.slug,
          contactEmail: payload.user.email, // org contact = user email
          description: payload.org.description,
          contactPhone: payload.org.contactPhone,
          address: payload.org.address,
          timezone: payload.org.timezone,
        },
      });
      return data;
    } catch (err) {
      extractApiError(err);
    }
  }

  // MOCK
  await wait();
  const key = payload.user.email.toLowerCase();
  if (mockUsers.has(key)) throw new Error("Email is already registered.");
  const user: MockUserRecord = {
    id: crypto.randomUUID(),
    fullName: payload.user.fullName.trim(),
    email: key,
    password: payload.user.password,
    emailVerified: false,
  };
  mockUsers.set(key, user);
  return {
    userId: user.id,
    organizationId: crypto.randomUUID(),
    message: "Organisation registered — check your email to verify your account.",
  };
}

/**
 * POST /auth/verify-email
 * Verifies the 6-digit OTP sent to the user's email on signup.
 * Returns { message } only — user must then call loginUser() to get cookies.
 */
export async function verifyEmail(
  payload: OtpVerificationFormValues,
): Promise<VerifyEmailResult> {
  if (api.defaults.baseURL) {
    try {
      const { data } = await api.post<VerifyEmailResult>("/auth/verify-email", {
        email: payload.email,
        code: payload.code,
      });
      return data;
    } catch (err) {
      extractApiError(err);
    }
  }

  // MOCK
  await wait();
  const key = payload.email.toLowerCase();
  const user = mockUsers.get(key);
  if (!user) throw new Error("Invalid or expired code.");
  if (payload.code !== DEMO_OTP) throw new Error("Invalid or expired code.");
  user.emailVerified = true;
  return { message: "Email verified." };
}

/**
 * POST /auth/resend-otp
 * Resends OTP for the given purpose (SIGNUP or LOGIN for 2FA).
 */
export async function resendOtp(
  email: string,
  purpose: "SIGNUP" | "LOGIN",
): Promise<{ message: string }> {
  if (api.defaults.baseURL) {
    try {
      const { data } = await api.post<{ message: string }>("/auth/resend-otp", {
        email,
        purpose,
      });
      return data;
    } catch (err) {
      extractApiError(err);
    }
  }

  await wait();
  return {
    message: `If an account exists, a code has been sent. (Demo: use ${DEMO_OTP})`,
  };
}

/**
 * POST /auth/login
 * Authenticates with email and password.
 *
 * Two possible success shapes:
 *   { twoFactorRequired: true } — 2FA OTP emailed; cookies NOT set yet.
 *   { user: SafeUser }          — cookies set; session is active.
 *
 * WHY no token: backend uses httpOnly cookies. Axios sends them automatically
 * on all subsequent requests due to withCredentials: true on the axios instance.
 */
export async function loginUser(payload: LoginFormValues): Promise<LoginResult> {
  if (api.defaults.baseURL) {
    try {
      const { data } = await api.post<LoginResult>("/auth/login", {
        email: payload.email,
        password: payload.password,
      });
      return data;
    } catch (err) {
      extractApiError(err);
    }
  }

  // MOCK
  await wait();
  const user = mockUsers.get(payload.email.toLowerCase());
  if (!user || user.password !== payload.password) {
    throw new Error("Invalid credentials.");
  }
  if (!user.emailVerified) {
    throw new Error("Email not verified. Check your inbox for the OTP.");
  }
  return { user: buildMockUser(user) };
}

/**
 * POST /auth/login/2fa
 * Completes 2FA login after submitting the emailed OTP.
 * Returns { user: SafeUser } with httpOnly cookies set.
 */
export async function loginTwoFactor(
  email: string,
  code: string,
): Promise<{ user: AuthUser }> {
  if (api.defaults.baseURL) {
    try {
      const { data } = await api.post<{ user: AuthUser }>("/auth/login/2fa", {
        email,
        code,
      });
      return data;
    } catch (err) {
      extractApiError(err);
    }
  }

  await wait();
  throw new Error("Two-factor authentication is not available in demo mode.");
}

/**
 * GET /auth/me
 * Returns the currently authenticated user from the httpOnly access cookie.
 * Used on app init to rehydrate Zustand auth state.
 * Returns null (not throws) when unauthenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (api.defaults.baseURL) {
    try {
      const { data } = await api.get<AuthUser>("/auth/me");
      return data;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * POST /auth/logout
 * Revokes the current refresh token and clears auth cookies server-side.
 */
export async function logoutUser(): Promise<void> {
  if (api.defaults.baseURL) {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      extractApiError(err);
    }
  }
}

/**
 * POST /auth/forgot-password
 * Sends a password reset link to the provided email.
 * Always returns success (backend is silent on unknown emails).
 */
export async function forgotPassword(
  payload: ForgotPasswordFormValues,
): Promise<ForgotPasswordResult> {
  if (api.defaults.baseURL) {
    try {
      const { data } = await api.post<ForgotPasswordResult>(
        "/auth/forgot-password",
        { email: payload.email },
      );
      return data;
    } catch (err) {
      extractApiError(err);
    }
  }

  await wait();
  return {
    message:
      "If an account exists for this email, a reset link has been sent.",
  };
}

/**
 * POST /auth/reset-password
 * Resets the password using a token from the reset email link.
 * Token is extracted from the URL query param ?token= by the page component.
 */
export async function resetPassword(
  payload: ResetPasswordFormValues,
): Promise<ResetPasswordResult> {
  if (api.defaults.baseURL) {
    try {
      const { data } = await api.post<ResetPasswordResult>(
        "/auth/reset-password",
        { token: payload.token, newPassword: payload.newPassword },
      );
      return data;
    } catch (err) {
      extractApiError(err);
    }
  }

  await wait();
  return { message: "Password reset. Please log in." };
}

// ─── Organisation API ──────────────────────────────────────────────────────────

/**
 * POST /organizations
 * Creates a new organisation for the signed-in organiser.
 *
 * WHY multipart/form-data: The logo is a File object — cannot be sent as JSON.
 * FormData lets us attach the file and text fields in one request.
 *
 * Auth: cookies sent automatically via withCredentials.
 */
export async function createOrganization(
  payload: CreateOrgPayload,
): Promise<Organization> {
  if (api.defaults.baseURL) {
    const form = new FormData();
    form.append("name", payload.name);
    form.append("slug", payload.slug);
    form.append("description", payload.description);
    form.append("contactPhone", payload.contactPhone);
    form.append("address", payload.address);
    form.append("timezone", payload.timezone);
    if (payload.logoFile) form.append("logo", payload.logoFile);

    try {
      const { data } = await api.post<ApiEnvelope<Organization>>(
        "/organizations",
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data.data;
    } catch (err) {
      extractApiError(err);
    }
  }

  // MOCK
  await wait(1000);
  return {
    id: crypto.randomUUID(),
    organiserId: "mock-user-id",
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    logoUrl: null,
    contactEmail: null,
    contactPhone: payload.contactPhone,
    address: payload.address,
    timezone: payload.timezone,
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * GET /organizations/public?q=<query>
 * Fetches the public list of active organisations.
 * Auth: None — public endpoint.
 */
export async function getOrganizations(query?: string): Promise<OrgListing[]> {
  if (api.defaults.baseURL) {
    try {
      const params = query ? { q: query } : {};
      const { data } = await api.get<ApiEnvelope<OrgListing[]>>(
        "/organizations/public",
        { params },
      );
      return data.data;
    } catch (err) {
      extractApiError(err);
    }
  }

  // MOCK — filter the static list by name, description, or address.
  await wait(400);
  if (!query || query.trim() === "") return MOCK_ORGS;
  const q = query.toLowerCase();
  return MOCK_ORGS.filter(
    (org) =>
      org.name.toLowerCase().includes(q) ||
      org.description.toLowerCase().includes(q) ||
      org.address.toLowerCase().includes(q),
  );
}

/**
 * GET /organizations/public/:slug
 * Fetches the full detail of one organisation by its URL slug.
 * Auth: None — public endpoint.
 */
export async function getOrganizationBySlug(slug: string): Promise<OrgDetail> {
  if (api.defaults.baseURL) {
    try {
      const { data } = await api.get<ApiEnvelope<OrgDetail>>(
        `/organizations/public/${slug}`,
      );
      return data.data;
    } catch (err) {
      extractApiError(err);
    }
  }

  // MOCK — O(1) Record lookup.
  await wait(300);
  const org = MOCK_ORG_DETAILS[slug];
  if (!org) throw new Error("Organisation not found.");
  return org;
}
