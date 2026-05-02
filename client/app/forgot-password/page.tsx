"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { AuthError } from "@/components/auth/auth-error";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useForgotPassword } from "@/hooks/useAuth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const forgot = useForgotPassword();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgot.mutate(
      { email },
      {
        onSuccess: (res) => {
          setSubmitted(true);
          toast.success(res.message);
        },
      },
    );
  };

  return (
    <AuthShell
      title="Forgot password?"
      description="We'll send you a link to choose a new one."
      footer={
        <Link href="/login" className="text-foreground hover:underline">
          Back to sign in
        </Link>
      }
    >
      {submitted ? (
        <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm">
          If an account exists for{" "}
          <span className="font-medium text-foreground">{email}</span>, a reset
          link is on its way. Check your inbox.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={forgot.isPending}
            />
          </div>

          <AuthError error={forgot.error} />

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!email || forgot.isPending}
          >
            {forgot.isPending ? <Spinner /> : null}
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
