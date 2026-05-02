"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { loginSchema } from "@/lib/validations";
import type { LoginFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const { loginMutation } = useAuth();
  const [twoFactorEmail, setTwoFactorEmail] = useState<string | null>(null);

  const { register, handleSubmit, formState, getValues } =
    useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    try {
      const result = await loginMutation.mutateAsync(values);

      if (result.twoFactorRequired) {
        // 2FA challenge — show OTP input inline instead of navigating away.
        setTwoFactorEmail(values.email);
        toast.info("A verification code has been sent to your email.");
        return;
      }

      // Full login: user is in Zustand store, cookies set by backend.
      const user = result.user;
      if (user?.role === "ORGANIZER") {
        router.push(ROUTES.home); // organiser dashboard (TBD)
      } else {
        router.push(ROUTES.dashboardUser);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to complete sign in.";
      toast.error(message);
    }
  }

  // If 2FA required, render 2FA inline form
  if (twoFactorEmail) {
    return (
      <TwoFactorForm
        email={twoFactorEmail}
        onBack={() => setTwoFactorEmail(null)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        <p className="text-xs text-red-600">{formState.errors.email?.message}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
        <p className="text-xs text-red-600">{formState.errors.password?.message}</p>
      </div>
      <Button type="submit" disabled={loginMutation.isPending} className="w-full">
        {loginMutation.isPending ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-center text-xs text-gray-600">
        <Link href={ROUTES.forgotPassword} className="hover:text-blue-600">
          Forgot password?
        </Link>{" "}
        ·{" "}
        <Link href={ROUTES.signup} className="hover:text-blue-600">
          Sign up
        </Link>
      </p>
    </form>
  );
}

// ── Inline 2FA sub-form ────────────────────────────────────────────────────────

function TwoFactorForm({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const { loginTwoFactorMutation } = useAuth();
  const [code, setCode] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await loginTwoFactorMutation.mutateAsync({ email, code });
      if (result.user.role === "ORGANIZER") {
        router.push(ROUTES.home);
      } else {
        router.push(ROUTES.dashboardUser);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid verification code.";
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">
        Enter the 6-digit code sent to <strong>{email}</strong>.
      </p>
      <div className="space-y-1">
        <Label htmlFor="2fa-code">Verification Code</Label>
        <Input
          id="2fa-code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      <Button
        type="submit"
        disabled={code.length !== 6 || loginTwoFactorMutation.isPending}
        className="w-full"
      >
        {loginTwoFactorMutation.isPending ? "Verifying..." : "Verify"}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-xs text-gray-500 hover:text-gray-700"
      >
        ← Back to login
      </button>
    </form>
  );
}
