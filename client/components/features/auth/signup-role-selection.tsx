"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROUTES } from "@/constants";
import { useAppStore } from "@/store/useAppStore";
import type { UserRole } from "@/types";
import { Button } from "@/components/ui/button";

export function SignupRoleSelection() {
  const router = useRouter();
  const setRole = useAppStore((state) => state.setRole);

  function handleRoleSelect(role: UserRole) {
    setRole(role);
    toast.success(`Signed up as ${role}.`);
    router.push(ROUTES.home);
  }

  function handleOrganiserSelect() {
    handleRoleSelect("organiser");
  }

  function handleCustomerSelect() {
    handleRoleSelect("customer");
  }

  return (
    <div className="space-y-4">
      <Button type="button" onClick={handleOrganiserSelect} className="w-full">
        Sign up as Organiser
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={handleCustomerSelect}
        className="w-full"
      >
        Sign up as Customer
      </Button>
    </div>
  );
}
