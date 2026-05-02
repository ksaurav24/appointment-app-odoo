"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const { register, handleSubmit, formState } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const result = await loginMutation.mutateAsync(values);
      toast.success(result.message);
      router.push(ROUTES.home);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to complete sign in.";
      toast.error(message);
    }
  }

  function onInvalidSubmit() {
    toast.error("Please fix form errors.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-4">
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
