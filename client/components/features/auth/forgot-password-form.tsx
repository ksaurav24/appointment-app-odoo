"use client";

import Link from "next/link";
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
  const { forgotPasswordMutation } = useAuth();
  const { register, handleSubmit, formState, getValues } =
    useForm<ForgotPasswordFormValues>({
      resolver: zodResolver(forgotPasswordSchema),
    });

  // Track whether request was submitted so we can show a confirmation state.
  const submitted = forgotPasswordMutation.isSuccess;

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      const result = await forgotPasswordMutation.mutateAsync(values);
      toast.success(result.message);
      // Stay on this page — show confirmation message below.
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to send reset link.";
      toast.error(message);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-900">Check your email</p>
        <p className="text-xs text-gray-500">
          If an account exists for{" "}
          <span className="font-medium">{getValues("email")}</span>, a password
          reset link has been sent. It expires in 1 hour.
        </p>
        <Link
          href={ROUTES.login}
          className="inline-block text-sm text-blue-600 hover:underline"
        >
          Back to Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="john@example.com"
          {...register("email")}
        />
        <p className="text-xs text-red-600">{formState.errors.email?.message}</p>
      </div>
      <Button
        type="submit"
        disabled={forgotPasswordMutation.isPending}
        className="w-full"
      >
        {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
      </Button>
      <p className="text-center text-xs text-gray-600">
        Remember your password?{" "}
        <Link href={ROUTES.login} className="hover:text-blue-600">
          Sign in
        </Link>
      </p>
    </form>
  );
}
