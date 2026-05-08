"use client";

import { HourglassIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AuthError } from "@/components/auth/auth-error";
import { AuthShell } from "@/components/auth/auth-shell";
import { Stepper } from "@/components/onboarding/stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  useCurrentUser,
  useLogin,
  useRegister,
  useResendOtp,
  useVerifyEmail,
} from "@/hooks/useAuth";
import {
  useCreateOrganization,
  useMyOrganization,
} from "@/hooks/useOrganization";
import {
  clearPendingSignup,
  loadPendingSignup,
  savePendingSignup,
} from "@/lib/pending-signup";
import { cn } from "@/lib/utils";
import type { Organization } from "@/types";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Stage = "personal" | "verify" | "details" | "submitted";

const STAGES: Stage[] = ["personal", "verify", "details", "submitted"];

const STEPS = [
  { key: "personal", label: "Your details" },
  { key: "details", label: "Organization" },
  { key: "submitted", label: "Submitted" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stageIndex(stage: Stage): number {
  if (stage === "personal" || stage === "verify") return 0;
  if (stage === "details") return 1;
  return 2;
}

function parseStage(raw: string | null): Stage {
  return STAGES.includes(raw as Stage) ? (raw as Stage) : "personal";
}

export function OrganizerWizard() {
  const router = useRouter();
  const search = useSearchParams();

  const stage = parseStage(search.get("step"));
  const emailParam = search.get("email") ?? "";

  const userQuery = useCurrentUser();
  const orgQuery = useMyOrganization(!!userQuery.data);

  // Reconcile URL stage with the actual server state. We only act when the
  // user's apparent stage is incompatible with what the backend says.
  useEffect(() => {
    if (userQuery.isPending) return;
    if (userQuery.data && orgQuery.isPending) return;

    const target = inferStage({
      currentStage: stage,
      user: userQuery.data ?? null,
      org: orgQuery.data ?? null,
    });

    if (target && target !== stage) {
      const params = new URLSearchParams(search.toString());
      params.set("step", target);
      router.replace(`/onboarding/organizer?${params.toString()}`);
    }
  }, [
    stage,
    search,
    router,
    userQuery.isPending,
    userQuery.data,
    orgQuery.isPending,
    orgQuery.data,
  ]);

  const goTo = (next: Stage, extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set("step", next);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) params.set(k, v);
    }
    router.replace(`/onboarding/organizer?${params.toString()}`);
  };

  if (userQuery.isPending || (userQuery.data && orgQuery.isPending)) {
    return (
      <AuthShell title="Become an organizer">
        <div className="flex justify-center py-6">
          <Spinner className="size-5" />
        </div>
      </AuthShell>
    );
  }

  if (stage === "submitted") {
    return <SubmittedView organization={orgQuery.data ?? null} />;
  }

  return (
    <AuthShell
      title="Become an organizer"
      description="A two-step application — we'll review and email you when approved."
    >
      <Stepper steps={STEPS} currentIndex={stageIndex(stage)} />

      {stage === "personal" ? (
        <PersonalStep
          onSuccess={(email) => goTo("verify", { email })}
        />
      ) : null}

      {stage === "verify" ? (
        <VerifyStep
          email={emailParam}
          onAdvance={() => goTo("details")}
          onBack={() => goTo("personal")}
        />
      ) : null}

      {stage === "details" ? (
        <DetailsStep
          defaultContactEmail={userQuery.data?.email ?? emailParam}
          onAdvance={() => goTo("submitted")}
        />
      ) : null}
    </AuthShell>
  );
}

function inferStage({
  currentStage,
  user,
  org,
}: {
  currentStage: Stage;
  user: { role: string } | null;
  org: Organization | null;
}): Stage | null {
  if (org) return currentStage === "submitted" ? null : "submitted";
  if (user) {
    // Logged in but no org yet — they belong on details.
    return currentStage === "details" ? null : "details";
  }
  // Not logged in. The details/submitted stages require a session.
  if (currentStage === "details" || currentStage === "submitted") {
    return "personal";
  }
  return null;
}

// --- Step 1: personal info ---------------------------------------------------

