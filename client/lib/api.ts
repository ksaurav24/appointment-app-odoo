import axios from "axios";
import { DEMO_OTP } from "@/constants";
import type {
  ApiEnvelope,
  AuthResult,
  CreateOrgPayload,
  ForgotPasswordFormValues,
  LoginFormValues,
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

// \u2500\u2500\u2500 Auth API \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export async function signupUser(payload: SignupFormValues): Promise<AuthResult> {
  // If backend URL exists, use real API. Otherwise use local mock mode for demo speed.
  if (api.defaults.baseURL) {
    const { data } = await api.post<ApiEnvelope<AuthResult>>("/auth/signup", payload);
    return data.data;
  }

  // \u2014 MOCK (no NEXT_PUBLIC_API_URL set) \u2014
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
