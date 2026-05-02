import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/features/auth/forgot-password-form";
import { AuthShell } from "@/components/shared/auth-shell";

export const metadata: Metadata = {
  title: "Forgot Password — Appointment App",
  description: "Request a one-time code to recover your account.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot password"
      description="Enter your email and we will send a one-time code."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
