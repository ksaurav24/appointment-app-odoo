"use client";

// Step 1 of organiser onboarding: choose organisation name + URL slug.
//
// WHY this is its own client component (not inline in the page):
// - The page (setup/page.tsx) is a server component for metadata/layout.
// - This form needs useState (via RHF) and useEffect for slug generation,
//   which require "use client". Splitting keeps the page server-only.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ROUTES } from "@/constants";
import { orgSetupSchema } from "@/lib/validations";
import { useAppStore } from "@/store/useAppStore";
import type { OrgSetupFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OrgSetupForm() {
  const router = useRouter();
  const setOrgDraft = useAppStore((state) => state.setOrgDraft);

  const { register, handleSubmit, watch, setValue, formState } =
    useForm<OrgSetupFormValues>({
      resolver: zodResolver(orgSetupSchema),
      defaultValues: { name: "", slug: "" },
    });

  const nameValue = watch("name");

  // Auto-generate a URL-safe slug from the typed name.
  // WHY watch + useEffect (not onChange): watch re-renders only on value change,
  // and useEffect avoids infinite loops from calling setValue inside a render.
  useEffect(() => {
    const generated = nameValue
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")  // remove special characters
      .replace(/\s+/g, "-")           // spaces become hyphens
      .replace(/-+/g, "-")            // collapse multiple hyphens
      .slice(0, 60);                  // enforce max length from schema
    // shouldValidate: false \u2014 don't show slug errors while user is still typing name
    setValue("slug", generated, { shouldValidate: false });
  }, [nameValue, setValue]);

  function onSubmit(values: OrgSetupFormValues) {
    // Save step-1 data to Zustand so step-2 can access it.
    // We use Zustand (not URL params) to keep org name off the address bar.
    setOrgDraft(values);
    router.push(ROUTES.onboardingDetails);
  }

  function onInvalidSubmit() {
    toast.error("Please fix the errors before continuing.");
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
      className="space-y-5"
    >
      {/* Organisation Name */}
      <div className="space-y-1.5">
        <Label htmlFor="org-name">Organisation Name</Label>
        <Input
          id="org-name"
          type="text"
          placeholder="e.g. Acme Health Clinic"
          {...register("name")}
        />
        {formState.errors.name && (
          <p className="text-xs text-red-600">{formState.errors.name.message}</p>
        )}
      </div>

      {/* Slug \u2014 auto-filled from name but fully editable */}
      <div className="space-y-1.5">
        <Label htmlFor="org-slug">
          URL Slug{" "}
          <span className="text-xs font-normal text-gray-400">
            (auto-generated, editable)
          </span>
        </Label>
        {/* Prefix shows the organiser what their public URL looks like */}
        <div className="flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <span className="select-none text-xs text-gray-400">app.com/</span>
          <input
            id="org-slug"
            type="text"
            className="flex-1 bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-300"
            placeholder="acme-health-clinic"
            {...register("slug")}
          />
        </div>
        {formState.errors.slug && (
          <p className="text-xs text-red-600">{formState.errors.slug.message}</p>
        )}
        <p className="text-xs text-gray-400">
          Lowercase letters, numbers, and hyphens only.
        </p>
      </div>

      <Button type="submit" className="w-full">
        Next &rarr;
      </Button>
    </form>
  );
}
