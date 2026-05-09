"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const value = localStorage.getItem("bookease:organizer-logo-url");
    if (value) setLogoUrl(value);
  }, []);

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-cream2 px-6 py-5">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-lg tracking-tight text-foreground"
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Organization logo"
              className="size-7 rounded-md border border-border/70 object-cover"
            />
          ) : null}
          BookEase
        </Link>
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to home
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="font-heading text-2xl tracking-tight text-foreground">
              {title}
            </h1>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>

          <div className="space-y-4">{children}</div>

          {footer ? (
            <div className="border-t border-cream2 pt-4 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
