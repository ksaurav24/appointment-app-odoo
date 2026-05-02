# Onboarding Restructure — Design

**Status:** Draft for review
**Owner:** Saurav
**Date:** 2026-05-03
**Scope:** Customer + Organizer signup, OTP verification, Organizer 3-step org onboarding, post-signup landing.

---

## 1. Goals

1. Two completely separate signup flows on different routes — no role picker, no cross-link buttons between them.
2. Organizer flow: credentials → OTP → 3-step org onboarding → "pending approval" page.
3. Customer flow: credentials → OTP → customer dashboard (auto-logged-in, no interests page).
4. Re-entry guard so an organizer who logs out mid-onboarding lands back in onboarding on next login.
5. Align with PRD §3.2–3.3 where reasonable; keep the backend's existing `OrganizationApprovedGuard` (admin approval gate) which the PRD does not describe but the codebase already implements.

## 2. Non-goals

- Admin moderation UI (separate spec).
- Logo upload to cloud storage (still goes through existing `/organizations` multipart endpoint).
- Email template changes.
- 2FA or password reset flow changes.
- Internationalization of new copy.

---

## 3. Final route map

### Customer
```
/signup                    → name/email/password (no organizer link)
/otp-verification          → enter OTP
                             on success: cookies set, redirect to /dashboard/user
/dashboard/user            → customer landing
```

### Organizer
```
/organizer/signup                       → name/email/password (no customer link)
/organizer/otp-verification             → enter OTP
                                          on success: cookies set, redirect to /organizer/onboarding/step-1
/organizer/onboarding/step-1            → org name + slug
/organizer/onboarding/step-2            → description + contact phone + address + timezone + logo
/organizer/onboarding/step-3            → review + submit (calls POST /organizations)
/organizer/onboarding/submitted         → "pending admin approval" landing
```

The shared `/otp-verification` page can stay and route by `?role=` query param, OR each role gets its own page. **Decision:** keep one shared `/otp-verification` page with `?role=customer|organiser` query param (less duplication, mirrors current pattern). The route names above with `/organizer/otp-verification` are dropped — organizer signup form sends users to `/otp-verification?email=…&flow=signup&role=organiser`.

### Routes / pages to delete
- `client/app/onboarding/interests/page.tsx`
- `client/components/features/onboarding/interests-form.tsx`
- `SERVICE_INTERESTS` and `ServiceInterest` exports in `constants/index.ts`
- `interests`, `setInterests`, `clearInterests` from `useAppStore.ts`
- `onboardingInterests` route from `ROUTES`

---

## 4. Backend changes

### 4.1 `RegisterDto` — accept explicit role

Today: role is inferred — `ORGANIZER` if `organization` block is present, otherwise `CUSTOMER`. There is no way to register as an organizer without org.

Change:

```ts
class RegisterDto {
  email: string;
  password: string;
  fullName: string;

  @IsEnum(['CUSTOMER', 'ORGANIZER'])
  @IsOptional()
  role?: 'CUSTOMER' | 'ORGANIZER';   // NEW

  @ValidateNested()
  @IsOptional()
  organization?: RegisterOrganizationDto;
}
```

Resolution rules in the controller/service:

| `role` field | `organization` block | Resulting role | Org created? |
|---|---|---|---|
| absent | absent | CUSTOMER | no |
| absent | present | ORGANIZER | yes (PENDING) — preserves existing behavior |
| `'CUSTOMER'` | absent | CUSTOMER | no |
| `'CUSTOMER'` | present | **400** (rejected) | — |
| `'ORGANIZER'` | absent | ORGANIZER | no — org created later via `POST /organizations` |
| `'ORGANIZER'` | present | ORGANIZER | yes (PENDING) — same as today |

The combined-atomic path stays for backward compatibility. The new path is "register as ORGANIZER without org, create org later".

### 4.2 `POST /auth/verify-email` — issue cookies on success

Today: returns `{ message: "Email verified." }`, no cookies. Caller must hit `/auth/login` next.

Change: on successful first-time verification, mint access + refresh tokens and set cookies (same code path as `/auth/login`). Response shape becomes:

```jsonc
{ "message": "Email verified.", "user": SafeUser }
```

If the email was already verified before this call (idempotent re-verify), do **not** issue cookies — return `{ message: "Email already verified." }` with no `user`. This preserves the existing idempotent-success contract for repeat calls without creating a "verify becomes silent login" footgun.

Throttling: keep existing `otpSubmit` throttler — there's no auth amplification because the OTP itself is the credential.

### 4.3 `POST /organizations` — needs to be CREATED

Reality check: the frontend's `client/lib/api.ts:createOrganization` already calls this endpoint, but it does **not exist** on the backend (`organizations.controller.ts` only declares `GET /organizations/me`). This frontend code is currently dead in real-API mode.

