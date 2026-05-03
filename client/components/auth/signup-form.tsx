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

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams?.get("next") ?? null;
  const safeNext = nextParam && nextParam.startsWith("/") ? nextParam : null;
  const registerMutation = useRegister();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(
      { email, password, fullName, role: "CUSTOMER" },
      {
        onSuccess: (res) => {
          toast.success(res.message);
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

        <AuthError error={registerMutation.error} />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={
            registerMutation.isPending ||
            !fullName ||
            !email ||
            password.length < 8
          }
        >
          {registerMutation.isPending ? <Spinner /> : null}
          Create account
        </Button>
      </form>

      <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm">
        <p className="font-medium text-foreground">Running an organization?</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Apply for an organizer account — review takes a business day.
        </p>
        <Link
          href="/onboarding/organizer"
          className="mt-2 inline-block text-xs font-medium text-foreground hover:underline"
        >
          Start organizer application →
        </Link>
      </div>
    </AuthShell>
  );
}
