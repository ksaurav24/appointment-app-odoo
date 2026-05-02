import type { Metadata } from "next";
import { OrgDetailsForm } from "@/components/features/organization/org-details-form";
import { OnboardingStepper } from "@/components/shared/onboarding-stepper";

export const metadata: Metadata = {
  title: "Organisation Details \u2014 Appointment App",
  description: "Add your organisation contact info, timezone, and logo.",
};

export default function OnboardingDetailsPage() {
  return (
    <section className="mx-auto w-full max-w-lg">
      {/* Stepper shows Step 2 active, Step 1 complete */}
      <OnboardingStepper currentStep={2} />

      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <header className="mb-6 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Step 2 of 3
          </p>
          <h1 className="text-2xl font-semibold leading-none text-gray-900">
            Tell us about your organisation
          </h1>
          <p className="text-sm leading-relaxed text-gray-500">
            Help your customers understand who you are. Add a description,
            contact details, your timezone, and optionally a logo.
          </p>
        </header>

        <OrgDetailsForm />
      </div>
    </section>
  );
}
