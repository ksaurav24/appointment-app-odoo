import axios from "axios";
import { DEMO_OTP } from "@/constants";
import type {
  ApiEnvelope,
  AuthResult,
  CreateOrgPayload,
  ForgotPasswordFormValues,
  LoginFormValues,
  OrgDetail,
  OrgListing,
  Organization,
  OtpVerificationFormValues,
  SignupFormValues,
} from "@/types";

type MockUserRecord = {
  id: string;
  name: string;
  email: string;
  password: string;
};

// Mock organisations used when NEXT_PUBLIC_API_URL is not set.
// These simulate what GET /organizations/public returns from the backend.
// Add or edit entries here to test different listing scenarios during development.
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
// Each entry spreads the base listing and adds phone, email, timezone.
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

const mockUsers = new Map<string, MockUserRecord>();
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Single Axios instance \u2014 base URL defined once.
// All API calls go through this instance so auth headers are added automatically.
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach the JWT token from storage to every outgoing request.
// BACKEND INTEGRATION: token key must match what the backend issues on login/OTP.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function wait(delay = 500) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

function buildAuthResult(user: MockUserRecord, message: string): AuthResult {
  return {
    user: { id: user.id, name: user.name, email: user.email },
    token: `token-${user.id}`,
    message,
  };
}

// Auth API 

export async function signupUser(payload: SignupFormValues): Promise<AuthResult> {
  // If backend URL exists, use real API. Otherwise use local mock mode for demo speed.
  if (api.defaults.baseURL) {
    const { data } = await api.post<ApiEnvelope<AuthResult>>("/auth/signup", payload);
    return data.data;
  }

  // MOCK (no NEXT_PUBLIC_API_URL set)
  await wait();
  const existingUser = mockUsers.get(payload.email.toLowerCase());
  if (existingUser) throw new Error("Email already exists.");

  const user = {
    id: crypto.randomUUID(),
    name: payload.name.trim(),
    email: payload.email.toLowerCase(),
    password: payload.password,
  };
  mockUsers.set(user.email, user);
  return buildAuthResult(user, "Account created successfully.");
}

export async function loginUser(payload: LoginFormValues): Promise<AuthResult> {
  if (api.defaults.baseURL) {
    const { data } = await api.post<ApiEnvelope<AuthResult>>("/auth/login", payload);
    return data.data;
  }

  await wait();
  const user = mockUsers.get(payload.email.toLowerCase());
  if (!user || user.password !== payload.password) {
    throw new Error("Invalid email or password.");
  }
  return buildAuthResult(user, "Signed in successfully.");
}

export async function forgotPassword(
  payload: ForgotPasswordFormValues,
): Promise<{ message: string }> {
  if (api.defaults.baseURL) {
    const { data } = await api.post<ApiEnvelope<{ message: string }>>(
      "/auth/forgot-password",
      payload,
    );
    return data.data;
  }

  await wait();
  const user = mockUsers.get(payload.email.toLowerCase());
  if (!user) throw new Error("No account found for this email.");
  return { message: `OTP sent. Use ${DEMO_OTP} for demo.` };
}

export async function verifyOtp(
  payload: OtpVerificationFormValues,
): Promise<AuthResult> {
  if (api.defaults.baseURL) {
    const { data } = await api.post<ApiEnvelope<AuthResult>>(
      "/auth/verify-otp",
      payload,
    );
    return data.data;
  }

  await wait();
  const user = mockUsers.get(payload.email.toLowerCase());
  if (!user) throw new Error("No account found for this email.");
  if (payload.code !== DEMO_OTP) throw new Error("Invalid OTP code.");
  return buildAuthResult(user, "OTP verified.");
}

// \u2500\u2500\u2500 Organisation API \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/**
 * Creates a new organisation for the signed-in organiser.
 *
 * WHY multipart/form-data:
 * The logo is a File object \u2014 it cannot be sent as JSON.
 * FormData lets us attach both the file and text fields in one request.
 * The backend receives them and streams the file to cloud storage (S3/Cloudinary).
 *
 * BACKEND INTEGRATION:
 * - Endpoint: POST /organizations
 * - Auth: Bearer token in Authorization header (set by interceptor above)
 * - Response: ApiEnvelope<Organization>
 * Remove the mock block once NEXT_PUBLIC_API_URL is set in .env.local.
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

    const { data } = await api.post<ApiEnvelope<Organization>>(
      "/organizations",
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.data;
  }

  // \u2014 MOCK \u2014
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
    isActive: false,  // false until admin approves
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Fetches the public list of active organisations.
 * Optionally filters by a search query (name, description, or address).
 *
 * BACKEND INTEGRATION:
 * - Endpoint: GET /organizations/public?q=<query>
 * - Auth: None — this is a public endpoint.
 * - Response: ApiEnvelope<OrgListing[]>
 */
export async function getOrganizations(query?: string): Promise<OrgListing[]> {
  if (api.defaults.baseURL) {
    const params = query ? { q: query } : {};
    const { data } = await api.get<ApiEnvelope<OrgListing[]>>(
      "/organizations/public",
      { params },
    );
    return data.data;
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
 * Fetches the full detail of one organisation by its URL slug.
 *
 * BACKEND INTEGRATION:
 * - Endpoint: GET /organizations/public/:slug
 * - Auth: None — public endpoint.
 * - Response: ApiEnvelope<OrgDetail>
 * - 404 from backend should result in thrown Error("Organisation not found.")
 */
export async function getOrganizationBySlug(slug: string): Promise<OrgDetail> {
  if (api.defaults.baseURL) {
    const { data } = await api.get<ApiEnvelope<OrgDetail>>(
      `/organizations/public/${slug}`,
    );
    return data.data;
  }

  // MOCK — look up by slug in the details map (O(1) Record lookup).
  await wait(300);
  const org = MOCK_ORG_DETAILS[slug];
  if (!org) {
    // Throw the same message the backend would — consistent error handling.
    throw new Error("Organisation not found.");
  }
  return org;
}
