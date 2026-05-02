"use client";

// Role selection screen — shown after the user fills the signup form.
//
// This is where the backend registration actually happens:
//
//   CUSTOMER selected:
//     1. Read savedcredentials from Zustand (set by /signup form)
//     2. Call POST /auth/register (no org data) → backend sets role=CUSTOMER
//     3. Clear credentials from store (security hygiene)
//     4. Redirect to /otp-verification?email=...&flow=signup&role=customer
//
//   ORGANIZER selected:
//     1. Save role to Zustand (backend call is deferred to end of onboarding)
//     2. Redirect to /onboarding/setup (3-step org form)
//     3. At the end of step 2 (OrgDetailsForm), POST /auth/register WITH org data
//     4. Then redirect to /otp-verification?email=...&flow=signup&role=organiser
//
// WHY defer organizer registration: the backend's register() accepts the org
// object in the same atomic call. We need name+slug+description etc. to build
// that object, so we must collect them first before hitting the API.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";

export function SignupRoleSelection() {
  const router = useRouter();
  const [loading, setLoading] = useState<"customer" | "organiser" | null>(null);

  const { registerCustomerMutation } = useAuth();

  const signupCredentials = useAppStore((s) => s.signupCredentials);
  const clearSignupCredentials = useAppStore((s) => s.clearSignupCredentials);
  const setRole = useAppStore((s) => s.setRole);

  // Guard: if the user lands here directly (no credentials in store),
  // send them back to /signup so they fill in their details first.
  const hasCreds = !!signupCredentials;

  async function handleCustomer() {
    if (!signupCredentials) {
      toast.error("Session expired. Please start signup again.");
      router.push(ROUTES.signup);
      return;
    }

    setLoading("customer");
    try {
      await registerCustomerMutation.mutateAsync(signupCredentials);

      // Clean up credentials immediately after successful registration.
      clearSignupCredentials();
      setRole("customer");

      const emailQuery = encodeURIComponent(signupCredentials.email);
      toast.success("Account created! Check your email for the verification code.");
      router.push(
        `${ROUTES.otpVerification}?email=${emailQuery}&flow=signup&role=customer`,
      );
    } catch (error) {
      setLoading(null);
      const message =
        error instanceof Error ? error.message : "Registration failed. Try again.";
      toast.error(message);
    }
  }

  function handleOrganiser() {
    if (!signupCredentials) {
      toast.error("Session expired. Please start signup again.");
      router.push(ROUTES.signup);
      return;
    }

    // Don't call the backend yet — credentials stay in the store.
    // The OrgDetailsForm (step 2 of onboarding) will call registerOrgUser().
    setLoading("organiser");
    setRole("organiser");
    router.push(ROUTES.onboardingSetup);
  }

  return (
    <div className="space-y-4">
      {!hasCreds && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-center text-xs text-amber-700">
          It looks like you navigated here directly. Please{" "}
          <a href={ROUTES.signup} className="font-medium underline">
            start from the signup page
          </a>
          .
        </p>
      )}

      {/* Customer card */}
      <button
        type="button"
        onClick={handleCustomer}
        disabled={!hasCreds || loading !== null}
        className="group w-full rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-blue-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {loading === "customer" ? "Creating account..." : "Sign up as Customer"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Discover and book appointments with service providers near you.
            </p>
          </div>
        </div>
      </button>

      {/* Organiser card */}
      <button
        type="button"
        onClick={handleOrganiser}
        disabled={!hasCreds || loading !== null}
        className="group w-full rounded-xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-blue-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600 transition-colors group-hover:bg-violet-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {loading === "organiser" ? "Going to onboarding..." : "Sign up as Organiser"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Register your organisation and start accepting appointments. Subject to admin approval.
            </p>
          </div>
        </div>
      </button>

      <p className="text-center text-xs text-gray-400">
        Not sure?{" "}
        <a href={ROUTES.signup} className="hover:text-blue-600">
          Go back
        </a>
      </p>
    </div>
  );
}
