"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AuthError } from "@/components/auth/auth-error";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useResetPassword } from "@/hooks/useAuth";

export function ResetPasswordForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const reset = useResetPassword();

  const mismatch = confirm.length > 0 && newPassword !== confirm;

  if (!token) {
    return (
      <AuthShell
        title="Reset password"
        footer={
          <Link
            href="/forgot-password"
            className="text-foreground hover:underline"
          >
            Request a new link
          </Link>
        }
      >
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          This link is missing a reset token. Request a new one to continue.
        </div>
      </AuthShell>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch) return;

    reset.mutate(
      { token, newPassword },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          router.replace("/login");
        },
      },
    );
  };

  return (
    <AuthShell
      title="Choose a new password"
      description="Pick something strong — at least 8 characters."
      footer={
        <Link href="/login" className="text-foreground hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={reset.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={confirm}
            aria-invalid={mismatch || undefined}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={reset.isPending}
          />
          {mismatch ? (
            <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
          ) : null}
        </div>

        <AuthError error={reset.error} />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={
            mismatch ||
            newPassword.length < 8 ||
            confirm.length < 8 ||
            reset.isPending
          }
        >
          {reset.isPending ? <Spinner /> : null}
          Reset password
        </Button>
      </form>
    </AuthShell>
  );
}
