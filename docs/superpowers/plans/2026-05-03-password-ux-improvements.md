# Password UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add show/hide password toggle, confirm-password on signup, live strength meter, and a small batch of low-cost auth-form fixes across all five password-bearing forms in `client/`.

**Architecture:** Three new shared primitives — a pure scorer (`lib/password-strength.ts`), a `<PasswordInput>` UI primitive that wraps the existing shadcn `Input` with a toggle button + Caps Lock indicator, and a presentational `<PasswordStrengthMeter>` — then thread them through the five existing forms. No backend changes, no new dependencies.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Tailwind 4, shadcn primitives, hugeicons (`ViewIcon` / `ViewOffIcon`), bun (package manager and runner).

**Spec:** `docs/superpowers/specs/2026-05-03-password-ux-improvements-design.md`

**Working dir for all commands:** `client/` (run `cd client` first or prefix). All file paths are relative to repo root.

**Test philosophy:** This client has no automated test framework. Per-task verification is `bun run typecheck && bun run lint` from `client/`, plus manual smoke (described per task). The pure scorer module is verified with a quick inline `bun run` script — no test framework added.

---

## File Structure

**New files:**
- `client/lib/password-strength.ts` — pure `scorePassword()` function. No React, no deps. ~80 LOC.
- `client/components/ui/password-input.tsx` — `<PasswordInput>` wraps `<Input>` with show/hide toggle + Caps Lock pill. ~70 LOC.
- `client/components/ui/password-strength-meter.tsx` — presentational meter consuming `scorePassword`. ~50 LOC.

**Modified files:**
- `client/components/auth/login-form.tsx` — swap to `<PasswordInput>`, gate submit, autofocus email, "Forgot password?" copy.
- `client/components/auth/signup-form.tsx` — swap to `<PasswordInput>`, add confirm field + meter, autofocus name, drop helper.
- `client/components/auth/reset-password-form.tsx` — swap both fields to `<PasswordInput>`, add meter, drop redundant description.
- `client/components/account/change-password-form.tsx` — swap all 3 fields, add meter.
- `client/components/organization/settings/change-password-dialog.tsx` — swap all 3 fields, add meter, replace toast errors with inline `localError` state.

---

## Task 1: Pure password-strength scorer

**Files:**
- Create: `client/lib/password-strength.ts`

- [ ] **Step 1: Create the file with the full implementation**

Write `client/lib/password-strength.ts`:

```ts
export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

export type PasswordStrength = {
  score: PasswordStrengthScore;
  label: "" | "Weak" | "Fair" | "Good" | "Strong";
  unmet: string[];
};

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "qwertyuiop",
  "iloveyou",
  "letmein",
  "welcome",
  "welcome1",
  "admin",
  "admin123",
  "abc12345",
  "monkey123",
  "football",
  "baseball",
  "dragon123",
]);

const LABELS: Record<PasswordStrengthScore, PasswordStrength["label"]> = {
  0: "",
  1: "Weak",
  2: "Fair",
  3: "Good",
  4: "Strong",
};

export function scorePassword(
  password: string,
  context?: { email?: string; fullName?: string },
): PasswordStrength {
  if (!password) {
    return { score: 0, label: "", unmet: [] };
  }

  const lower = password.toLowerCase();
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const len = password.length;

  let raw = 0;
  if (len >= 8) raw += 1;
  if (len >= 12) raw += 1;
  if (len >= 16) raw += 1;
  if (hasLower && hasUpper) raw += 1;
  if (hasDigit) raw += 1;
  if (hasSymbol) raw += 1;

  let score = Math.min(4, raw) as PasswordStrengthScore;

  // Hard penalties: force score to 1 regardless of arithmetic.
  let penalized = false;
  let penaltyReason: "common" | "context" | null = null;

  if (COMMON_PASSWORDS.has(lower)) {
    penalized = true;
    penaltyReason = "common";
  }

  if (context) {
    const emailLocal = context.email?.split("@")[0]?.toLowerCase();
    const emailFull = context.email?.toLowerCase();
    const nameSquashed = context.fullName?.toLowerCase().replace(/\s+/g, "");
    if (
      (emailLocal && emailLocal.length >= 3 && lower === emailLocal) ||
      (emailFull && lower === emailFull) ||
      (nameSquashed && nameSquashed.length >= 3 && lower === nameSquashed)
    ) {
      penalized = true;
      penaltyReason = penaltyReason ?? "context";
    }
  }

  if (penalized) {
    score = 1;
  }

  const unmet: string[] = [];
  if (len < 12) unmet.push("Use at least 12 characters");
  if (!(hasLower && hasUpper)) unmet.push("Mix upper and lowercase letters");
  if (!hasDigit) unmet.push("Add a number");
  if (!hasSymbol) unmet.push("Add a symbol like ! or #");
  if (penaltyReason === "context") unmet.push("Avoid using your name or email");
  if (penaltyReason === "common") unmet.push("Avoid common passwords");

  return {
    score,
    label: LABELS[score],
    unmet: unmet.slice(0, 3),
  };
}
```