Add the endpoint:

* **Path:** `POST /organizations`
* **Auth:** JWT cookie, `@Roles(Role.ORGANIZER)`, `@SkipOrganizationApproval()` (so a verified organizer with no org yet can call it).
* **Body:** multipart/form-data — text fields `name`, `slug`, `contactEmail`, optional `description`, `contactPhone`, `address`, `timezone`; optional file field `logo`.
* **DTO:** mirror `RegisterOrganizationDto` (already exists), add file handling.
* **Service logic:**
  - Verify the organizer does not already have an org (unique constraint on `organiserId` will also catch this — return 409 with `"Organizer already has an organization"` for a clean error).
  - Create the org with `approvalStatus = PENDING`, `isActive = false` (or whatever the existing register-with-org code sets — reuse that path).
  - Upload the logo via the existing storage helper used in the register-with-org flow.
  - Return the created org (`Organization` shape from `04-data-models.md`).
* **Errors:** 409 if org already exists, 409 if slug taken, 400 on validation.

After creation the existing `OrganizationApprovedGuard` 403s on subsequent organizer endpoints until an admin approves the freshly-created PENDING org — this is the desired "pending approval" behavior.

### 4.4 Schema impact

None. `users.role` already supports `ORGANIZER`. `organizations.organiserId` is unique, so the second-org-by-same-organizer guarantee is preserved by the existing constraint.

---

## 5. Frontend changes

### 5.1 Customer signup form (`signup-form.tsx`)
- Remove the "Want to host appointments? → Create an organiser account" link.
- After `registerCustomer` success, navigate to `/otp-verification?email=…&flow=signup&role=customer` (already does).
- No other behavior change.

### 5.2 Organizer signup form (`organizer-signup-form.tsx`)
- Remove the "Looking to book appointments? → Sign up as a customer" link.
- **Behavior change:** instead of stashing credentials in zustand and routing to org setup, call a new mutation `registerOrganizerMutation` that POSTs to `/auth/register` with `{ fullName, email, password, role: 'ORGANIZER' }` (no organization block).
- On success, navigate to `/otp-verification?email=…&flow=signup&role=organiser`.
- Delete `signupCredentials` from `useAppStore` — no longer needed.

### 5.3 Login form (`login-form.tsx`)
- Remove the "Want to host appointments?" link.
- After successful login, route by role + onboarding state:
  - `CUSTOMER` → `/dashboard/user`
  - `ORGANIZER` + has org → `/` (or whatever the organizer landing is)
  - `ORGANIZER` + no org → `/organizer/onboarding/step-1` (re-entry guard, see §6)

### 5.4 OTP verification form (`otp-verification-form.tsx`)
- The verify call now returns `{ user }` on first-time verify. Hydrate auth state with `setUser(result.user)` when present.
- Routing after success:
  - `flow=signup`, `role=customer`  → `/dashboard/user` (was: `/onboarding/interests`)
  - `flow=signup`, `role=organiser` → `/organizer/onboarding/step-1` (was: `/organizer/onboarding/submitted`)
  - else → `/login` (unchanged)

### 5.5 Organizer onboarding — 3-step form (Split α)

**Step 1 — `/organizer/onboarding/step-1`**: Org name + URL slug. Same as current `org-setup-form.tsx`. On Next, save draft to zustand `orgDraft` and navigate to step 2.

**Step 2 — `/organizer/onboarding/step-2`**: Description + contact phone + address + timezone + logo. Same fields as current `org-details-form.tsx` minus the submit-to-backend behavior. On Next, save draft to zustand and navigate to step 3.

**Step 3 — `/organizer/onboarding/step-3`**: Read-only review of all fields from steps 1 + 2 + a "Submit" button. On submit, calls `POST /organizations` (multipart with logo). On success, clears `orgDraft` and navigates to `/organizer/onboarding/submitted`.

Stepper component (`onboarding-stepper.tsx`) updates from labels `Setup / Details / Submit` to `Basics / Profile / Review`. The `currentStep: 1 | 2 | 3` prop already supports this.

Each step page guards entry: if the previous step's required draft is missing, redirect back to the earliest incomplete step. Step 1 has no prerequisite.

**Auth guard:** all three step pages require `user.role === 'ORGANIZER'` and `user.emailVerified`. If the user has no session, redirect to `/login`. If the user already has an organization, redirect to wherever organizers normally land (out of scope: pick a path — for now, the home page `/`).

### 5.6 "Submitted" page
- Already exists at `/organizer/onboarding/submitted` and is essentially correct. Keep copy. Stepper stays at step 3 done.

