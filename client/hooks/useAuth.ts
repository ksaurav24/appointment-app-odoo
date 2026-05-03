"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  changePassword,
  disableTwoFactor,
  enableTwoFactor,
  forgotPassword,
  getCurrentUser,
  loginTwoFactor,
  loginUser,
  logoutAll,
  logoutUser,
  registerUser,
  resendOtp,
  resetPassword,
  verifyEmail,
} from "@/lib/api";
import type {
  ChangePasswordInput,
  DisableTwoFactorInput,
  ForgotPasswordInput,
  GenericMessage,
  LoginInput,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
  ResendOtpInput,
  ResetPasswordInput,
  SafeUser,
  VerifyEmailInput,
  VerifyTwoFactorInput,
} from "@/types";

const AUTH_KEY = ["auth", "me"] as const;

export function useCurrentUser() {
  return useQuery<SafeUser | null>({
    queryKey: AUTH_KEY,
    queryFn: getCurrentUser,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();

  return useMutation<LoginResponse, ApiError, LoginInput>({
    mutationFn: loginUser,
    onSuccess: (data) => {
      if (data.user) {
        qc.setQueryData(AUTH_KEY, data.user);
      }
    },
  });
}

export function useLoginTwoFactor() {
  const qc = useQueryClient();

  return useMutation<{ user: SafeUser }, ApiError, VerifyTwoFactorInput>({
    mutationFn: loginTwoFactor,
    onSuccess: (data) => {
      qc.setQueryData(AUTH_KEY, data.user);
    },
  });
}

export function useRegister() {
  return useMutation<RegisterResponse, ApiError, RegisterInput>({
    mutationFn: registerUser,
  });
}

export function useVerifyEmail() {
  return useMutation<GenericMessage, ApiError, VerifyEmailInput>({
    mutationFn: verifyEmail,
  });
}

export function useResendOtp() {
  return useMutation<GenericMessage, ApiError, ResendOtpInput>({
    mutationFn: resendOtp,
  });
}

export function useForgotPassword() {
  return useMutation<GenericMessage, ApiError, ForgotPasswordInput>({
    mutationFn: forgotPassword,
  });
}

export function useResetPassword() {
  return useMutation<GenericMessage, ApiError, ResetPasswordInput>({
    mutationFn: resetPassword,
  });
}

export function useChangePassword() {
  const qc = useQueryClient();

  return useMutation<GenericMessage, ApiError, ChangePasswordInput>({
    mutationFn: changePassword,
    onSuccess: () => {
      qc.setQueryData(AUTH_KEY, null);
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();

  return useMutation<GenericMessage, ApiError, void>({
    mutationFn: logoutUser,
    onSuccess: () => {
      qc.setQueryData(AUTH_KEY, null);
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

export function useLogoutAll() {
  const qc = useQueryClient();

  return useMutation<GenericMessage, ApiError, void>({
    mutationFn: logoutAll,
    onSuccess: () => {
      qc.setQueryData(AUTH_KEY, null);
      qc.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

export function useEnableTwoFactor() {
  const qc = useQueryClient();

  return useMutation<GenericMessage, ApiError, void>({
    mutationFn: enableTwoFactor,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AUTH_KEY });
    },
  });
}

export function useDisableTwoFactor() {
  const qc = useQueryClient();

  return useMutation<GenericMessage, ApiError, DisableTwoFactorInput>({
    mutationFn: disableTwoFactor,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AUTH_KEY });
    },
  });
}
