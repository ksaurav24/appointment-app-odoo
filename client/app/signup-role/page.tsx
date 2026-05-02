import type { Metadata } from "next";
import { SignupRoleSelection } from "@/components/features/auth/signup-role-selection";
import { AuthShell } from "@/components/shared/auth-shell";

export const metadata: Metadata = {
  title: "Choose Role — Appointment App",
  description: "Select the role you want to use after signup verification.",
};

export default function SignupRolePage() {
  return (
    <AuthShell
      title="Choose your role"
      description="Select whether you are signing up as an organiser or customer."
    >
      <SignupRoleSelection />
    </AuthShell>
  );
}
