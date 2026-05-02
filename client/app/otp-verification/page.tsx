import type { Metadata } from "next";
import { OtpVerificationForm } from "@/components/features/auth/otp-verification-form";
import { AuthShell } from "@/components/shared/auth-shell";

export const metadata: Metadata = {
  title: "OTP Verification — Appointment App",
  description: "Verify your one-time code to continue securely.",
};

export default function OtpVerificationPage() {
  return (
    <AuthShell title="OTP verification" description="Enter your email and 6-digit OTP.">
      <OtpVerificationForm />
    </AuthShell>
  );
}
