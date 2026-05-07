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
      <header className="flex items-center justify-between border-b border-cream2 px-6 py-5">
        <Link
          href="/"
          className="font-heading text-lg tracking-tight text-foreground"
        >
          BookEase
        </Link>

        <nav className="flex items-center gap-3">
          {showBrowseLink ? (
            <Button variant="ghost" size="sm" render={<Link href="/browse" />}>
              Browse services
            </Button>
          ) : null}

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

      <footer className="border-t border-cream2 px-6 py-6 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>© BookEase</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/browse" className="hover:text-foreground transition-colors">
              Browse
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
