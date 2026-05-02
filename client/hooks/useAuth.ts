"use client";

// Central auth hook. All authentication mutations live here.
//
// Architecture notes:
// - Backend uses httpOnly cookies for access/refresh tokens.
//   No token is stored in JS — the browser handles cookies automatically.
// - registerUser  → POST /auth/register    (no session issued yet)
// - verifyEmail   → POST /auth/verify-email (no session issued yet)
// - loginUser     → POST /auth/login       (sets cookies if successful)
// - logoutUser    → POST /auth/logout      (clears cookies server-side)
// - resendOtp     → POST /auth/resend-otp
// - forgotPassword → POST /auth/forgot-password
// - resetPassword  → POST /auth/reset-password

import { useMutation } from "@tanstack/react-query";
import {
  forgotPassword,
  loginTwoFactor,
  loginUser,
  logoutUser,
  registerUser,
  resendOtp,
  resetPassword,
  verifyEmail,
} from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  OtpVerificationFormValues,
  ResetPasswordFormValues,
  SignupFormValues,
} from "@/types";

export function useAuth() {
  const setUser = useAppStore((state) => state.setUser);
  const clearAuth = useAppStore((state) => state.clearAuth);

  // ── Register ─────────────────────────────────────────────────────────────────
  // Returns { userId, message }. No session — user must verify email first.
  const registerMutation = useMutation({
    mutationFn: (payload: SignupFormValues) => registerUser(payload),
    // No onSuccess store update — session only starts after email verification + login.
  });

  // ── Verify Email (OTP) ────────────────────────────────────────────────────────
  // Returns { message }. No session — user must call login next.
  const verifyEmailMutation = useMutation({
    mutationFn: (payload: OtpVerificationFormValues) => verifyEmail(payload),
  });

  // ── Login ─────────────────────────────────────────────────────────────────────
  // Returns { user } (cookies set) or { twoFactorRequired: true }.
  const loginMutation = useMutation({
    mutationFn: (payload: LoginFormValues) => loginUser(payload),
    onSuccess: (result) => {
      // Only store user if full login completed (not 2FA challenge).
      if (result.user) setUser(result.user);
    },
  });

  // ── Login 2FA ─────────────────────────────────────────────────────────────────
  // Completes login after 2FA OTP is submitted.
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
    mutationFn: ({ email, purpose }: { email: string; purpose: "SIGNUP" | "LOGIN" }) =>
      resendOtp(email, purpose),
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
    registerMutation,
    verifyEmailMutation,
    loginMutation,
    loginTwoFactorMutation,
    logoutMutation,
    resendOtpMutation,
    forgotPasswordMutation,
    resetPasswordMutation,
  };
}
