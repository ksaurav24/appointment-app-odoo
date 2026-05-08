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
import { useRegister } from "@/hooks/useAuth";
import { clearPendingSignup, savePendingSignup } from "@/lib/pending-signup";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams?.get("next") ?? null;
  const safeNext = nextParam && nextParam.startsWith("/") ? nextParam : null;
  const registerMutation = useRegister();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitEvent = e.nativeEvent as SubmitEvent;
    const submitter = submitEvent.submitter as HTMLButtonElement | null;
    const role = submitter?.value === "ORGANIZER" ? "ORGANIZER" : "CUSTOMER";

    registerMutation.mutate(
      { email, password, fullName, role },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          if (role === "ORGANIZER") {
            savePendingSignup({ email, password, role: "ORGANIZER" });
            router.replace(
              `/onboarding/organizer?step=verify&email=${encodeURIComponent(email)}`,
            );
            return;
          }
          clearPendingSignup();

          const verifyUrl = safeNext
            ? `/verify-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(safeNext)}`
            : `/verify-email?email=${encodeURIComponent(email)}`;
          router.replace(verifyUrl);
        },
      },
    );
  };

  return (
    <AuthShell
      title="Create your account"
      description="Book appointments in minutes."
      footer={
        <span>
          Already have an account?{" "}
          <Link
            href={
              safeNext
                ? `/login?next=${encodeURIComponent(safeNext)}`
                : "/login"
            }
            className="text-foreground hover:underline"
          >
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={registerMutation.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={registerMutation.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={registerMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={registerMutation.isPending}
          />
          {confirmPassword && confirmPassword !== password ? (
            <p className="text-xs text-destructive">Passwords do not match.</p>
          ) : null}
        </div>

        <AuthError error={registerMutation.error} />

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Choose account type</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="submit"
              value="CUSTOMER"
              size="lg"
              className="w-full"
              disabled={
                registerMutation.isPending ||
                !fullName ||
                !email ||
                password.length < 8 ||
                confirmPassword !== password
              }
            >
              {registerMutation.isPending ? <Spinner /> : null}
              Sign up as user
            </Button>
            <Button
              type="submit"
              value="ORGANIZER"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={
                registerMutation.isPending ||
                !fullName ||
                !email ||
                password.length < 8 ||
                confirmPassword !== password
              }
            >
              {registerMutation.isPending ? <Spinner /> : null}
              Sign up as organizer
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Organizer signup continues with organization setup after email
            verification.
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
