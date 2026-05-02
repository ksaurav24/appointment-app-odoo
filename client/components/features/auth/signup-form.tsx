"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { signupSchema } from "@/lib/validations";
import type { SignupFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const { registerMutation } = useAuth();
  const { register, handleSubmit, formState, reset } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(values: SignupFormValues) {
    try {
      const result = await registerMutation.mutateAsync(values);
      toast.success(result.message);
      reset();
      // Pass email to OTP page so the user doesn't have to retype it.
      const emailQuery = encodeURIComponent(values.email);
      router.push(`${ROUTES.otpVerification}?email=${emailQuery}&flow=signup`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to complete signup.";
      toast.error(message);
    }
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
      <Button
        type="submit"
        disabled={registerMutation.isPending}
        className="w-full"
      >
        {registerMutation.isPending ? "Creating account..." : "Create Account"}
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