function PersonalStep({
  onSuccess,
}: {
  onSuccess: (email: string) => void;
}) {
  const registerMutation = useRegister();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(
      { email, password, fullName, role: "ORGANIZER" },
      {
        onSuccess: () => {
          savePendingSignup({ email, password, role: "ORGANIZER" });
          toast.success("Verification code sent to your email.");
          onSuccess(email);
        },
      },
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          type="text"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={registerMutation.isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={registerMutation.isPending}
        />
      </div>

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

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={registerMutation.isPending}
        />
        {confirmPassword && confirmPassword !== password ? (
          <p className="text-xs text-destructive">Passwords do not match.</p>
        ) : null}
      </div>

      <AuthError error={registerMutation.error} />

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={
          registerMutation.isPending ||
          !fullName ||
          !email ||
          password.length < 8 ||
          confirmPassword !== password
        }
      >
        {registerMutation.isPending ? <Spinner /> : null}
        Continue
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

// --- Step 1b: verify email ----------------------------------------------------

function VerifyStep({
  email,
  onAdvance,
  onBack,
}: {
  email: string;
  onAdvance: () => void;
  onBack: () => void;
}) {
  const router = useRouter();
  const verifyMutation = useVerifyEmail();
  const loginMutation = useLogin();
  const resendMutation = useResendOtp();

  const [code, setCode] = useState("");
  const pendingSignup = loadPendingSignup("ORGANIZER");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyMutation.mutate(
      { email, code },
      {
        onSuccess: () => {
          if (
            !pendingSignup ||
            pendingSignup.email.toLowerCase() !== email.toLowerCase()
          ) {
            toast.success("Email verified. Please sign in to continue setup.");
            const next = `/onboarding/organizer?step=details&email=${encodeURIComponent(email)}`;
            router.replace(
              `/login?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`,
            );
            return;
          }

          loginMutation.mutate(
            { email, password: pendingSignup.password },
            {
              onSuccess: (data) => {
                if ("user" in data && data.user) {
                  clearPendingSignup();
                  toast.success("Email verified.");
                  onAdvance();
                } else {
                  const next = `/onboarding/organizer?step=details&email=${encodeURIComponent(email)}`;
                  toast.info("Two-factor verification required.");
                  router.replace(
                    `/login?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`,
                  );
                }
              },
            },
          );
        },
      },
    );
  };

  const onResend = () => {
    resendMutation.mutate(
      { email, purpose: "SIGNUP" },
      { onSuccess: (res) => toast.success(res.message) },
    );
  };

  if (!email) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Missing email. Start over from step 1.
        </div>
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          onClick={onBack}
        >
          Back to step 1
        </Button>
      </div>
    );
  }

  const error = verifyMutation.error ?? loginMutation.error;
  const busy = verifyMutation.isPending || loginMutation.isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        We sent a 6-digit code to{" "}
        <span className="font-medium text-foreground">{email}</span>.
      </p>

      <div className="space-y-1.5">
        <Label>Verification code</Label>
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            autoFocus
            disabled={busy}
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
      </div>

      <AuthError error={error} />

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={code.length !== 6 || busy}
      >
        {busy ? <Spinner /> : null}
        Verify and continue
      </Button>

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Use a different email
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={resendMutation.isPending || busy}
          className="text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {resendMutation.isPending ? "Sending…" : "Resend code"}
        </button>
      </div>
    </form>
  );
}

// --- Step 2: organization details -------------------------------------------

function DetailsStep({
  defaultContactEmail,
  onAdvance,
}: {
  defaultContactEmail: string;
  onAdvance: () => void;
}) {
  const createOrg = useCreateOrganization();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [contactEmail, setContactEmail] = useState(defaultContactEmail);
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  const slugValue = slugTouched ? slug : slugify(name);
  const slugInvalid = slugValue.length > 0 && !SLUG_REGEX.test(slugValue);

  const canSubmit = useMemo(
    () =>
      name.length >= 2 &&
      SLUG_REGEX.test(slugValue) &&
      slugValue.length >= 3 &&
      !!contactEmail,
    [name, slugValue, contactEmail],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    createOrg.mutate(
      {
        name,
        slug: slugValue,
        contactEmail,
        ...(contactPhone ? { contactPhone } : {}),
        ...(address ? { address } : {}),
        ...(description ? { description } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Application submitted.");
          onAdvance();
        },
      },
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="org-name">Organization name</Label>
        <Input
          id="org-name"
          type="text"
          required
          minLength={2}
          maxLength={120}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          disabled={createOrg.isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-slug">URL slug</Label>
        <Input
          id="org-slug"
          type="text"
          required
          minLength={3}
          maxLength={60}
          value={slugValue}
          aria-invalid={slugInvalid || undefined}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          disabled={createOrg.isPending}
        />
        <p
          className={cn(
            "text-xs",
            slugInvalid ? "text-destructive" : "text-muted-foreground",
          )}
        >
          Lowercase letters, numbers and hyphens — e.g. acme-clinic.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-contact-email">Contact email</Label>
        <Input
          id="org-contact-email"
          type="email"
          required
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          disabled={createOrg.isPending}
        />
        <p className="text-xs text-muted-foreground">
          Shown publicly on your booking page.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="org-phone">Phone (optional)</Label>
          <Input
            id="org-phone"
            type="tel"
            maxLength={40}
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            disabled={createOrg.isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-address">Address (optional)</Label>
          <Input
            id="org-address"
            type="text"
            maxLength={500}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={createOrg.isPending}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-desc">Description (optional)</Label>
        <Textarea
          id="org-desc"
          rows={3}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={createOrg.isPending}
        />
      </div>

      <AuthError error={createOrg.error} />

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!canSubmit || createOrg.isPending}
      >
        {createOrg.isPending ? <Spinner /> : null}
        Submit application
      </Button>
    </form>
  );
}

// --- Step 3: submitted -------------------------------------------------------

function SubmittedView({ organization }: { organization: Organization | null }) {
  const router = useRouter();

  return (
    <AuthShell title="Application submitted">
      <Stepper steps={STEPS} currentIndex={2} />

      <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/40 p-5 text-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HugeiconsIcon icon={HourglassIcon} className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              We&apos;ve received your application
            </p>
            <p className="text-muted-foreground">
              Our team will review{" "}
              <span className="text-foreground">
                {organization?.name ?? "your organization"}
              </span>{" "}
              and email you once it&apos;s approved. This usually takes a
              business day.
            </p>
          </div>
        </div>

        {organization ? (
          <dl className="grid grid-cols-3 gap-2 border-t border-border/60 pt-4 text-xs">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="col-span-2 font-medium text-foreground">
              {organization.approvalStatus}
            </dd>
            <dt className="text-muted-foreground">Submitted</dt>
            <dd className="col-span-2 text-foreground">
              {new Date(organization.createdAt).toLocaleDateString()}
            </dd>
            <dt className="text-muted-foreground">Booking URL</dt>
            <dd className="col-span-2 break-all text-foreground">
              /{organization.slug}
            </dd>
          </dl>
        ) : null}
      </div>

      <Button
        size="lg"
        variant="outline"
        className="w-full"
        onClick={() => router.replace("/")}
      >
        Back to home
      </Button>
    </AuthShell>
  );
}
