import type { Metadata } from "next";
import { LoginForm } from "@/components/features/auth/login-form";
import { AuthShell } from "@/components/shared/auth-shell";

export const metadata: Metadata = {
  title: "Login — Appointment App",
  description: "Sign in to continue managing your appointments.",
};

export default function LoginPage() {
  return (
    <AuthShell title="Login" description="Enter your email and password to sign in.">
      <LoginForm />
    </AuthShell>
  );
}
