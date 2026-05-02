"use client";

// OTP verification form \u2014 verifies the 6-digit code sent to the user's email.
//
// Routing after OTP depends on the flow query param:
//   flow=signup + role=organiser  \u2192  /onboarding/setup (3-step org setup)
//   flow=signup + role=customer   \u2192  /  (home, no setup needed)
//   flow=signup + no role stored  \u2192  /signup-role (fallback \u2014 shouldn't normally happen)
//   any other flow                \u2192  /login (e.g. password reset)
//
// WHY read role from Zustand: the role is stored when the user picks it on
// /signup-role. By the time they reach this page, the role is already set.

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

  const { otpVerificationMutation } = useAuth();
  // Role was stored in Zustand when user selected it on /signup-role.
  const role = useAppStore((state) => state.role);

  const { register, handleSubmit, formState } = useForm<OtpVerificationFormValues>({
    resolver: zodResolver(otpVerificationSchema),
    defaultValues: { email: emailFromQuery, code: "" },
  });

  async function onSubmit(values: OtpVerificationFormValues) {
    try {
      const result = await otpVerificationMutation.mutateAsync(values);
      toast.success(result.message);

      if (flow === "signup") {
        // Route by role \u2014 organiser goes to 3-step org setup, customer goes home.
        if (role === "organiser") {
          router.push(ROUTES.onboardingSetup);
        } else if (role === "customer") {
          // Customer needs no org setup — go directly to their dashboard.
          router.push(ROUTES.dashboardUser);
        } else {
          // Fallback: role not in store (user accessed URL directly without signup).
          router.push(ROUTES.signupRole);
        }
        return;
      }

      // Non-signup flows (e.g. password reset) go back to login.
      router.push(ROUTES.login);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to verify OTP.";
      toast.error(message);
    }
  }

  function onInvalidSubmit() {
    toast.error("Please fix form errors.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="code">OTP Code</Label>
        <Input
          id="code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          {...register("code")}
        />
        <p className="text-xs text-red-600">{formState.errors.code?.message}</p>
      </div>
      <Button
        type="submit"
        disabled={otpVerificationMutation.isPending}
        className="w-full"
      >
        {otpVerificationMutation.isPending ? "Verifying..." : "Verify OTP"}
      </Button>
    </form>
  );
}
