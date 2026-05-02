"use client";

// OTP verification form — verifies the 6-digit code sent to the user's email.
//
// Routing after successful verification (driven by URL query params):
//
//   flow=signup, role=customer  → /login
//     (Email verified. Now the user must log in to get their session cookies.)
//
//   flow=signup, role=organiser → /onboarding/submitted
//     (Org + user created. Email verified. Account is PENDING admin approval.
//      No login needed — the submitted page explains what happens next.)
//
//   anything else               → /login (safe fallback)
//
// WHY we go to /login after customer verification (not directly to dashboard):
//   POST /auth/verify-email does NOT issue auth cookies — it only marks
//   emailVerified=true. The session starts only after POST /auth/login.

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { otpVerificationSchema } from "@/lib/validations";
import type { OtpVerificationFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OtpVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailFromQuery = searchParams.get("email") ?? "";
  const flow = searchParams.get("flow");            // "signup" | null
  const role = searchParams.get("role");            // "customer" | "organiser" | null

  const { verifyEmailMutation, resendOtpMutation } = useAuth();
  const [resendCooldown, setResendCooldown] = useState(0);

  const { register, handleSubmit, formState } =
    useForm<OtpVerificationFormValues>({
      resolver: zodResolver(otpVerificationSchema),
      defaultValues: { email: emailFromQuery, code: "" },
    });

  async function onSubmit(values: OtpVerificationFormValues) {
    try {
      await verifyEmailMutation.mutateAsync(values);
      toast.success("Email verified successfully!");

      if (flow === "signup") {
        if (role === "organiser") {
          // Organizer: account is PENDING. Show the submitted/waiting page.
          router.push(ROUTES.onboardingSubmitted);
        } else {
          // Customer: verified. Now log in to get session cookies.
          toast.info("Please sign in to access your account.");
          router.push(ROUTES.login);
        }
        return;
      }

      // Fallback for all other flows (e.g. future 2FA OTP reuse, etc.)
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
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
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
        <p className="rounded-lg bg-blue-50 px-4 py-3 text-center text-xs text-blue-700">
          A 6-digit code was sent to{" "}
          <span className="font-semibold">{emailFromQuery}</span>
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
          className="tracking-[0.5em] text-center text-lg font-semibold"
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
