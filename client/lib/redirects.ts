import type { Role } from "@/types";

export function defaultRouteForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "ORGANIZER":
      return "/organization/dashboard";
    case "CUSTOMER":
    default:
      return "/";
  }
}