### 5.7 Zustand store cleanup
- Remove `signupCredentials`, `setSignupCredentials`, `clearSignupCredentials`.
- Remove `interests`, `setInterests`, `clearInterests`.
- Keep `orgDraft`, `setOrgDraft`, `clearOrgDraft` — used across the 3 steps.
- `OrgDraft` type expands from just step-1 fields to include step-2 fields too (or make two drafts: `orgDraftStep1`, `orgDraftStep2` — recommend a single combined `orgDraft` for simplicity).

### 5.8 API client (`lib/api.ts`)
- Add `registerOrganizer({ fullName, email, password })` — POSTs to `/auth/register` with `role: 'ORGANIZER'`, no org block.
- `verifyEmail` — update return type to `{ message: string; user?: AuthUser }`.
- `registerOrgUser` (atomic register-with-org) — keep for now but unused by the new flow; mark as deprecated in a comment. Remove in a follow-up after the dust settles.

### 5.9 useAuth hook
- Add `registerOrganizerMutation` mirroring `registerCustomerMutation`.
- `verifyEmailMutation` — on success, if `result.user` is present, call `setUser(result.user)` so the customer dashboard renders without a refetch.

### 5.10 Constants & types
- `ROUTES`: replace `organizerOnboardingSetup`/`Details`/`Submitted` with `organizerOnboardingStep1`/`Step2`/`Step3`/`Submitted`. Drop `onboardingInterests`.
- `OrgRegistrationPayload` type: drop (atomic path is no longer used by the UI).

---

## 6. Re-entry guard for organizers

**Where:** a small client-side guard component used inside the organizer dashboard layout (or wherever organizers first land post-login).

**Logic:**
- After auth hydrates (we have `user`), if `user.role === 'ORGANIZER'`:
  - Fetch `GET /organizations/me` (already exists per `OrganizationApprovedGuard` notes — endpoint is `@SkipOrganizationApproval()` so it works even with no org).
  - If 404 / no org → redirect to `/organizer/onboarding/step-1`.
  - If org exists with `approvalStatus === 'PENDING'` → redirect to `/organizer/onboarding/submitted`.
  - If org exists and `APPROVED` → render the dashboard normally.
- The login form duplicates the first two checks immediately on successful login so the user sees the right destination instantly without a flash of dashboard.

**Why client-side:** the backend already enforces the gate at the API layer. The client guard is purely a UX redirect to keep users out of pages that will all 403. We are not relying on the client guard for security.

**Backend dependency:** `GET /organizations/me` already returns `approvalStatus` (`PENDING` / `APPROVED` / `REJECTED`) per `docs/api/modules/organizations.md`. It returns 404 `"No organization found for this organizer"` when there's no org. Today that case is documented as a "data inconsistency"; under the new flow it is a normal expected state for a freshly-verified organizer who hasn't completed onboarding. **Backend doc update needed:** reword `organizations.md` line 31 to say 404 is expected during onboarding rather than rare.

---

## 7. Data flow diagrams

### Customer signup
```
[/signup form] --POST /auth/register-->  [201 userId]
   --redirect-->  [/otp-verification?role=customer]
   --POST /auth/verify-email-->  [200 message + user, cookies set]
   --redirect-->  [/dashboard/user]
```

### Organizer signup
```
[/organizer/signup form] --POST /auth/register {role: ORGANIZER}-->  [201 userId]
   --redirect-->  [/otp-verification?role=organiser]
   --POST /auth/verify-email-->  [200 message + user, cookies set]
   --redirect-->  [/organizer/onboarding/step-1]
   --Next-->  [/step-2]
   --Next-->  [/step-3]
   --Submit (POST /organizations multipart)-->  [201 org PENDING]
   --redirect-->  [/organizer/onboarding/submitted]
```

### Organizer logs back in mid-onboarding
```
[/login form] --POST /auth/login-->  [200 user, cookies]
   --GET /organizations/me-->  [404 or "no org"]
   --redirect-->  [/organizer/onboarding/step-1]
```

---

## 8. Error handling

- **Register email collision (409):** show inline form error, stay on signup page.
- **OTP wrong/expired (400):** show inline form error, stay on OTP page.
- **Resend OTP throttle (429):** disable resend button + show countdown (already implemented).
- **`POST /organizations` validation error (400):** redirect to the step containing the offending field with a toast — name/slug → step 1, anything else → step 2. Slug uniqueness collision is the most likely real-world hit; surface clearly on step 1.
- **`POST /organizations` server error (5xx):** keep user on step 3, show retry toast, do not clear draft.
- **Network error mid-flow:** keep draft, show retry. Draft lives in `sessionStorage` so a refresh doesn't lose work.
- **Organizer with no email verification reaches step pages directly:** redirect to `/otp-verification?email=…&flow=signup&role=organiser` (best-effort — email may not be in URL; if not, send to `/login`).

---

