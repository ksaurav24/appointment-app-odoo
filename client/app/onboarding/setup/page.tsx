import type { Metadata } from "next";
import { OrgSetupForm } from "@/components/features/organization/org-setup-form";
import { OnboardingStepper } from "@/components/shared/onboarding-stepper";

// Page metadata \u2014 required so the browser tab doesn't say "Create Next App".
export const metadata: Metadata = {
  title: "Setup Organisation \u2014 Appointment App",
  description: "Create your organisation name and URL slug to get started.",
};

// This page is a SERVER component \u2014 it just handles layout and metadata.
// The interactive form lives in OrgSetupForm (client component).
// WHY this split: Next.js can extract metadata from server components only.
// If the page were client-side, metadata wouldn't work at build time.
export default function OnboardingSetupPage() {
  return (
    <section className="mx-auto w-full max-w-lg">
      {/* Stepper shows Step 1 active */}
      <OnboardingStepper currentStep={1} />

      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <header className="mb-6 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Step 1 of 3
          </p>
          <h1 className="text-2xl font-semibold leading-none text-gray-900">
            Set up your organisation
          </h1>
          <p className="text-sm leading-relaxed text-gray-500">
            Choose a name for your organisation and a unique URL slug. The slug
            is auto-generated from the name but you can edit it.
          </p>
        </header>

        <OrgSetupForm />
      </div>
    </section>
  );
}
