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
      <div className="flex min-h-svh items-center justify-center">
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
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border/60 px-4 py-6 md:flex">
        <Link
          href="/"
          className="px-2 font-heading text-base font-semibold tracking-tight"
        >
          appointly
        </Link>
        <p className="mt-1 px-2 text-xs uppercase tracking-wide text-muted-foreground">
          {brand}
        </p>

        <nav className="mt-8 flex flex-col gap-1">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <HugeiconsIcon icon={item.icon} className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 border-t border-border/60 pt-4">
          <div className="px-2 text-xs">
            <p className="truncate font-medium text-foreground">
              {user.fullName}
            </p>
            <p className="truncate text-muted-foreground">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={onLogout}
            disabled={logout.isPending}
          >
            {logout.isPending ? (
              <Spinner className="size-4" />
            ) : (
              <HugeiconsIcon icon={Logout02Icon} className="size-4" />
            )}
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex h-svh min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3 md:hidden">
          <Link
            href="/"
            className="font-heading text-base font-semibold tracking-tight"
          >
            appointly
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

        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/60 px-4 py-2 md:hidden">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs",
                  active
                    ? "bg-accent text-accent-foreground"
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
