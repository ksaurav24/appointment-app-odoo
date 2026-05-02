"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { forgotPasswordSchema } from "@/lib/validations";
import type { ForgotPasswordFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const router = useRouter();
  const { forgotPasswordMutation } = useAuth();
  const { register, handleSubmit, formState } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      const result = await forgotPasswordMutation.mutateAsync(values);
      toast.success(result.message);
      const emailQuery = encodeURIComponent(values.email);
      router.push(`${ROUTES.otpVerification}?email=${emailQuery}&flow=reset`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to send OTP.";
      toast.error(message);
    }
  }

  function onInvalidSubmit() {
    toast.error("Please fix form errors.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        <p className="text-xs text-red-600">{formState.errors.email?.message}</p>
      </div>
      <Button
        type="submit"
        disabled={forgotPasswordMutation.isPending}
        className="w-full"
      >
        {forgotPasswordMutation.isPending ? "Sending..." : "Send OTP"}
      </Button>
      <p className="text-center text-xs text-gray-600">
        Continue with code verification at{" "}
        <Link
          href={`${ROUTES.otpVerification}?flow=reset`}
          className="hover:text-blue-600"
        >
          OTP verification
        </Link>
      </p>
    </form>
  );
}
