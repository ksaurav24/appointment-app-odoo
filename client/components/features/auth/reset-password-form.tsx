"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { resetPasswordSchema } from "@/lib/validations";
import type { ResetPasswordFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Token comes from the reset link: /reset-password?token=<uuid>
  const tokenFromUrl = searchParams.get("token") ?? "";

  const { resetPasswordMutation } = useAuth();

  const { register, handleSubmit, formState } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: tokenFromUrl, newPassword: "", confirmPassword: "" },
  });

  // Guard: no token in URL → likely landed here directly, not from email.
  if (!tokenFromUrl) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-red-600">
          Invalid or missing reset token. Please request a new password reset link.
        </p>
        <a href={ROUTES.forgotPassword} className="text-sm text-blue-600 hover:underline">
          Request new link
        </a>
      </div>
    );
  }

  async function onSubmit(values: ResetPasswordFormValues) {
    try {
      const result = await resetPasswordMutation.mutateAsync(values);
      toast.success(result.message);
      router.push(ROUTES.login);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reset password.";
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Hidden field — token is injected from URL, not typed by user */}
      <input type="hidden" {...register("token")} />

      <div className="space-y-1">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register("newPassword")}
        />
        <p className="text-xs text-red-600">{formState.errors.newPassword?.message}</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        <p className="text-xs text-red-600">
          {formState.errors.confirmPassword?.message}
        </p>
      </div>

      <Button
        type="submit"
        disabled={resetPasswordMutation.isPending}
        className="w-full"
      >
        {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
      </Button>
    </form>
  );
}
