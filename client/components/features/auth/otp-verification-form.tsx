"use client";

// OTP verification form — verifies the 6-digit code sent to the user's email.
//
// Flow after successful verification:
//   flow=signup + role=organiser  → /onboarding/setup (3-step org setup)
//   flow=signup + role=customer   → /dashboard/user
//   flow=signup + no role in store → /signup-role (fallback — shouldn't normally happen)
//   flow=reset (any)              → /login (password was reset, user must log in fresh)
//
// WHY no session after verify-email:
//   The backend /auth/verify-email only marks the user as verified — it does NOT
//   issue auth cookies. For the signup flow, the user is redirected to login after
//   verification. Cookies are set only by /auth/login.

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { otpVerificationSchema } from "@/lib/validations";
import { useAppStore } from "@/store/useAppStore";
import type { OtpVerificationFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OtpVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";
  const flow = searchParams.get("flow");

  const { verifyEmailMutation, resendOtpMutation } = useAuth();
  const role = useAppStore((state) => state.role);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { register, handleSubmit, formState } =
    useForm<OtpVerificationFormValues>({
      resolver: zodResolver(otpVerificationSchema),
      defaultValues: { email: emailFromQuery, code: "" },
    });

  async function onSubmit(values: OtpVerificationFormValues) {
    try {
      const result = await verifyEmailMutation.mutateAsync(values);
      toast.success(result.message);

      if (flow === "signup") {
        // Signup flow: email is now verified. Route by role for next step.
        if (role === "organiser") {
          router.push(ROUTES.onboardingSetup);
        } else {
          // Customer or no role: go to login to get session cookies.
          toast.info("Email verified! Please sign in to continue.");
          router.push(ROUTES.login);
        }
        return;
      }

      // Non-signup flows (password reset OTP, etc.) go back to login.
      router.push(ROUTES.login);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to verify OTP.";
      toast.error(message);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || !emailFromQuery) return;
    try {
      const result = await resendOtpMutation.mutateAsync({
        email: emailFromQuery,
        purpose: "SIGNUP",
      });
      toast.success(result.message);
      // 60-second cooldown to prevent spam.
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to resend OTP.";
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {emailFromQuery && (
        <p className="text-center text-xs text-gray-500">
          Code sent to <span className="font-medium text-gray-900">{emailFromQuery}</span>
        </p>
      )}
      <div className="space-y-1">
        <Label htmlFor="code">Verification Code</Label>
        <Input
          id="code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          autoComplete="one-time-code"
          {...register("code")}
        />
        <p className="text-xs text-red-600">{formState.errors.code?.message}</p>
      </div>
      <Button
        type="submit"
        disabled={verifyEmailMutation.isPending}
        className="w-full"
      >
        {verifyEmailMutation.isPending ? "Verifying..." : "Verify Code"}
      </Button>
      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0 || resendOtpMutation.isPending}
          className="text-xs text-gray-500 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resendCooldown > 0
            ? `Resend code in ${resendCooldown}s`
            : "Didn't receive a code? Resend"}
        </button>
      </div>
    </form>
  );
}
