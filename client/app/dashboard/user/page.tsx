import type { Metadata } from "next";
import { UserWelcomeBanner } from "@/components/features/dashboard/user-welcome-banner";
import { UserQuickActions } from "@/components/features/dashboard/user-quick-actions";
import { UserAccountInfo } from "@/components/features/dashboard/user-account-info";

// Page metadata — server component handles this correctly at build time.
export const metadata: Metadata = {
  title: "Dashboard — Appointment App",
  description: "Manage your bookings and discover new appointments.",
};

// This page is a SERVER component — it just assembles the layout.
// The three feature components that need client state are individually
// marked "use client", so only they ship client-side JS, not the whole page.
export default function UserDashboardPage() {
  return (
    // space-y-6 creates consistent vertical rhythm between all 3 sections.
    <div className="space-y-6">
      {/* Step 1 of layout: personalized greeting */}
      <UserWelcomeBanner />

      {/* Step 2: 3 quick-action navigation cards */}
      <UserQuickActions />

      {/* Step 3: account info + upgrade CTA */}
      <UserAccountInfo />
    </div>
  );
}
