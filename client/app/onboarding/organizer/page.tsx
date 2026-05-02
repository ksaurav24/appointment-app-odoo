import { Suspense } from "react";

import { OrganizerWizard } from "@/components/onboarding/organizer-wizard";

export default function OrganizerOnboardingPage() {
  return (
    <Suspense>
      <OrganizerWizard />
    </Suspense>
  );
}
