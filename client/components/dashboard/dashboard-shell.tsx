"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logout02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import type { Role } from "@/types";

export type NavItem = {
  href: string;
  label: string;
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
};

type DashboardShellProps = {
  brand: string;
  role: Role;
  nav: NavItem[];
  children: ReactNode;
};

export function DashboardShell({
  brand,
  role,
  nav,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isPending } = useCurrentUser();
  const logout = useLogout();

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== role) {
      router.replace("/");
    }
  }, [user, isPending, role, router]);

  if (isPending || !user || user.role !== role) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-cream">
        <Spinner className="size-5" />
      </div>
    );
  }

  const onLogout = () => {
    logout.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(res.message);
        router.replace("/login");
      },
    });
  };

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {/* Forest green sidebar — design system spec */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col bg-forest px-4 py-6 md:flex">
        <Link
          href="/"
          className="px-2 font-heading text-lg text-white"
        >
          BookEase
        </Link>
        <p className="mt-1 px-2 text-[11px] uppercase tracking-wide text-white/50">
          {brand}
        </p>

        <nav className="mt-8 flex flex-col gap-0.5">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                  active
                    ? "bg-white/12 text-white"
                    : "text-white/65 hover:bg-white/12 hover:text-white",
                )}
              >
                <HugeiconsIcon icon={item.icon} className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 border-t border-white/12 pt-4">
          <div className="px-2 text-xs">
            <p className="truncate font-medium text-white">
              {user.fullName}
            </p>
            <p className="truncate text-white/50">{user.email}</p>
          </div>
          <button
            onClick={onLogout}
            disabled={logout.isPending}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-white/65 transition-colors hover:bg-white/12 hover:text-white disabled:opacity-50"
          >
            {logout.isPending ? (
              <Spinner className="size-4" />
            ) : (
              <HugeiconsIcon icon={Logout02Icon} className="size-4" />
            )}
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex h-svh min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex shrink-0 items-center justify-between border-b border-cream2 bg-white px-4 py-3 md:hidden">
          <Link
            href="/"
            className="font-heading text-base text-foreground"
          >
            BookEase
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            disabled={logout.isPending}
          >
            {logout.isPending ? <Spinner className="size-4" /> : null}
            Sign out
          </Button>
        </header>

        {/* Mobile nav */}
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-cream2 bg-white px-4 py-2 md:hidden">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs",
                  active
                    ? "bg-forest-pale text-forest"
                    : "text-muted-foreground",
                )}
              >
                <HugeiconsIcon icon={item.icon} className="size-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
