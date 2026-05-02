"use client";

import { useMutation } from "@tanstack/react-query";
import { forgotPassword, loginUser, signupUser, verifyOtp } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  OtpVerificationFormValues,
  SignupFormValues,
} from "@/types";

// Manages authentication mutations and shared auth session state.
export function useAuth() {
  const setAuth = useAppStore((state) => state.setAuth);

  const loginMutation = useMutation({
    mutationFn: (payload: LoginFormValues) => loginUser(payload),
    onSuccess: (result) => setAuth(result.user, result.token),
  });

  const signupMutation = useMutation({
    mutationFn: (payload: SignupFormValues) => signupUser(payload),
    onSuccess: (result) => setAuth(result.user, result.token),
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (payload: ForgotPasswordFormValues) => forgotPassword(payload),
  });

  const otpVerificationMutation = useMutation({
    mutationFn: (payload: OtpVerificationFormValues) => verifyOtp(payload),
    // We store session only after OTP succeeds to align with secure signup flow.
    onSuccess: (result) => setAuth(result.user, result.token),
  });

  return {
    loginMutation,
    signupMutation,
    forgotPasswordMutation,
    otpVerificationMutation,
  };
}
