import { AccountSection } from "@/components/organization/settings/account-section";
import { OrgProfileReadonly } from "@/components/organization/settings/org-profile-readonly";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Account, security, and organization profile.
        </p>
      </header>
      <OrgProfileReadonly />
      <AccountSection />
    </div>
  );
}
