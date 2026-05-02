import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/features/auth/reset-password-form";
import { AuthShell } from "@/components/shared/auth-shell";

export const metadata: Metadata = {
  title: "Reset Password — Appointment App",
  description: "Set a new password for your account.",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter a new password below. It must be at least 8 characters and include uppercase, lowercase, and a special character."
    >
      {/* Suspense required because ResetPasswordForm uses useSearchParams */}
      <Suspense fallback={<p className="text-sm text-gray-500">Loading...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
