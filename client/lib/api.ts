import axios from "axios";
import { DEMO_OTP } from "@/constants";
import type {
  ApiEnvelope,
  AuthResult,
  ForgotPasswordFormValues,
  LoginFormValues,
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
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
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

export async function signupUser(payload: SignupFormValues): Promise<AuthResult> {
  if (api.defaults.baseURL) {
    const { data } = await api.post<ApiEnvelope<AuthResult>>("/auth/signup", payload);
    return data.data;
  }

  await wait();
  const existingUser = mockUsers.get(payload.email.toLowerCase());
  if (existingUser) {
    throw new Error("Email already exists.");
  }

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
  if (!user) {
    throw new Error("No account found for this email.");
  }

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
  if (!user) {
    throw new Error("No account found for this email.");
  }
  if (payload.code !== DEMO_OTP) {
    throw new Error("Invalid OTP code.");
  }

  return buildAuthResult(user, "OTP verified.");
}
