"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { Spinner } from "@/components/ui/spinner";
import { useChangePassword } from "@/hooks/useAuth";

export function ChangePasswordForm() {
  const router = useRouter();
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (next.length < 8) {
      setLocalError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setLocalError("New password and confirmation don't match.");
      return;
    }
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          // Server revokes all refresh tokens — user must log in again.
          router.push("/login");
        },
        onError: (err) => {
          setLocalError(err.messages[0] ?? "Couldn't change password.");
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base">Change password</CardTitle>
        <CardDescription>
          You&apos;ll be signed out of all sessions and asked to sign in again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
            <PasswordStrengthMeter password={next} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {localError ? (
            <p className="text-sm text-destructive">{localError}</p>
          ) : null}
          <Button type="submit" disabled={change.isPending}>
            {change.isPending ? <Spinner className="mr-2 size-4" /> : null}
            Change password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
