"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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
import {
  useCurrentUser,
  useLogin,
  useLoginTwoFactor,
  useResendOtp,
} from "@/hooks/useAuth";
import { defaultRouteForRole } from "@/lib/redirects";
import type { Role } from "@/types";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const nextParam = search?.get("next") ?? null;
  const safeNext = nextParam && nextParam.startsWith("/") ? nextParam : null;

  const { data: user, isPending: userPending } = useCurrentUser();
  const loginMutation = useLogin();
  const twoFactorMutation = useLoginTwoFactor();
  const resendMutation = useResendOtp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"credentials" | "2fa">("credentials");

  const targetFor = (role: Role) => safeNext ?? defaultRouteForRole(role);

  useEffect(() => {
    if (user) router.replace(targetFor(user.role));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, safeNext, router]);

  const submitCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          if (data.twoFactorRequired) {
            setStage("2fa");
            toast.info("Verification code sent to your email.");
          } else if (data.user) {
            toast.success("Welcome back.");
            router.replace(targetFor(data.user.role));
          }
        },
      },
    );
  };

  const submitTwoFactor = (e: React.FormEvent) => {
    e.preventDefault();
    twoFactorMutation.mutate(
      { email, code },
      {
        onSuccess: (data) => {
          toast.success("Welcome back.");
          router.replace(targetFor(data.user.role));
        },
      },
    );
  };

  const onResend = () => {
    resendMutation.mutate(
      { email, purpose: "LOGIN" },
      {
        onSuccess: (res) => toast.success(res.message),
      },
    );
  };

  if (userPending || user) {
    return (
      <AuthShell title="Welcome back">
        <div className="flex justify-center py-6">
          <Spinner className="size-5" />
        </div>
      </AuthShell>
    );
  }

  if (stage === "2fa") {
    return (
      <AuthShell
        title="Two-factor verification"
        description={`Enter the 6-digit code sent to ${email}.`}
        footer={
          <button
            type="button"
            onClick={() => setStage("credentials")}
            className="text-foreground hover:underline"
          >
            Use a different account
          </button>
        }
      >
        <form onSubmit={submitTwoFactor} className="space-y-4">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              autoFocus
              disabled={twoFactorMutation.isPending}
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <AuthError error={twoFactorMutation.error} />

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={code.length !== 6 || twoFactorMutation.isPending}
          >
            {twoFactorMutation.isPending ? <Spinner /> : null}
            Verify and continue
          </Button>

          <button
            type="button"
            onClick={onResend}
            disabled={resendMutation.isPending}
            className="block w-full text-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {resendMutation.isPending ? "Sending…" : "Resend code"}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to manage your appointments."
      footer={
        <span>
          New here?{" "}
          <Link
            href={safeNext ? `/signup?next=${encodeURIComponent(safeNext)}` : "/signup"}
            className="text-foreground hover:underline"
          >
            Create an account
          </Link>
        </span>
      }
    >
      <form onSubmit={submitCredentials} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loginMutation.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href={safeNext ? `/forgot-password?next=${encodeURIComponent(safeNext)}` : "/forgot-password"}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loginMutation.isPending}
          />
        </div>

        <AuthError error={loginMutation.error} />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? <Spinner /> : null}
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