- [ ] **Step 2: Verify with a one-shot bun script**

Run from repo root:

```bash
cd client && bun run --eval "import('./lib/password-strength.ts').then(m => {
  const cases = [
    ['', undefined, 0, ''],
    ['short', undefined, 0, 'Weak'],
    ['password', undefined, 1, 'Weak'],
    ['Abcdefg1', undefined, 3, 'Good'],
    ['Abcdefg1!', undefined, 4, 'Strong'],
    ['CorrectHorseBatteryStaple9!', undefined, 4, 'Strong'],
    ['saurav@mindtrot.com', { email: 'saurav@mindtrot.com' }, 1, 'Weak'],
    ['saurav', { email: 'saurav@mindtrot.com' }, 1, 'Weak'],
  ];
  for (const [pw, ctx, expectedScore] of cases) {
    const r = m.scorePassword(pw, ctx);
    const ok = r.score === expectedScore;
    console.log(ok ? 'PASS' : 'FAIL', JSON.stringify({ pw, ctx }), '=>', r);
  }
})"
```

Expected: every line begins with `PASS`. Note: `'short'` has length 5 so all length checks fail; raw=0; score=0; label is empty — but the test expects label `'Weak'`. Adjust the `cases` array if a fail surfaces, but the **scoring code is the source of truth** — fix expectations, not the scorer. (Specifically: `'short'` should print `score:0 label:''`. That's correct behavior — empty label is reserved for empty input only; non-empty inputs scoring 0 still print `''`. If you want any non-empty input to read at minimum "Weak", coerce inside `scorePassword`: change `if (!password)` early return only for the empty case, and after scoring, if `password.length > 0 && score === 0` set `score = 1`. Apply that coercion now.)

Apply the coercion: after the `if (penalized) { score = 1; }` block, add:

```ts
  if (password.length > 0 && score === 0) {
    score = 1;
  }
```

Re-run the verification command. Expected: all `PASS`.

- [ ] **Step 3: Typecheck**

```bash
cd client && bun run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/lib/password-strength.ts
git commit -m "feat(client): add pure password-strength scorer"
```

---

## Task 2: `<PasswordInput>` primitive

**Files:**
- Create: `client/components/ui/password-input.tsx`

- [ ] **Step 1: Create the file**

Write `client/components/ui/password-input.tsx`:

```tsx
"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">;

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, disabled, onKeyDown, onKeyUp, onBlur, onFocus, ...props }, ref) {
    const [visible, setVisible] = React.useState(false);
    const [capsLock, setCapsLock] = React.useState(false);
    const [focused, setFocused] = React.useState(false);

    const updateCapsLock = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      setCapsLock(e.getModifierState("CapsLock"));
    }, []);

    return (
      <div className="space-y-1">
        <div className="relative">
          <Input
            ref={ref}
            type={visible ? "text" : "password"}
            className={cn("pr-10", className)}
            disabled={disabled}
            onKeyDown={(e) => {
              updateCapsLock(e);
              onKeyDown?.(e);
            }}
            onKeyUp={(e) => {
              updateCapsLock(e);
              onKeyUp?.(e);
            }}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              setCapsLock(false);
              onBlur?.(e);
            }}
            {...props}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <HugeiconsIcon
              icon={visible ? ViewOffIcon : ViewIcon}
              strokeWidth={2}
              className="size-4"
            />
          </button>
        </div>
        {focused && capsLock ? (
          <p
            role="status"
            className="text-xs font-medium text-amber-600 dark:text-amber-500"
          >
            Caps Lock is on
          </p>
        ) : null}
      </div>
    );
  },
);
```

- [ ] **Step 2: Typecheck and lint**

```bash
cd client && bun run typecheck && bun run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/components/ui/password-input.tsx
git commit -m "feat(client): add PasswordInput primitive with show/hide and caps-lock indicator"
```

---

## Task 3: `<PasswordStrengthMeter>` presentational component

**Files:**
- Create: `client/components/ui/password-strength-meter.tsx`

- [ ] **Step 1: Create the file**

Write `client/components/ui/password-strength-meter.tsx`:

```tsx
"use client";

import * as React from "react";

import { scorePassword } from "@/lib/password-strength";
import { cn } from "@/lib/utils";

type Props = {
  password: string;
  context?: { email?: string; fullName?: string };
  className?: string;
};

const SEGMENT_COLORS = [
  "bg-destructive",   // 1 — Weak (red)
  "bg-amber-500",     // 2 — Fair
  "bg-lime-500",      // 3 — Good
  "bg-emerald-500",   // 4 — Strong
];

const LABEL_COLORS = [
  "",                            // 0 — never rendered
  "text-destructive",
  "text-amber-600 dark:text-amber-500",
  "text-lime-700 dark:text-lime-500",
  "text-emerald-700 dark:text-emerald-500",
];

export function PasswordStrengthMeter({ password, context, className }: Props) {
  if (!password) return null;

  const { score, label, unmet } = scorePassword(password, context);

  return (
    <div
      aria-live="polite"
      className={cn("space-y-1.5", className)}
    >
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => {
          const filled = i < score;
          const colorClass = filled
            ? SEGMENT_COLORS[Math.min(score - 1, 3)]
            : "bg-muted";
          return (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                colorClass,
              )}
            />
          );
        })}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn("text-xs font-medium", LABEL_COLORS[score])}>
          {label}
        </span>
        {unmet.length > 0 ? (
          <span className="truncate text-xs text-muted-foreground">
            {unmet.join(" · ")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

```bash
cd client && bun run typecheck && bun run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/components/ui/password-strength-meter.tsx
git commit -m "feat(client): add PasswordStrengthMeter component"
```

---

## Task 4: Wire `<PasswordInput>` into login form + ship UX fixes

**Files:**
- Modify: `client/components/auth/login-form.tsx`

- [ ] **Step 1: Swap `Input` import addition + use `PasswordInput`**

In `client/components/auth/login-form.tsx`:

Add this import alongside the existing `Input` import (keep `Input` — we still use it for email):

```tsx
import { PasswordInput } from "@/components/ui/password-input";
```

Find this block (around lines 198-207):

```tsx
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loginMutation.isPending}
          />
