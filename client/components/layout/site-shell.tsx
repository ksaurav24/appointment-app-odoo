"use client";

import { usePathname } from "next/navigation";
import { ROUTES } from "@/constants";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

interface SiteShellProps {
  children: React.ReactNode;
}

export function SiteShell({ children }: SiteShellProps) {
  const pathname = usePathname();
  // Normalize trailing slash so /signup and /signup/ are treated the same.
  const normalizedPath =
    pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  // Auth-focused pages intentionally hide the footer to reduce visual noise.
  const shouldHideFooter =
    normalizedPath === ROUTES.login ||
    normalizedPath === ROUTES.signup ||
    normalizedPath === ROUTES.forgotPassword ||
    normalizedPath === ROUTES.signupRole;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      {!shouldHideFooter && <SiteFooter />}
    </div>
  );
}
