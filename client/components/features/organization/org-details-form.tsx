"use client";

// Step 2 of organiser onboarding: organisation profile details + logo upload.
//
// This component reads the Step-1 draft (name + slug) from Zustand.
// If that data is missing (e.g. user typed this URL directly), we redirect
// them back to step 1. This protects the flow from being entered mid-way.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ROUTES, TIMEZONES } from "@/constants";
import { useOrganization } from "@/hooks/useOrganization";
import { orgDetailsSchema } from "@/lib/validations";
import { useAppStore } from "@/store/useAppStore";
import type { OrgDetailsFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OrgDetailsForm() {
  const router = useRouter();
  const { createOrgMutation } = useOrganization();

  const orgDraft = useAppStore((state) => state.orgDraft);
  const clearOrgDraft = useAppStore((state) => state.clearOrgDraft);

  // Logo preview \u2014 local state only. File objects are not serializable,
  // so they must not live in RHF state or Zustand. We manage preview separately.
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, formState } =
    useForm<OrgDetailsFormValues>({
      resolver: zodResolver(orgDetailsSchema),
      defaultValues: {
        description: "",
        contactPhone: "",
        address: "",
        timezone: "",
        logoFile: null,
      },
    });

  // Guard: redirect to step 1 if the user landed here without completing step 1.
  // WHY useEffect (not inline): calling router.replace() during render is a React
  // violation — side effects must live in useEffect, not the render body.
  useEffect(() => {
    if (!orgDraft) {
      router.replace(ROUTES.onboardingSetup);
    }
  }, [orgDraft, router]);

  // Render nothing while the redirect is in flight.
  if (!orgDraft) return null;

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    // Manually register the file into RHF.
    // <input type="file"> is write-once in the DOM \u2014 can't be controlled via register().
    setValue("logoFile", file, { shouldValidate: true });

    if (file) {
      // createObjectURL gives instant preview without uploading anything.
      // The URL is local to the browser tab and costs no network.
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview(null);
    }
  }

  async function onSubmit(values: OrgDetailsFormValues) {
    // TypeScript can't carry the render-time null check into this closure,
    // so we guard again here. In practice the render guard above prevents
    // this function from ever being called when orgDraft is null.
    if (!orgDraft) return;

    try {
      // Merge step-1 draft + step-2 values into the full org payload.
      await createOrgMutation.mutateAsync({
        name: orgDraft.name,
        slug: orgDraft.slug,
        description: values.description,
        contactPhone: values.contactPhone,
        address: values.address,
        timezone: values.timezone,
        logoFile: values.logoFile ?? null,
      });

      clearOrgDraft(); // draft no longer needed after successful submission
      toast.success("Organisation submitted for approval.");
      router.push(ROUTES.onboardingSubmitted);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not submit. Please try again.";
      toast.error(message);
    }
  }

  function onInvalidSubmit() {
    toast.error("Please fix the errors before submitting.");
  }

  function handleRemoveLogo() {
    setValue("logoFile", null, { shouldValidate: false });
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const isPending = createOrgMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
      className="space-y-5"
    >
      {/* Description \u2014 textarea for multi-line text */}
      <div className="space-y-1.5">
        <Label htmlFor="description">About Your Organisation</Label>
        <textarea
          id="description"
          rows={4}
          placeholder="Tell attendees what your organisation does, who it serves, and what makes it unique. Be specific and welcoming..."
          className="w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          {...register("description")}
        />
        {formState.errors.description && (
          <p className="text-xs text-red-600">
            {formState.errors.description.message}
          </p>
        )}
        <p className="text-xs text-gray-400">Minimum 20 characters, max 500.</p>
      </div>

      {/* Contact Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="contactPhone">Contact Phone</Label>
        <Input
          id="contactPhone"
          type="tel"
          placeholder="+91 98765 43210"
          {...register("contactPhone")}
        />
        {formState.errors.contactPhone && (
          <p className="text-xs text-red-600">
            {formState.errors.contactPhone.message}
          </p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          type="text"
          placeholder="123 Main Street, Mumbai, India"
          {...register("address")}
        />
        {formState.errors.address && (
          <p className="text-xs text-red-600">
            {formState.errors.address.message}
          </p>
        )}
      </div>

      {/* Timezone \u2014 native <select> is accessible with no extra library */}
      <div className="space-y-1.5">
        <Label htmlFor="timezone">Timezone</Label>
        <select
          id="timezone"
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          defaultValue=""
          {...register("timezone")}
        >
          <option value="" disabled>
            Select your timezone...
          </option>
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        {formState.errors.timezone && (
          <p className="text-xs text-red-600">
            {formState.errors.timezone.message}
          </p>
        )}
      </div>

      {/* Logo Upload \u2014 styled drop zone, hidden native file input */}
      <div className="space-y-1.5">
        <Label>Organisation Logo</Label>
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6 transition-colors hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoPreview}
              alt="Logo preview"
              className="h-20 w-20 rounded-lg object-cover"
            />
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">
                Click to upload logo
              </p>
              <p className="text-xs text-gray-400">PNG, JPG, WebP · Max 2 MB</p>
            </>
          )}
        </div>

        {/* Hidden real file input \u2014 triggered by the styled div above */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleLogoChange}
          aria-label="Upload organisation logo"
        />
        {formState.errors.logoFile && (
          <p className="text-xs text-red-600">
            {String(formState.errors.logoFile.message)}
          </p>
        )}
        {logoPreview && (
          <button
            type="button"
            onClick={handleRemoveLogo}
            className="text-xs text-red-500 hover:underline"
          >
            Remove logo
          </button>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Submitting..." : "Send for Approval"}
      </Button>
    </form>
  );
}
