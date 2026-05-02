import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/constants";
import { OnboardingStepper } from "@/components/shared/onboarding-stepper";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Submitted for Approval \u2014 Appointment App",
  description: "Your organisation details have been sent for admin review.",
};

// Step 3 is a static confirmation screen \u2014 no form, no state, no client JS.
// Pure server component. The stepper shows currentStep=3 which means
// steps 1 and 2 show green ticks (isDone) and step 3 shows blue (isActive).
export default function OnboardingSubmittedPage() {
  return (
    <section className="mx-auto w-full max-w-lg">
      {/* Step 3 active \u2014 all steps visible in the stepper */}
      <OnboardingStepper currentStep={3} />

      <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">

        {/* Done icon \u2014 inline SVG so no image dependency or loading flash */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-10 w-10 text-green-500"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>

        <p className="text-xs font-medium uppercase tracking-wide text-green-600">
          Step 3 of 3 \u2014 Complete
        </p>

        <h1 className="mt-2 text-2xl font-semibold leading-tight text-gray-900">
          You&apos;re all set!
        </h1>

        <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
          Your organisation details have been sent for approval. Our team will
          review your submission and get back to you shortly on your registered
          email.
        </p>

        <p className="mt-2 text-xs text-gray-400">
          Approval usually takes 1&ndash;2 business days.
        </p>

        <Button asChild className="mt-8 w-full">
          <Link href={ROUTES.home}>Go to Homepage</Link>
        </Button>
      </div>
    </section>
  );
}
