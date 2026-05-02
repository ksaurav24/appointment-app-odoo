import type { ReactNode } from "react";
import {
  Analytics01Icon,
  Building01Icon,
  Calendar01Icon,
  DashboardSquare02Icon,
  Note01Icon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons";

import {
  DashboardShell,
  type NavItem,
} from "@/components/dashboard/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: DashboardSquare02Icon },
  { href: "/admin/organizations", label: "Organizations", icon: Building01Icon },
  { href: "/admin/users", label: "Users", icon: UserMultiple02Icon },
  { href: "/admin/appointments", label: "Appointments", icon: Calendar01Icon },
  { href: "/admin/analytics", label: "Analytics", icon: Analytics01Icon },
  { href: "/admin/audit-logs", label: "Audit logs", icon: Note01Icon },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell brand="Admin console" role="ADMIN" nav={NAV}>
      {children}
    </DashboardShell>
  );
}
