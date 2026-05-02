"use client";

// Step 2 of organiser onboarding: organisation profile details + logo upload.
//
// THIS IS WHERE THE BACKEND REGISTRATION HAPPENS FOR ORGANIZERS.
//
// Flow:
//   1. User filled signup form (/signup) → credentials saved in Zustand
//   2. User chose "Organiser" on /signup-role → name+slug saved in Zustand (orgDraft)
//   3. THIS form collects description, phone, address, timezone, logo
//   4. On submit: calls POST /auth/register WITH organization data
//      → Backend atomically creates User (role=ORGANIZER) + Organization (status=PENDING)
//      → OTP email sent to user's email
//   5. Redirects to /otp-verification?email=...&flow=signup&role=organiser
//   6. After OTP verify: user directed to /onboarding/submitted
//
// WHY registration happens here (not at role selection):
//   The backend RegisterOrganizationDto requires name, slug, contactEmail,
//   and optionally description/phone/address/timezone. We need ALL of step 1 + step 2
//   data to build this payload, so the API call must wait until both steps are done.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ROUTES, TIMEZONES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { orgDetailsSchema } from "@/lib/validations";
import { useAppStore } from "@/store/useAppStore";
import type { OrgDetailsFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OrgDetailsForm() {
  const router = useRouter();
  const { registerOrgMutation } = useAuth();

  const orgDraft = useAppStore((state) => state.orgDraft);
  const signupCredentials = useAppStore((state) => state.signupCredentials);
  const clearOrgDraft = useAppStore((state) => state.clearOrgDraft);
  const clearSignupCredentials = useAppStore((state) => state.clearSignupCredentials);

  // Logo preview — local state only. File objects are not serializable,
  // so they must not live in Zustand. We manage preview separately.
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

  // Guard: redirect if step-1 data is missing (user navigated here directly).
  useEffect(() => {
    if (!orgDraft) {
      router.replace(ROUTES.onboardingSetup);
    } else if (!signupCredentials) {
      // Credentials expired (e.g. browser was restarted mid-flow)
      toast.error("Session expired. Please start signup again.");
      router.replace(ROUTES.signup);
    }
  }, [orgDraft, signupCredentials, router]);

  if (!orgDraft || !signupCredentials) return null;

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setValue("logoFile", file, { shouldValidate: true });
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview(null);
    }
  }

  async function onSubmit(values: OrgDetailsFormValues) {
    if (!orgDraft || !signupCredentials) return;

    try {
      // Single atomic call: creates User (ORGANIZER) + Organization (PENDING) together.
      // Logo is NOT sent here — it can be uploaded later from the org dashboard.
      // (Backend RegisterOrganizationDto doesn't accept a file; that's a separate upload.)
      await registerOrgMutation.mutateAsync({
        user: signupCredentials,
        org: {
          name: orgDraft.name,
          slug: orgDraft.slug,
          description: values.description,
          contactPhone: values.contactPhone,
          address: values.address,
          timezone: values.timezone,
        },
      });

      // Clean up store — credentials and org draft no longer needed.
      clearSignupCredentials();
      clearOrgDraft();

      toast.success("Organisation submitted! Check your email to verify your account.");

      // Redirect to OTP page. After verification → /onboarding/submitted.
      const emailQuery = encodeURIComponent(signupCredentials.email);
      router.push(
        `${ROUTES.otpVerification}?email=${emailQuery}&flow=signup&role=organiser`,
      );
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

  const isPending = registerOrgMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
      className="space-y-5"
    >
      {/* Description — textarea for multi-line text */}
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

      {/* Timezone — native <select> is accessible with no extra library */}
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

      {/* Logo Upload — styled drop zone, hidden native file input */}
      <div className="space-y-1.5">
        <Label>
          Organisation Logo{" "}
          <span className="text-xs font-normal text-gray-400">(optional — can add later)</span>
        </Label>
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

        {/* Hidden real file input — triggered by the styled div above */}
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
        {isPending ? "Submitting..." : "Submit for Approval →"}
      </Button>
    </form>
  );
}
