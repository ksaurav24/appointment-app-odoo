# Password UX Improvements — Design

**Date:** 2026-05-03
**Surface:** `client/components/auth/*`, `client/components/account/*`, `client/components/organization/settings/*`
**Owner:** Saurav

## Goal

Bring the password-bearing forms up to a professional UX baseline:

1. Show / hide password toggle on every password field.
2. Confirm-password field on signup.
3. Live password-strength meter on every "create new password" surface.
4. A handful of low-cost auth-form fixes that surfaced during discovery.

Out of scope: changing the API contract, password policy on the server (`server/`), or refactoring `useAuth` hooks.

## Forms in scope

| File | Has password fields | Changes |
|---|---|---|
| `client/components/auth/login-form.tsx` | 1 (current) | show/hide; submit gating; "Forgot password?" copy; `autoFocus` on email |
| `client/components/auth/signup-form.tsx` | 1 (new) | show/hide; confirm field; strength meter; `autoFocus` on full name |
| `client/components/auth/reset-password-form.tsx` | 2 (new + confirm) | show/hide on both; strength meter on new; trim helper text |
| `client/components/account/change-password-form.tsx` | 3 (current + new + confirm) | show/hide on all; strength meter on new |
| `client/components/organization/settings/change-password-dialog.tsx` | 3 | show/hide on all; strength meter on new; replace toast errors with inline errors |

## Components to introduce

### `client/components/ui/password-input.tsx`

Wrapper around the existing `Input` primitive. Sits in `components/ui/` next to other shadcn primitives.

**Props:** identical to `<Input>` minus `type` (always `"password"`/`"text"` internally). Forwards `ref`. Forwards `className` to the underlying input.

**Behavior:**
- Renders an `<Input>` with `pr-10` to make room for the toggle button.
- Renders an absolutely positioned `<button type="button" tabIndex={-1}>` inside the input box (right side, vertically centered).
  - `tabIndex={-1}` keeps it out of the form tab order — most users tab through fields, not toggles.
  - Icon: `EyeIcon` / `ViewOffIcon` from `@hugeicons/core-free-icons` via `<HugeiconsIcon>`.
  - `aria-pressed={visible}`, `aria-label={visible ? "Hide password" : "Show password"}`.
