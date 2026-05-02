"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AuthError } from "@/components/auth/auth-error";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useResendOtp, useVerifyEmail } from "@/hooks/useAuth";

export function VerifyEmailForm() {
  const router = useRouter();
  const search = useSearchParams();
  const presetEmail = search.get("email") ?? "";
  const nextParam = search.get("next") ?? null;
  const safeNext = nextParam && nextParam.startsWith("/") ? nextParam : null;

  const [email, setEmail] = useState(presetEmail);
  const [code, setCode] = useState("");

  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendOtp();

  const onVerify = (e: React.FormEvent) => {
    e.preventDefault();
    verifyMutation.mutate(
      { email, code },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          router.replace(
            safeNext
              ? `${safeNext}`
              : `/login?email=${encodeURIComponent(email)}`,
          );
        },
      },
    );
  };

  const onResend = () => {
    resendMutation.mutate(
      { email, purpose: "SIGNUP" },
      { onSuccess: (res) => toast.success(res.message) },
    );
  };

  return (
    <AuthShell
      title="Verify your email"
      description="Enter the 6-digit code we just emailed you."
      footer={
        <Link
          href={
            safeNext
              ? `/login?next=${encodeURIComponent(safeNext)}`
              : "/login"
          }
          className="text-foreground hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onVerify} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={verifyMutation.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Verification code</Label>
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              autoFocus={!!presetEmail}
              disabled={verifyMutation.isPending}
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        <AuthError error={verifyMutation.error} />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!email || code.length !== 6 || verifyMutation.isPending}
        >
          {verifyMutation.isPending ? <Spinner /> : null}
          Verify email
        </Button>

        <button
          type="button"
          onClick={onResend}
          disabled={!email || resendMutation.isPending}
          className="block w-full text-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {resendMutation.isPending ? "Sending…" : "Resend code"}
        </button>
      </form>
    </AuthShell>
  );
}