```

Replace with:

```tsx
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loginMutation.isPending}
          />
```

- [ ] **Step 2: Gate the submit button on field validity**

Find the credentials-stage submit button (around lines 212-220):

```tsx
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loginMutation.isPending}
        >
```

Replace with:

```tsx
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loginMutation.isPending || !email || password.length < 8}
        >
```

- [ ] **Step 3: Add autofocus to email and update "Forgot?" copy**

Find the email Input (around lines 177-185):

```tsx
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loginMutation.isPending}
          />
```

Replace with:

```tsx
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loginMutation.isPending}
          />
```

Find the "Forgot?" link text (around line 195):

```tsx
              Forgot?
```

Replace with:

```tsx
              Forgot password?
```

- [ ] **Step 4: Typecheck, lint, and manual smoke**

```bash
cd client && bun run typecheck && bun run lint
```

Expected: no errors.

Manual smoke:
1. `cd client && bun run dev`
2. Open http://localhost:3000/login
3. Verify email field is auto-focused on load.
4. Verify "Forgot password?" link reads correctly.
5. Type a password, click the eye — characters reveal. Click again — they hide. Refresh — defaults hidden.
6. Press Caps Lock with the password field focused — "Caps Lock is on" appears in amber. Tab away — pill disappears.
7. Submit button is disabled with empty fields; enables once email + password (≥8 chars) are present.

- [ ] **Step 5: Commit**

```bash
git add client/components/auth/login-form.tsx
git commit -m "feat(client): show/hide password, caps-lock indicator, submit gating, autofocus on login"
```

---

## Task 5: Signup form — confirm field, strength meter, autofocus

**Files:**
- Modify: `client/components/auth/signup-form.tsx`

- [ ] **Step 1: Add imports and confirm-password state**

In `client/components/auth/signup-form.tsx`:

Add these imports (alongside existing `Input` import — keep `Input` for name/email):

```tsx
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
```

Find the state declarations (around lines 23-25):

```tsx
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
```

Replace with:

```tsx
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
```

- [ ] **Step 2: Add `autoFocus` on full name field**

Find the full name Input (around lines 66-74):

```tsx
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={registerMutation.isPending}
          />
```

Replace with:

```tsx
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            autoFocus
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={registerMutation.isPending}
          />
