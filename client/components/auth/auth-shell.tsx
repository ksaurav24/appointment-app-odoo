"use client";

import Link from "next/link";
import { type ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-svh">
      {/* Left decorative panel — desktop only */}
      <div className="hidden lg:flex lg:w-[460px] lg:shrink-0 flex-col justify-between bg-forest px-12 py-10">
        <Link href="/" className="font-heading text-2xl text-white tracking-tight">
          Appointly
        </Link>
        <div className="space-y-5">
          <p className="font-heading text-4xl leading-tight text-white">
            Your time,<br />your way.
          </p>
          <p className="text-sm text-white/60 leading-relaxed max-w-[280px]">
            Schedule smarter — real-time slot locking, instant confirmations, and beautiful calendar management for every business.
          </p>
          <div className="space-y-3 pt-4">
            {[
              "✓ No double-bookings, ever",
              "✓ Advance payments via Razorpay",
              "✓ Smart email notifications",
            ].map((item) => (
              <p key={item} className="text-xs text-white/50">{item}</p>
            ))}
          </div>
        </div>
        <p className="text-xs text-white/25">© 2025 Appointly. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col bg-background">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-border px-6 py-4 lg:hidden">
          <Link href="/" className="font-heading text-xl tracking-tight text-foreground">
            Appointly
          </Link>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Back to home
          </Link>
        </header>

        {/* Desktop back link */}
        <div className="hidden lg:flex items-center justify-end px-8 pt-6">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back to home
          </Link>
        </div>

        <main className="flex flex-1 items-start justify-center overflow-y-auto px-6 pb-16 pt-10 sm:items-start sm:pt-8">
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-1.5">
              <h1 className="font-heading text-2xl tracking-tight text-foreground">{title}</h1>
              {description ? (
                <p className="text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>

            <div className="space-y-4">{children}</div>

            {footer ? (
              <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
