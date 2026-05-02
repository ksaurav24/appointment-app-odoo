import type { Metadata } from "next";
import { SignupForm } from "@/components/features/auth/signup-form";
import { AuthShell } from "@/components/shared/auth-shell";

export const metadata: Metadata = {
  title: "Sign Up — Appointment App",
  description: "Create your appointment app account.",
};

export default function SignupPage() {
  return (
    <AuthShell title="Sign up" description="Create your account to get started.">
      <SignupForm />
    </AuthShell>
  );
}
