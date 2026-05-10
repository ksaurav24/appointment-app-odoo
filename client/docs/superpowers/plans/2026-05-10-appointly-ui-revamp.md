# Appointly UI Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand app from "BookEase" to "Appointly", create an impactful landing page, and fix all light-mode visibility issues across login, signup, dashboards, tables, and all sections.

**Architecture:** Three-layer approach:
1. CSS/Design-system tokens — fix light mode contrast ratios, borders, and visual separation in `globals.css`
2. Layout components — update `auth-shell.tsx`, `public-shell.tsx`, `dashboard-shell.tsx` with rebranding
3. Feature pages — rebuild landing page hero, upgrade table/list styles throughout the organizer dashboard

**Tech Stack:** Next.js (App Router), Tailwind CSS v4, DM Sans + DM Serif Display fonts, Shadcn UI

---

## Key Design Principles
- **Appointly brand**: Replace all "BookEase" text with "Appointly". The logo in auth pages and public header is always "Appointly" text (no org logo). The org logo only appears in the dashboard sidebar (already correct for ORGANIZER role).
- **Light mode contrast**: The current `--border: 35 20% 93%` is too light. Strengthen it to ~80% L for visible separation. Card backgrounds must be `white` not cream. Table rows need a visible divider.
- **Tables**: Add explicit `border-collapse`, `border-border` class on `<table>` and `<tr>`, stronger header row background, alternating row tint.
- **Keep theme/colors the same** — forest green (#1A3C34) primary, amber secondary, coral destructive.

---

### Task 1: Fix Design Tokens & CSS

**Files:**
- Modify: `F:\Appointment Booking App\appointment-app-odoo\client\app\globals.css`

- [ ] **Step 1: Strengthen border and input token for light mode**

Replace the `:root` block with stronger border contrast:
```css
/* Borders — was too light at 93%, now use 88% for visible separation */
--border: 35 15% 85%;           /* #DDD9CE — visibly distinct from white cards */
--input: 35 15% 85%;
```

- [ ] **Step 2: Make muted-foreground more readable**
```css
--muted-foreground: 45 5% 42%;  /* bumped from 34% to 42% */
```

- [ ] **Step 3: Add a global table style block** after the `@layer base` section:
```css
@layer base {
  table {
    @apply w-full border-collapse;
  }
  thead tr {
    @apply border-b-2 border-border bg-slate-pale;
  }
  thead th {
    @apply px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-mid;
  }
  tbody tr {
    @apply border-b border-border transition-colors;
  }
  tbody tr:hover {
    @apply bg-muted/40;
  }
  tbody td {
    @apply px-4 py-3 text-sm text-foreground;
  }
}
```

- [ ] **Step 4: Commit**
```bash
git add client/app/globals.css
git commit -m "style: strengthen light-mode borders and table contrast"
```

---

### Task 2: Rebrand to "Appointly" + Revamp Auth Shell

**Files:**
- Modify: `F:\Appointment Booking App\appointment-app-odoo\client\components\auth\auth-shell.tsx`

**Design goal:** Auth pages get a two-column layout on desktop — left panel has a full-height forest-green decorative panel with quotes/taglines, right has the form. On mobile, just the form with a centered logo.

- [ ] **Step 1: Rewrite `auth-shell.tsx` with split-panel design**

```tsx
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
      <div className="hidden lg:flex lg:w-[480px] lg:shrink-0 flex-col justify-between bg-forest px-12 py-10">
        <Link href="/" className="font-heading text-2xl text-white tracking-tight">
          Appointly
        </Link>
        <div className="space-y-4">
          <p className="font-heading text-4xl leading-tight text-white">
            Your time, your way.
          </p>
          <p className="text-sm text-white/60 leading-relaxed max-w-xs">
            Schedule smarter — with real-time slot locking, instant confirmations, and beautiful calendar management for every business.
          </p>
        </div>
        <p className="text-xs text-white/30">© 2025 Appointly</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-4 lg:hidden">
          <Link href="/" className="font-heading text-lg tracking-tight text-foreground">
            Appointly
          </Link>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Back to home
          </Link>
        </header>

        <div className="hidden lg:flex items-center justify-end px-8 pt-6">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Back to home
          </Link>
        </div>

        <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-8 sm:items-center sm:pt-0">
          <div className="w-full max-w-sm space-y-6">
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
```

- [ ] **Step 2: Commit**
```bash
git add client/components/auth/auth-shell.tsx
git commit -m "feat: rebrand to Appointly + split-panel auth layout"
```

---

### Task 3: Rebrand Public Shell

**Files:**
- Modify: `F:\Appointment Booking App\appointment-app-odoo\client\components\layout\public-shell.tsx`

- [ ] **Step 1: Replace "BookEase" with "Appointly" and upgrade header**

Replace the header `<Link>` text `BookEase` → `Appointly`.
Replace the footer copyright `© BookEase` → `© Appointly`.

Full updated header section:
```tsx
<header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur px-6 py-4 supports-backdrop-filter:bg-background/80">
  <Link
    href="/"
    className="font-heading text-xl tracking-tight text-foreground"
  >
    Appointly
  </Link>
  {/* nav stays the same */}
```

And update the footer:
```tsx
<footer className="border-t border-border bg-slate-pale px-6 py-8 text-xs text-muted-foreground">
  <div className="mx-auto max-w-6xl flex items-center justify-between">
    <div>
      <p className="font-heading text-sm text-foreground">Appointly</p>
      <p className="mt-0.5">Book smarter. Grow faster.</p>
    </div>
    <div className="flex items-center gap-6">
      <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
      <Link href="/browse" className="hover:text-foreground transition-colors">Browse</Link>
      <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
    </div>
  </div>
</footer>
```

- [ ] **Step 2: Commit**
```bash
git add client/components/layout/public-shell.tsx
git commit -m "feat: rebrand public shell to Appointly + sticky header"
```

---

### Task 4: Rebrand Dashboard Shell

**Files:**
- Modify: `F:\Appointment Booking App\appointment-app-odoo\client\components\dashboard\dashboard-shell.tsx`

- [ ] **Step 1: Replace "BookEase" with "Appointly" in sidebar and mobile header**

In the sidebar `<Link>` (line ~83–95), the text `BookEase` should become `Appointly`. The org logo still shows when `organizerLogoUrl` is set (correct behavior — only in dashboard, not public).

In the mobile header `<Link>` (line ~151–163), `BookEase` → `Appointly`.

- [ ] **Step 2: Add a subtle brand indicator with accent color on sidebar active items**

Current active item: `bg-white/12 text-white`
New active item: `bg-white/15 text-white font-medium border-l-2 border-amber`

```tsx
active
  ? "bg-white/15 text-white font-medium border-l-2 border-amber -ml-[2px] pl-[calc(0.625rem+2px)]"
  : "text-white/65 hover:bg-white/10 hover:text-white",
```

- [ ] **Step 3: Upgrade sidebar bottom section with better user card**

Replace the simple user info block with a proper card:
```tsx
<div className="mt-auto space-y-1 border-t border-white/10 pt-4">
  <div className="rounded-xl bg-white/5 px-3 py-2.5">
    <p className="text-[12px] font-semibold text-white leading-none">{user.fullName}</p>
    <p className="mt-0.5 truncate text-[11px] text-white/40">{user.email}</p>
  </div>
  <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5">
    <span className="text-[12px] text-white/50">Appearance</span>
    <ThemeToggle />
  </div>
  <button onClick={onLogout} ...>Sign out</button>
</div>
```

- [ ] **Step 4: Commit**
```bash
git add client/components/dashboard/dashboard-shell.tsx
git commit -m "feat: rebrand dashboard to Appointly + improve sidebar UX"
```

---

### Task 5: New Landing Page — Hero + Features + CTA

**Files:**
- Modify: `F:\Appointment Booking App\appointment-app-odoo\client\components\landing\landing-hero.tsx`
- Modify: `F:\Appointment Booking App\appointment-app-odoo\client\components\landing\landing-features.tsx`
- Modify: `F:\Appointment Booking App\appointment-app-odoo\client\components\landing\landing-cta.tsx`
- Modify: `F:\Appointment Booking App\appointment-app-odoo\client\components\landing\landing-how-it-works.tsx`

- [ ] **Step 1: Rewrite landing-hero.tsx with impactful design**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { SafeUser } from "@/types";

type LandingHeroProps = { user: SafeUser | null | undefined };

export function LandingHero({ user }: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:py-32">
      {/* Decorative background blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-forest-pale opacity-60 blur-3xl"
      />

      <div className="relative mx-auto max-w-4xl space-y-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-forest-pale px-4 py-1.5 text-xs font-medium text-forest">
          <span className="size-1.5 rounded-full bg-forest animate-pulse" />
          Smart appointment scheduling, simplified
        </div>

        <h1 className="font-heading text-5xl leading-[1.1] tracking-tight sm:text-6xl md:text-7xl">
          {user
            ? `Welcome back, ${user.fullName.split(" ")[0]}.`
            : (
              <>
                Book appointments,<br />
                <span className="text-forest">without the chaos.</span>
              </>
            )}
        </h1>

        <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {user
            ? "Browse services and book your next appointment in minutes."
            : "Appointly connects customers with service providers through a smooth, real-time booking experience. No calls. No back-and-forth."}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" className="h-12 px-8 text-base" render={<Link href="/browse" />}>
            Browse services
          </Button>
          {!user ? (
            <Button variant="outline" size="lg" className="h-12 px-8 text-base" render={<Link href="/signup" />}>
              Start for free
            </Button>
          ) : null}
        </div>

        {/* Social proof bar */}
        {!user ? (
          <p className="text-xs text-muted-foreground pt-2">
            Trusted by 500+ service providers · No credit card required
          </p>
        ) : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Rewrite landing-features.tsx with 6-feature grid**

```tsx
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar01Icon, CheckmarkCircle02Icon, TimeQuarterPassIcon,
  CreditCardIcon, Notification01Icon, UserGroupIcon,
} from "@hugeicons/core-free-icons";

const FEATURES = [
  { icon: Calendar01Icon, title: "Real-time availability", body: "See open slots the moment they're added — no double-bookings, no guessing." },
  { icon: CheckmarkCircle02Icon, title: "Instant confirmation", body: "Get a confirmation code and calendar invite the second you book." },
  { icon: TimeQuarterPassIcon, title: "Reschedule anytime", body: "Plans change — move or cancel your appointment within the policy window." },
  { icon: CreditCardIcon, title: "Advance payments", body: "Secure upfront payment via Razorpay to eliminate no-shows." },
  { icon: Notification01Icon, title: "Smart notifications", body: "Automated email reminders for customers and organizers." },
  { icon: UserGroupIcon, title: "Multi-staff support", body: "Assign bookings to specific staff or let the system do it automatically." },
];

export function LandingFeatures() {
  return (
    <section className="bg-slate-pale px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="font-heading text-4xl tracking-tight">Everything you need to grow.</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
            Whether you're booking a haircut or running a clinic, Appointly stays out of your way.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex size-10 items-center justify-center rounded-xl bg-forest-pale text-forest">
                <HugeiconsIcon icon={f.icon} className="size-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Rewrite landing-cta.tsx with bold dark panel**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingCta() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl rounded-3xl bg-forest px-8 py-16 text-center space-y-6">
        <h2 className="font-heading text-4xl text-white tracking-tight">
          Ready to simplify bookings?
        </h2>
        <p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed">
          Join thousands of service providers using Appointly to save time, reduce no-shows, and delight customers.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" className="h-12 px-8 bg-white text-forest hover:bg-white/90" render={<Link href="/signup" />}>
            Get started free
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 border-white/30 text-white hover:bg-white/10" render={<Link href="/browse" />}>
            Browse services
          </Button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Commit**
```bash
git add client/components/landing/
git commit -m "feat: revamp landing page with impactful hero + 6-feature grid + CTA"
```

---

### Task 6: Upgrade Organizer Tables and Cards (Appointments list)

**Files:**
- Modify: `F:\Appointment Booking App\appointment-app-odoo\client\components\organization\appointments\appointments-list.tsx`
- Modify: `F:\Appointment Booking App\appointment-app-odoo\client\components\organization\appointments\appointment-row.tsx` (if exists, else inline)

**Goal:** Table rows must have visible borders, proper column widths, and readable badge colors.

- [ ] **Step 1: Audit current appointments-list.tsx to understand table structure**

Read the file first. Then wrap the `<table>` in a `<div className="overflow-hidden rounded-xl border border-border">` container.

Table header should be:
```tsx
<thead>
  <tr className="border-b-2 border-border bg-muted">
    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">When</th>
    ...
  </tr>
</thead>
```

Table body rows:
```tsx
<tr className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
```

- [ ] **Step 2: Verify status badges are clearly readable in light mode**

Status badge classes should be:
- CONFIRMED: `bg-emerald-50 text-emerald-700 border border-emerald-200`
- PENDING: `bg-amber-50 text-amber-700 border border-amber-200`
- CANCELLED: `bg-red-50 text-red-700 border border-red-200`
- COMPLETED: `bg-blue-50 text-blue-700 border border-blue-200`
- NO_SHOW: `bg-slate-100 text-slate-600 border border-slate-200`

- [ ] **Step 3: Commit**
```bash
git add client/components/organization/appointments/
git commit -m "style: upgrade appointment table with visible borders and status badges"
```

---

### Task 7: Upgrade Org Dashboard Cards

**Files:**
- Modify: `F:\Appointment Booking App\appointment-app-odoo\client\app\organization\dashboard\page.tsx` (or the org dashboard component)

**Goal:** Stat cards should have a left border accent bar, clear number typography, and a visible card shadow.

- [ ] **Step 1: Find the org dashboard component/page**

Run: `Get-Content "client\app\organization\dashboard\page.tsx"`

- [ ] **Step 2: Upgrade stat cards to use accent border**

Each stat card:
```tsx
<div className="rounded-xl border border-border bg-card p-5 shadow-sm">
  <div className="flex items-start justify-between">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-3xl text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
    <div className="rounded-lg bg-forest-pale p-2.5 text-forest">
      <HugeiconsIcon icon={icon} className="size-4" />
    </div>
  </div>
</div>
```

- [ ] **Step 3: Commit**
```bash
git add client/app/organization/dashboard/
git commit -m "style: upgrade org dashboard stat cards"
```

---

### Task 8: Final Build Verification

**Files:** None modified

- [ ] **Step 1: Run build**
```bash
cd "F:\Appointment Booking App\appointment-app-odoo\client"
npm run build
```
Expected: exit 0, no TypeScript errors.

- [ ] **Step 2: If errors, fix them inline**

Common issues:
- Missing icon imports — add from `@hugeicons/core-free-icons`
- Missing `CreditCardIcon` — check import name with `import { ... } from "@hugeicons/core-free-icons"`

- [ ] **Step 3: Commit clean build**
```bash
git commit -m "chore: verify clean build after UI revamp"
```
