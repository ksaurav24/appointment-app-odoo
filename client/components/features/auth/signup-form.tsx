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
  const { signupMutation } = useAuth();
  const { register, handleSubmit, formState, reset } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(values: SignupFormValues) {
    try {
      const result = await signupMutation.mutateAsync(values);
      toast.success(result.message);
      reset();
      const emailQuery = encodeURIComponent(values.email);
      router.push(`${ROUTES.otpVerification}?email=${emailQuery}&flow=signup`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to complete signup.";
      toast.error(message);
    }
  }

  function onInvalidSubmit() {
    toast.error("Please fix form errors.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" type="text" {...register("name")} />
        <p className="text-xs text-red-600">{formState.errors.name?.message}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        <p className="text-xs text-red-600">{formState.errors.email?.message}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} />
        <p className="text-xs text-red-600">{formState.errors.password?.message}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirmPassword">Re-enter Password</Label>
        <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
        <p className="text-xs text-red-600">{formState.errors.confirmPassword?.message}</p>
      </div>
      <Button type="submit" disabled={signupMutation.isPending} className="w-full">
        {signupMutation.isPending ? "Creating..." : "Sign up"}
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
