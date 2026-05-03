"use client";

import { LandingCta } from "@/components/landing/landing-cta";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingServicesPreview } from "@/components/landing/landing-services-preview";
import { PublicShell } from "@/components/layout/public-shell";
import { useCurrentUser } from "@/hooks/useAuth";

export function HomeContent() {
  const { data: user } = useCurrentUser();

  return (
    <PublicShell showBrowseLink={false}>
      <LandingHero user={user ?? null} />
      <LandingServicesPreview />
      <LandingFeatures />
      <LandingHowItWorks />
      {!user ? <LandingCta /> : null}
    </PublicShell>
  );
}
