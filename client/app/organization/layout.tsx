import type { ReactNode } from "react";
import {
  Analytics01Icon,
  Briefcase01Icon,
  Calendar01Icon,
  DashboardSquare02Icon,
  Settings01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import {
  DashboardShell,
  type NavItem,
} from "@/components/dashboard/dashboard-shell";
import { OrgApprovalBanner } from "@/components/organization/org-approval-banner";

const NAV: NavItem[] = [
  {
    href: "/organization/dashboard",
    label: "Dashboard",
    icon: DashboardSquare02Icon,
  },
  {
    href: "/organization/appointments",
    label: "Appointments",
    icon: Calendar01Icon,
  },
  {
    href: "/organization/appointment-types",
    label: "Appointment types",
    icon: Briefcase01Icon,
  },
  { href: "/organization/inventory", label: "Inventory", icon: UserGroupIcon },
  { href: "/organization/analytics", label: "Analytics", icon: Analytics01Icon },
  { href: "/organization/settings", label: "Settings", icon: Settings01Icon },
];

export default function OrganizationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DashboardShell brand="Organizer" role="ORGANIZER" nav={NAV}>
      <OrgApprovalBanner />
      {children}
    </DashboardShell>
  );
}