```

- [ ] **Step 3: Swap password field, add strength meter and confirm field**

Find the password block (around lines 90-104):

```tsx
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={registerMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
```

Replace with:

```tsx
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={registerMutation.isPending}
          />
          <PasswordStrengthMeter
            password={password}
            context={{ email, fullName }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={confirmPassword}
            aria-invalid={mismatch || undefined}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={registerMutation.isPending}
          />
          {mismatch ? (
            <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
          ) : null}
        </div>
```

- [ ] **Step 4: Update submit button gating**

Find the submit button (around lines 108-122):

```tsx
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={
            registerMutation.isPending ||
            !fullName ||
            !email ||
            password.length < 8
          }
        >
          {registerMutation.isPending ? <Spinner /> : null}
          Create account
        </Button>
```

Replace with:

```tsx
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={
            registerMutation.isPending ||
            !fullName ||
            !email ||
            password.length < 8 ||
            confirmPassword.length < 8 ||
            mismatch
          }
        >
          {registerMutation.isPending ? <Spinner /> : null}
          Create account
        </Button>
```

- [ ] **Step 5: Typecheck, lint, manual smoke**

```bash
cd client && bun run typecheck && bun run lint
```

Expected: no errors.

Manual smoke at http://localhost:3000/signup:
1. Full name field auto-focused on load.
2. Type weak password (e.g. `password`) — meter shows red "Weak" + "Avoid common passwords".
3. Type a strong password (e.g. `Tr0ub4dor&3xx`) — meter goes emerald "Strong".
4. Type your email as the password — score forces to "Weak" with "Avoid using your name or email".
5. Confirm field empty — no mismatch error. Type wrong value — "Passwords don't match." appears, submit disabled.
6. Match the confirm — error gone, submit enables once all fields valid.
7. Show/hide toggle works on both password fields independently.

- [ ] **Step 6: Commit**

```bash
git add client/components/auth/signup-form.tsx
git commit -m "feat(client): confirm-password field, strength meter, show/hide on signup"
```

---

## Task 6: Reset-password form — show/hide on both fields, strength meter

**Files:**
- Modify: `client/components/auth/reset-password-form.tsx`

- [ ] **Step 1: Add imports**

In `client/components/auth/reset-password-form.tsx`, add:

```tsx
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
```

(`Input` is still imported for the existing primitives — keep that import even though we no longer use it directly; if lint flags it, remove it.)

- [ ] **Step 2: Swap both password fields and insert meter**

Find the form body inside the main `AuthShell` return (around lines 72-105):

```tsx
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={reset.isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={confirm}
            aria-invalid={mismatch || undefined}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={reset.isPending}
          />
          {mismatch ? (
            <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
          ) : null}
        </div>
```

Replace with:

```tsx
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={reset.isPending}
          />
          <PasswordStrengthMeter password={newPassword} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={confirm}
            aria-invalid={mismatch || undefined}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={reset.isPending}
          />
          {mismatch ? (
            <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
          ) : null}
        </div>
```

- [ ] **Step 3: Drop the now-redundant description**

Find the `AuthShell` opening for the main return (around lines 62-66):

```tsx
    <AuthShell
      title="Choose a new password"
      description="Pick something strong — at least 8 characters."
      footer={
```

Replace with:

```tsx
    <AuthShell
      title="Choose a new password"
      footer={
```

- [ ] **Step 4: Remove unused `Input` import if present**

If the `Input` import line is now unused in this file, delete it. Run lint to verify.

```bash
cd client && bun run typecheck && bun run lint
```

Expected: no errors. If lint complains about an unused `Input` import, remove the import line.

Manual smoke at `/reset-password?token=anything` (the token validity is server-side; the form renders for any non-empty token):
1. New password field shows show/hide toggle.
2. Strength meter appears as soon as you type.
3. Confirm field also has show/hide.
4. Mismatch warning still appears as before.

- [ ] **Step 5: Commit**

```bash
git add client/components/auth/reset-password-form.tsx
git commit -m "feat(client): show/hide and strength meter on reset-password form"
```

---

## Task 7: Account change-password form — show/hide on all fields, strength meter

**Files:**
- Modify: `client/components/account/change-password-form.tsx`

- [ ] **Step 1: Add imports**

In `client/components/account/change-password-form.tsx`, add:

```tsx
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
```

- [ ] **Step 2: Swap all three password fields, insert meter**

Find the three password field blocks (around lines 58-92):

```tsx
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
```

Replace with:

```tsx
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <PasswordInput
              id="current-password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
            <PasswordStrengthMeter password={next} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
```

- [ ] **Step 3: Remove unused `Input` import if lint flags it**

```bash
cd client && bun run typecheck && bun run lint
```

Expected: no errors. If `Input` is unused, remove the import.

Manual smoke (requires login): visit account settings page and open the change password section. Verify show/hide on all 3 fields and strength meter appears under "New password".

- [ ] **Step 4: Commit**

```bash
git add client/components/account/change-password-form.tsx
git commit -m "feat(client): show/hide and strength meter on account change-password"
```

---

## Task 8: Org settings change-password dialog — show/hide, meter, inline errors

**Files:**
- Modify: `client/components/organization/settings/change-password-dialog.tsx`

- [ ] **Step 1: Add imports and inline-error state**

In `client/components/organization/settings/change-password-dialog.tsx`:

Add imports:

```tsx
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
```

Find the state block (around lines 22-25):

```tsx
  const mutation = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
```

Replace with:

```tsx
  const mutation = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
```

- [ ] **Step 2: Replace toast validation with inline error**

Find the `submit` handler (around lines 27-54):

```tsx
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      toast.error("New password does not match confirmation.");
      return;
    }
    mutation.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          toast.success("Password updated");
          onOpenChange(false);
          setCurrent("");
          setNext("");
          setConfirm("");
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Update failed";
          toast.error(msg);
        },
      },
    );
  };
