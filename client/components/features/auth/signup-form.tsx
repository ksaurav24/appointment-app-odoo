"use client";

// Signup form — collects name, email, password.
//
// IMPORTANT: This form does NOT call the backend.
// Why? Because the backend's POST /auth/register requires knowing the role
// (customer = no org, organizer = with org object). The user picks their role
// on the NEXT screen (/signup-role), so we save the credentials to sessionStorage
// via Zustand and send them only when the role is known.
//
// Flow:
//   /signup → (save credentials to store) → /signup-role
//     → CUSTOMER: POST /auth/register  → /otp-verification → login → dashboard
//     → ORGANIZER: /onboarding/setup → (3 steps) → POST /auth/register with org → /otp-verification

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ROUTES } from "@/constants";
import { signupSchema } from "@/lib/validations";
import { useAppStore } from "@/store/useAppStore";
import type { SignupFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const setSignupCredentials = useAppStore((s) => s.setSignupCredentials);

  const { register, handleSubmit, formState } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  function onSubmit(values: SignupFormValues) {
    // Save credentials to sessionStorage-backed Zustand so /signup-role can use them.
    setSignupCredentials({
      fullName: values.fullName,
      email: values.email,
      password: values.password,
    });
    toast.success("Details saved! Now choose your role.");
    router.push(ROUTES.signupRole);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          type="text"
          autoComplete="name"
          placeholder="John Doe"
          {...register("fullName")}
        />
        <p className="text-xs text-red-600">{formState.errors.fullName?.message}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="john@example.com"
          {...register("email")}
        />
        <p className="text-xs text-red-600">{formState.errors.email?.message}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
        <p className="text-xs text-red-600">{formState.errors.password?.message}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirmPassword">Re-enter Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        <p className="text-xs text-red-600">
          {formState.errors.confirmPassword?.message}
        </p>
      </div>
      <Button type="submit" className="w-full">
        Continue →
      </Button>
      <p className="text-center text-xs text-gray-600">
        Already have an account?{" "}
        <Link href={ROUTES.login} className="hover:text-blue-600">
          Sign in
        </Link>
      </p>
    </form>
  );
}
