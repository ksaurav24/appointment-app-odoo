import type { Metadata } from "next";
import { Suspense } from "react";
import { OtpVerificationForm } from "@/components/features/auth/otp-verification-form";
import { AuthShell } from "@/components/shared/auth-shell";

export const metadata: Metadata = {
  title: "Verify Your Email — Appointment App",
  description: "Enter the 6-digit code sent to your email to verify your account.",
};

export default function OtpVerificationPage() {
  return (
    <AuthShell
      title="Check your email"
      description="We sent a 6-digit verification code to your email address."
    >
      {/* Suspense required — OtpVerificationForm calls useSearchParams() */}
      <Suspense fallback={<p className="text-sm text-gray-500 text-center">Loading...</p>}>
        <OtpVerificationForm />
      </Suspense>
    </AuthShell>
  );
}