- Internal `useState<boolean>(false)` — **always defaults to hidden on mount**. Visibility is never persisted across renders, route changes, or remounts. Security hygiene.
- Caps Lock indicator: while the input is focused, listen for `keydown`/`keyup` and check `e.getModifierState("CapsLock")`. When true, render a small "Caps Lock is on" pill below the field (text-xs, amber-ish — use `text-amber-600 dark:text-amber-500` since `text-warning` doesn't exist in this theme; verify against tailwind config when implementing).
- Disables the toggle button when the input is `disabled`.

### `client/lib/password-strength.ts`

Pure function, no React, no deps. Exported:

```ts
export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;       // 0 = empty, 4 = strong
  label: "" | "Weak" | "Fair" | "Good" | "Strong";
  unmet: string[];                  // human-readable suggestions
};

export function scorePassword(
  password: string,
  context?: { email?: string; fullName?: string }
): PasswordStrength;
```

**Scoring rules (additive, then clamped to 0–4):**

- +1 if length ≥ 8
- +1 if length ≥ 12
- +1 if length ≥ 16
- +1 if has lowercase AND uppercase
- +1 if has digit
- +1 if has symbol (anything outside `[A-Za-z0-9]`)

Then clamp to `[0, 4]`. Empty password ⇒ score 0, empty label.

**Hard penalties (score forced to 1, regardless of arithmetic):**
- Password is in a small built-in blocklist (`password`, `12345678`, `qwerty12`, `iloveyou`, etc. — ~20 entries inline).
- Password equals (case-insensitively) the local-part of `context.email`, or the full email, or the full name with spaces removed.

**Unmet suggestions** (return up to 3, in priority order):
- "Use at least 12 characters" (if length < 12)
- "Mix upper and lowercase letters" (if missing one case)
- "Add a number" (if no digit)
- "Add a symbol like ! or #" (if no symbol)
- "Avoid using your name or email" (if penalty fired due to context match)
- "Avoid common passwords" (if blocklist hit)

### `client/components/ui/password-strength-meter.tsx`

Pure presentational. Props: `{ password: string; context?: { email?: string; fullName?: string } }`.

Renders nothing when password is empty.

```
[████░░░░░░░░░░░░]  Weak
Add a number · Mix upper and lowercase
```

- 4 segments in a flex row; first N filled based on `score`.
- Color tokens: 1=red (`bg-destructive`), 2=amber (`bg-amber-500`), 3=lime (`bg-lime-500`), 4=emerald (`bg-emerald-500`). Empty segments use `bg-muted`.
- Label: `text-xs font-medium`, color matches the bar.
- Unmet list: dot-separated, `text-xs text-muted-foreground`.
- `aria-live="polite"` so screen readers hear updates without being spammy. Never read the password itself.

## Per-form changes

### `login-form.tsx`

- Replace `<Input type="password" …>` with `<PasswordInput …>`.
- Submit button gating: `disabled={loginMutation.isPending || !email || password.length < 8}`. Mirrors signup-form for consistency.
- Add `autoFocus` to email `<Input>` (only when `stage === "credentials"` to avoid stealing focus during the 2FA stage).
- Change "Forgot?" link copy to "Forgot password?".

### `signup-form.tsx`

- Add `confirmPassword` state.
- Replace password `<Input>` with `<PasswordInput>`. Pass `context={{ email, fullName }}` to the strength meter.
- Insert `<PasswordStrengthMeter>` directly under the password field, replacing the static "At least 8 characters." helper text.
- Add a "Confirm password" `<PasswordInput>` field below the meter.
- Compute `mismatch = confirmPassword.length > 0 && password !== confirmPassword`.
- Show `<p className="text-xs text-destructive">Passwords don't match.</p>` under confirm field when `mismatch`.
- Add `aria-invalid={mismatch || undefined}` on the confirm input.
- Submit button gating: also `disabled={mismatch || confirmPassword.length < 8}`.
- Add `autoFocus` to full name input.

### `reset-password-form.tsx`

- Replace both `<Input type="password" …>` with `<PasswordInput …>`.
- Insert `<PasswordStrengthMeter password={newPassword} />` between new-password field and confirm field. (No email/fullName context available on this page — strength meter still works without it.)
- Drop the helper text "Pick something strong — at least 8 characters." from the `AuthShell`'s description prop. The meter speaks for itself.

### `change-password-form.tsx` (account)

- Replace all three `<Input type="password" …>` with `<PasswordInput …>`.
- Insert `<PasswordStrengthMeter password={next} />` between new-password and confirm-password fields.
- No other behavior changes.

### `change-password-dialog.tsx` (organization settings)

- Replace all three `<Input type="password" …>` with `<PasswordInput …>`.
- Insert `<PasswordStrengthMeter password={next} />` between new-password and confirm-password fields.
- Replace the two `toast.error(…)` validation calls with local `useState<string | null>` and inline rendering, matching the pattern in `change-password-form.tsx`. Toasts are appropriate for async errors, not synchronous form validation.

## Visual & a11y notes

- All toggle buttons are `tabIndex={-1}` — keyboard users tab through fields naturally, then click the toggle if needed. (Standard practice; matches GitHub, Stripe, etc.)
- Strength meter uses `aria-live="polite"`; the password value is never put into accessible text.
- Show/hide affects only the local input; never logged, never sent.
- Caps Lock indicator only renders when the input is focused — otherwise it would confuse users typing in a different field.

## Non-goals

- No `zxcvbn`. Keep bundle small — custom scorer is ~60 LOC.
- No server-side strength enforcement (server still requires ≥8 chars; that stays).
- No changes to the 2FA OTP flow.
- No changes to forgot-password (`forgot-password` page sends email; no password input).
- No changes to verify-email page.
- Bugs #4 (resend cooldown), #7 (organizer panel placement), #8 (post-change toast copy) from the brainstorm are deferred to a follow-up.

## Testing

Manual smoke (no automated UI tests in this repo today):

1. Login: toggle eye icon — text reveals/hides, defaults hidden after refresh, Caps Lock indicator appears when CapsLock is on.
2. Signup: type weak password — meter shows "Weak" red bar + suggestions; type strong password — bar goes emerald + label "Strong"; type your own email as password — meter forces "Weak" with "Avoid using your name or email".
3. Signup: mismatch confirm — error appears; submit disabled.
4. Reset password: same as signup minus context.
5. Account change-password: same.
6. Org settings dialog: validation errors render inline, not as toasts.

`cd client && bun run typecheck && bun run lint` must pass.
