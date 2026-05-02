"use client";

// Central auth hook. All authentication mutations live here.
//
// Architecture notes:
// - Backend uses httpOnly cookies for access/refresh tokens.
//   No token is stored in JS — the browser handles cookies automatically.
//
// Registration flow:
//   registerCustomerMutation → POST /auth/register (no org) → role=CUSTOMER
//   registerOrgMutation      → POST /auth/register + org   → role=ORGANIZER
//   verifyEmailMutation      → POST /auth/verify-email
//   loginMutation            → POST /auth/login (sets cookies)
//   logoutMutation           → POST /auth/logout (clears cookies)

import { useMutation } from "@tanstack/react-query";
import {
  forgotPassword,
  loginTwoFactor,
  loginUser,
  logoutUser,
  registerCustomer,
  registerOrgUser,
  resendOtp,
  resetPassword,
  verifyEmail,
} from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  OrgRegistrationPayload,
  OtpVerificationFormValues,
  ResetPasswordFormValues,
} from "@/types";

export function useAuth() {
  const setUser = useAppStore((state) => state.setUser);
  const clearAuth = useAppStore((state) => state.clearAuth);

  // ── Register Customer ─────────────────────────────────────────────────────────
  // Returns { userId, message }. No session — user must verify email then login.
  const registerCustomerMutation = useMutation({
    mutationFn: (creds: { fullName: string; email: string; password: string }) =>
      registerCustomer(creds),
  });

  // ── Register Organizer ────────────────────────────────────────────────────────
  // Returns { userId, organizationId, message }. No session — same verify+login flow.
  const registerOrgMutation = useMutation({
    mutationFn: (payload: OrgRegistrationPayload) => registerOrgUser(payload),
  });

  // ── Verify Email (OTP) ────────────────────────────────────────────────────────
  // Returns { message }. No session — user must call loginMutation next.
  const verifyEmailMutation = useMutation({
    mutationFn: (payload: OtpVerificationFormValues) => verifyEmail(payload),
  });

  // ── Login ─────────────────────────────────────────────────────────────────────
  // Returns { user } (cookies set) or { twoFactorRequired: true }.
  const loginMutation = useMutation({
    mutationFn: (payload: LoginFormValues) => loginUser(payload),
    onSuccess: (result) => {
      if (result.user) setUser(result.user);
    },
  });

  // ── Login 2FA ─────────────────────────────────────────────────────────────────
  const loginTwoFactorMutation = useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      loginTwoFactor(email, code),
    onSuccess: (result) => setUser(result.user),
  });

  // ── Logout ────────────────────────────────────────────────────────────────────
  const logoutMutation = useMutation({
    mutationFn: () => logoutUser(),
    onSuccess: () => clearAuth(),
  });

  // ── Resend OTP ────────────────────────────────────────────────────────────────
  const resendOtpMutation = useMutation({
    mutationFn: ({
      email,
      purpose,
    }: {
      email: string;
      purpose: "SIGNUP" | "LOGIN";
    }) => resendOtp(email, purpose),
  });

  // ── Forgot Password ───────────────────────────────────────────────────────────
  const forgotPasswordMutation = useMutation({
    mutationFn: (payload: ForgotPasswordFormValues) => forgotPassword(payload),
  });

  // ── Reset Password ────────────────────────────────────────────────────────────
  const resetPasswordMutation = useMutation({
    mutationFn: (payload: ResetPasswordFormValues) => resetPassword(payload),
  });

  return {
    registerCustomerMutation,
    registerOrgMutation,
    verifyEmailMutation,
    loginMutation,
    loginTwoFactorMutation,
    logoutMutation,
    resendOtpMutation,
    forgotPasswordMutation,
    resetPasswordMutation,
  };
}
