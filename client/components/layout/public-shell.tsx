"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";

type PublicShellProps = {
  children: ReactNode;
  showBrowseLink?: boolean;
};

export function PublicShell({ children, showBrowseLink = true }: PublicShellProps) {
  const { data: user, isPending } = useCurrentUser();
  const logout = useLogout();

  const onLogout = () => {
    logout.mutate(undefined, {
      onSuccess: (res) => toast.success(res.message),
    });
  };

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Link
          href="/"
          className="font-heading text-xl tracking-tight text-foreground"
        >
          Appointly
        </Link>

        <nav className="flex items-center gap-2">
          {showBrowseLink ? (
            <Button variant="ghost" size="sm" render={<Link href="/browse" />}>
              Browse
            </Button>
          ) : null}
          <ThemeToggle />

          {isPending ? (
            <Spinner className="size-4" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                {user.fullName}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/bookings" />}>
                    My bookings
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/account" />}>
                    Account settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} disabled={logout.isPending}>
                  {logout.isPending ? <Spinner className="mr-2 size-4" /> : null}
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" render={<Link href="/login" />}>
                Sign in
              </Button>
              <Button size="sm" render={<Link href="/signup" />}>
                Get started
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="border-t border-border bg-slate-pale px-6 py-10">
        <div className="mx-auto max-w-6xl flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-heading text-base text-foreground">Appointly</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Book smarter. Grow faster.
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/browse" className="hover:text-foreground transition-colors">
              Browse
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign in
            </Link>
            <span>© 2025 Appointly</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