## 9. Testing

**Backend (NestJS, jest):**
- `RegisterDto` validation matrix: each row of §4.1 table → expected role + org-created.
- `verifyEmail` first call sets cookies + returns user; second call (idempotent) does not.
- `POST /organizations` succeeds for a verified organizer with no org; second call by same organizer 409s on unique `organiserId`.

**Frontend (manual smoke):**
- Customer happy path: signup → OTP (use demo OTP `123456` if mock mode) → lands on `/dashboard/user` with name visible.
- Organizer happy path: signup → OTP → 3 onboarding steps → submit → "pending approval" page.
- Organizer logs out at step-2, logs back in → lands on step-1 (or wherever earliest incomplete step is — see §10 open question).
- Organizer logs out after submit → lands on `/organizer/onboarding/submitted` until admin approves.
- Direct URL hits for step-2 and step-3 with empty draft → redirect to step-1.
- Cross-link removal: `/signup`, `/organizer/signup`, `/login` no longer show role-switch links.

---

## 10. Open questions / explicit decisions made

1. **Re-entry granularity:** when an organizer logs back in mid-onboarding, do we restore their `orgDraft` from sessionStorage and drop them at the earliest incomplete step, or always step-1? **Decision:** always step-1. `sessionStorage` is per-browser-session and per-tab; trying to restore across logins is fragile. Forcing step-1 re-entry is one extra screen for a rare path.
2. **Where do APPROVED organizers land?** Out of scope for this design — link to whatever page exists (currently `/`). Separate spec covers organizer dashboard.
3. **Auto-login on verify-email** — the PRD wants this; we are doing this. Side effect: if a user is verifying on a public/shared computer, they're now logged in. Acceptable trade-off for V1; the existing 2FA on login is unchanged for repeat logins.
4. **Removing `registerOrgUser` (atomic) immediately vs. after a release:** keep deprecated for one cycle to avoid breaking any caller we missed. Frontend stops calling it.

---

## 11. Files to add / modify / delete

**Backend (server/):**
- Modify `src/auth/dto/register.dto.ts` — add optional `role` enum field.
- Modify `src/auth/auth.service.ts` (and/or controller) — apply resolution rules in §4.1.
- Modify `src/auth/auth.service.ts` `verifyEmail` — issue cookies + return user on first-time verify.
- Modify `src/auth/auth.controller.ts` `verifyEmail` — set cookies on response.
- Add `POST /organizations` to `src/organizations/organizations.controller.ts` (with `@SkipOrganizationApproval()`, multipart logo handling) and a `createForOrganizer` method in `organizations.service.ts`. Reuse the org-creation path used today by the atomic register-with-org flow if possible.
- Update `docs/api/modules/auth.md` (verify-email + register changes) and `docs/api/modules/organizations.md` (new POST + reword the "no org = data inconsistency" line per §6).
- Add jest specs for: register validation matrix, verify-email cookie issuance, `POST /organizations` happy path + duplicate-org 409 + slug-taken 409.

**Frontend (client/):**
- Modify: `app/signup/page.tsx`, `app/login/page.tsx` copy if needed.
- Modify: `components/features/auth/signup-form.tsx`, `login-form.tsx`, `organizer-signup-form.tsx`, `otp-verification-form.tsx`.
- Add: `app/organizer/onboarding/step-1/page.tsx`, `step-2/page.tsx`, `step-3/page.tsx` (reusing existing form components, renamed).
- Modify: `components/features/organization/org-setup-form.tsx` → step 1.
- Modify: `components/features/organization/org-details-form.tsx` → step 2 (no register call; just save draft and Next).
- Add: `components/features/organization/org-review-form.tsx` → step 3 (read-only summary + submit button calling `POST /organizations`).
- Modify: `components/shared/onboarding-stepper.tsx` — relabel.
- Modify: `lib/api.ts` — add `registerOrganizer`, update `verifyEmail` return type.
- Modify: `hooks/useAuth.ts` — add `registerOrganizerMutation`, hydrate user on verify success.
- Modify: `store/useAppStore.ts` — drop signupCredentials + interests; expand `orgDraft`.
- Modify: `constants/index.ts` — update `ROUTES`, drop `SERVICE_INTERESTS`.
- Modify: `types/index.ts` — drop `OrgRegistrationPayload`, expand `OrgDraft` type.
- Add: client guard component for organizer re-entry (used in organizer dashboard layout).
- Delete: `app/organizer/onboarding/setup/page.tsx`, `details/page.tsx` (replaced by step-1, step-2 routes).
- Delete: `app/onboarding/interests/page.tsx`, `components/features/onboarding/interests-form.tsx`.

**Docs:**
- Update `docs/api/modules/auth.md` (§4.1 + §4.2 changes).
- This design doc itself.