```

Replace with:

```tsx
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (next.length < 8) {
      setLocalError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setLocalError("New password does not match confirmation.");
      return;
    }
    mutation.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          toast.success("Password updated");
          onOpenChange(false);
          setCurrent("");
          setNext("");
          setConfirm("");
          setLocalError(null);
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Update failed";
          setLocalError(msg);
        },
      },
    );
  };
```

- [ ] **Step 3: Swap password fields, insert meter, render inline error**

Find the form body (around lines 59-104):

```tsx
        <form onSubmit={submit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Current password</Label>
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>New password</Label>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm new password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
```

Replace with:

```tsx
        <form onSubmit={submit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Current password</Label>
            <PasswordInput
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>New password</Label>
            <PasswordInput
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
            />
            <PasswordStrengthMeter password={next} />
          </div>
          <div className="space-y-2">
            <Label>Confirm new password</Label>
            <PasswordInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
            />
          </div>
          {localError ? (
            <p className="text-sm text-destructive">{localError}</p>
          ) : null}
          <DialogFooter>
```

- [ ] **Step 4: Remove now-unused imports**

After the changes, `Input` and `ApiError` may be unused in this file. Run lint:

```bash
cd client && bun run typecheck && bun run lint
```

Expected: no errors. Remove any imports lint flags as unused. (`ApiError` is still used in the `onError` handler, so it stays. `Input` should be removed.)

Manual smoke: open the org settings change-password dialog. Verify show/hide on all 3 fields, strength meter under new password, validation errors render inline (not as toasts), success still toasts.

- [ ] **Step 5: Commit**

```bash
git add client/components/organization/settings/change-password-dialog.tsx
git commit -m "feat(client): show/hide, strength meter, inline errors in org change-password dialog"
```

---

## Task 9: Final cross-form smoke check

- [ ] **Step 1: Run full quality gate**

```bash
cd client && bun run typecheck && bun run lint
```

Expected: clean.

- [ ] **Step 2: End-to-end manual walkthrough**

Start the dev server (`cd client && bun run dev`) and visit, in order:

1. `/login` — autofocus on email, show/hide on password, "Forgot password?" link, Caps Lock pill on, submit gating.
2. `/signup` — autofocus on full name, show/hide on both password fields, strength meter live, mismatch error, context penalty when password = email.
3. `/reset-password?token=test` — show/hide on both fields, strength meter, no redundant description.
4. Account settings → change password — show/hide on all 3 fields, meter on new.
5. Org settings → change password dialog — show/hide on all 3, meter on new, validation errors inline.

If anything regresses, fix in place and amend the relevant commit (or add a follow-up commit).

- [ ] **Step 3: Push branch (only if user asks)**

This step is intentionally manual. Do not push without explicit user confirmation.

---

## Self-review notes

- Spec coverage: every form in the spec's table has a task. All three components from the "Components to introduce" section have tasks. Bugs #1, #2, #3, #5, #9, #10 from the brainstorm are covered in tasks 4–8. Bug list deferrals (#4, #6, #7, #8) are explicitly out of scope per spec.
- Type consistency: `scorePassword` signature, `PasswordStrength` shape, and `PasswordInput` props are defined once in tasks 1–3 and consumed unchanged in tasks 4–8.
- Caps Lock indicator behavior: only renders when both `focused` and `capsLock` are true. On blur, `capsLock` is reset to avoid stale pill display when refocusing later.
- The strength meter never reads or transmits the password — only `aria-live="polite"` on the score/label container, which announces changes like "Weak" or "Strong" without revealing the password text.
