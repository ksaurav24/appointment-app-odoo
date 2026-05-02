"use client";

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
  const flow = searchParams.get("flow");
  const { otpVerificationMutation } = useAuth();
  const { register, handleSubmit, formState } = useForm<OtpVerificationFormValues>({
    resolver: zodResolver(otpVerificationSchema),
    defaultValues: { email: emailFromQuery, code: "" },
  });

  async function onSubmit(values: OtpVerificationFormValues) {
    try {
      const result = await otpVerificationMutation.mutateAsync(values);
      toast.success(result.message);
      if (flow === "signup") {
        router.push(ROUTES.signupRole);
        return;
      }

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
        <Input id="code" type="text" maxLength={6} {...register("code")} />
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
