"use client"

import { HourglassIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { toast } from "sonner"

import { ApiError } from "@/lib/api"
import { uploadImageToCloudinary } from "@/lib/cloudinary"
import { geocodeIndianAddress, type GeocodeSuggestion } from "@/lib/google-maps"

import { AuthError } from "@/components/auth/auth-error"
import { AuthShell } from "@/components/auth/auth-shell"
import { Stepper } from "@/components/onboarding/stepper"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  useCurrentUser,
  useLogin,
  useRegister,
  useResendOtp,
  useVerifyEmail,
} from "@/hooks/useAuth"
import {
  useCreateOrganization,
  useMyOrganization,
} from "@/hooks/useOrganization"
import {
  clearPendingSignup,
  loadPendingSignup,
  savePendingSignup,
} from "@/lib/pending-signup"
import { cn } from "@/lib/utils"
import type { Organization } from "@/types"

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const IN_CONTACT_PHONE_REGEX = /^\d{10}$/

type Stage =
  | "personal"
  | "verify"
  | "org-step-1"
  | "org-step-2"
  | "org-step-3"
  | "org-step-4"
  | "submitted"

type OrgStage = "org-step-1" | "org-step-2" | "org-step-3" | "org-step-4"

type OrganizationDraft = {
  name: string
  slug: string
  slugTouched: boolean
  description: string
  contactEmail: string
  contactPhone: string
  city: string
  state: string
  address: string
  latitude: number | null
  longitude: number | null
  googlePlaceId: string
  logoFile: File | null
  logoPreviewUrl: string
  galleryFiles: File[]
  galleryPreviewUrls: string[]
  instagramUrl: string
  facebookUrl: string
  twitterUrl: string
  websiteUrl: string
}

const STAGES: Stage[] = [
  "personal",
  "verify",
  "org-step-1",
  "org-step-2",
  "org-step-3",
  "org-step-4",
  "submitted",
]

const ORG_STEPS = [
  { key: "org-step-1", label: "Basics" },
  { key: "org-step-2", label: "Contact & location" },
  { key: "org-step-3", label: "Branding" },
  { key: "org-step-4", label: "Review" },
]

function isOrgStage(stage: Stage): stage is OrgStage {
  return (
    stage === "org-step-1" ||
    stage === "org-step-2" ||
    stage === "org-step-3" ||
    stage === "org-step-4"
  )
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function parseStage(raw: string | null): Stage {
  if (raw === "details") return "org-step-1"
  return STAGES.includes(raw as Stage) ? (raw as Stage) : "personal"
}

function orgStepIndex(stage: Stage): number {
  if (stage === "org-step-1") return 0
  if (stage === "org-step-2") return 1
  if (stage === "org-step-3") return 2
  return 3
}

function normalizeOptionalUrl(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function isValidOptionalUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export function OrganizerWizard() {
  const router = useRouter()
  const search = useSearchParams()

  const stage = parseStage(search.get("step"))
  const emailParam = search.get("email") ?? ""

  const userQuery = useCurrentUser()
  const orgQuery = useMyOrganization(!!userQuery.data)
  const createOrg = useCreateOrganization()
  const defaultContactEmail = userQuery.data?.email ?? emailParam

  const [submitting, setSubmitting] = useState(false)
  const [draft, setDraft] = useState<OrganizationDraft>({
    name: "",
    slug: "",
    slugTouched: false,
    description: "",
    contactEmail: emailParam,
    contactPhone: "",
    city: "",
    state: "",
    address: "",
    latitude: null,
    longitude: null,
    googlePlaceId: "",
    logoFile: null,
    logoPreviewUrl: "",
    galleryFiles: [],
    galleryPreviewUrls: [],
    instagramUrl: "",
    facebookUrl: "",
    twitterUrl: "",
    websiteUrl: "",
  })

  // Reconcile URL stage with backend state.
  useEffect(() => {
    if (userQuery.isPending) return
    if (userQuery.data && orgQuery.isPending) return

    const target = inferStage({
      currentStage: stage,
      user: userQuery.data ?? null,
      org: orgQuery.data ?? null,
    })

    if (target && target !== stage) {
      const params = new URLSearchParams(search.toString())
      params.set("step", target)
      router.replace(`/onboarding/organizer?${params.toString()}`)
    }
  }, [
    stage,
    search,
    router,
    userQuery.isPending,
    userQuery.data,
    orgQuery.isPending,
    orgQuery.data,
  ])

  const goTo = (next: Stage, extra?: Record<string, string>) => {
    const params = new URLSearchParams()
    params.set("step", next)
    if (extra) {
      for (const [k, v] of Object.entries(extra)) params.set(k, v)
    }
    router.replace(`/onboarding/organizer?${params.toString()}`)
  }

  const submitOrganization = async () => {
    if (
      !draft.logoFile ||
      !IN_CONTACT_PHONE_REGEX.test(draft.contactPhone)
    ) {
      toast.error("Please complete all required fields before submitting.")
      return
    }

    setSubmitting(true)
    try {
      const logoUrl = await uploadImageToCloudinary(draft.logoFile, {
        folder: "organizations/logos",
      })
      localStorage.setItem("bookease:organizer-logo-url", logoUrl)
      const galleryImageUrls: string[] = []
      for (const file of draft.galleryFiles.slice(0, 5)) {
        galleryImageUrls.push(
          await uploadImageToCloudinary(file, {
            folder: "organizations/gallery",
          })
        )
      }

      await createOrg.mutateAsync({
        name: draft.name.trim(),
        slug: draft.slug.trim().toLowerCase(),
        description: draft.description.trim(),
        contactEmail:
          draft.contactEmail.trim() || defaultContactEmail || undefined,
        contactPhone: draft.contactPhone.trim(),
        city: draft.city.trim(),
        state: draft.state.trim(),
        address: draft.address.trim(),
        ...(draft.latitude !== null ? { latitude: draft.latitude } : {}),
        ...(draft.longitude !== null ? { longitude: draft.longitude } : {}),
        googlePlaceId: draft.googlePlaceId.trim() || undefined,
        logoUrl,
        galleryImageUrls,
        instagramUrl: normalizeOptionalUrl(draft.instagramUrl),
        facebookUrl: normalizeOptionalUrl(draft.facebookUrl),
        twitterUrl: normalizeOptionalUrl(draft.twitterUrl),
        websiteUrl: normalizeOptionalUrl(draft.websiteUrl),
        timezone: "Asia/Kolkata",
      })

      toast.success("Application submitted.")
      goTo("submitted")
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.messages[0]
          : err instanceof Error
            ? err.message
            : "Could not submit your organization. Please retry."
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (userQuery.isPending || (userQuery.data && orgQuery.isPending)) {
    return (
      <AuthShell title="Become an organizer">
        <div className="flex justify-center py-6">
          <Spinner className="size-5" />
        </div>
      </AuthShell>
    )
  }

  if (stage === "submitted") {
    return <SubmittedView organization={orgQuery.data ?? null} />
  }

  return (
    <AuthShell
      title="Become an organizer"
      description={
        isOrgStage(stage)
          ? "Complete your organization profile in 4 steps."
          : "Create your organizer account and verify your email."
      }
    >
      {isOrgStage(stage) ? (
        <Stepper steps={ORG_STEPS} currentIndex={orgStepIndex(stage)} />
      ) : null}

      {stage === "personal" ? (
        <PersonalStep onSuccess={(email) => goTo("verify", { email })} />
      ) : null}

      {stage === "verify" ? (
        <VerifyStep
          email={emailParam}
          onAdvance={() => goTo("org-step-1")}
          onBack={() => goTo("personal")}
        />
      ) : null}

      {stage === "org-step-1" ? (
        <OrgBasicsStep
          draft={draft}
          setDraft={setDraft}
          onNext={() => goTo("org-step-2")}
        />
      ) : null}

      {stage === "org-step-2" ? (
        <OrgContactStep
          draft={draft}
          setDraft={setDraft}
          defaultContactEmail={defaultContactEmail}
          onBack={() => goTo("org-step-1")}
          onNext={() => goTo("org-step-3")}
        />
      ) : null}

      {stage === "org-step-3" ? (
        <OrgBrandingStep
          draft={draft}
          setDraft={setDraft}
          onBack={() => goTo("org-step-2")}
          onNext={() => goTo("org-step-4")}
        />
      ) : null}

      {stage === "org-step-4" ? (
        <OrgReviewStep
          draft={draft}
          onBack={() => goTo("org-step-3")}
          onSubmit={submitOrganization}
          submitting={submitting}
          error={createOrg.error}
        />
      ) : null}
    </AuthShell>
  )
}

function inferStage({
  currentStage,
  user,
  org,
}: {
  currentStage: Stage
  user: { role: string } | null
  org: Organization | null
}): Stage | null {
  if (org) return currentStage === "submitted" ? null : "submitted"

  if (user) {
    if (isOrgStage(currentStage)) return null
    return "org-step-1"
  }

  if (currentStage === "personal" || currentStage === "verify") return null
  return "personal"
}

function PersonalStep({ onSuccess }: { onSuccess: (email: string) => void }) {
  const registerMutation = useRegister()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    registerMutation.mutate(
      { email, password, fullName, role: "ORGANIZER" },
      {
        onSuccess: () => {
          savePendingSignup({ email, password, role: "ORGANIZER" })
          toast.success("Verification code sent to your email.")
          onSuccess(email)
        },
      }
    )
  }

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
  )
}

function VerifyStep({
  email,
  onAdvance,
  onBack,
}: {
  email: string
  onAdvance: () => void
  onBack: () => void
}) {
  const router = useRouter()
  const verifyMutation = useVerifyEmail()
  const loginMutation = useLogin()
  const resendMutation = useResendOtp()

  const [code, setCode] = useState("")
  const pendingSignup = loadPendingSignup("ORGANIZER")

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    verifyMutation.mutate(
      { email, code },
      {
        onSuccess: () => {
          if (
            !pendingSignup ||
            pendingSignup.email.toLowerCase() !== email.toLowerCase()
          ) {
            toast.success("Email verified. Please sign in to continue setup.")
            const next = "/onboarding/organizer?step=org-step-1"
            router.replace(
              `/login?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`
            )
            return
          }

          loginMutation.mutate(
            { email, password: pendingSignup.password },
            {
              onSuccess: (data) => {
                if ("user" in data && data.user) {
                  clearPendingSignup()
                  toast.success("Email verified.")
                  onAdvance()
                } else {
                  const next = "/onboarding/organizer?step=org-step-1"
                  toast.info("Two-factor verification required.")
                  router.replace(
                    `/login?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`
                  )
                }
              },
            }
          )
        },
      }
    )
  }

  const onResend = () => {
    resendMutation.mutate(
      { email, purpose: "SIGNUP" },
      { onSuccess: (res) => toast.success(res.message) }
    )
  }

  if (!email) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Missing email. Start over from step 1.
        </div>
        <Button size="lg" variant="outline" className="w-full" onClick={onBack}>
          Back to step 1
        </Button>
      </div>
    )
  }

  const error = verifyMutation.error ?? loginMutation.error
  const busy = verifyMutation.isPending || loginMutation.isPending

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
  )
}

function OrgBasicsStep({
  draft,
  setDraft,
  onNext,
}: {
  draft: OrganizationDraft
  setDraft: Dispatch<SetStateAction<OrganizationDraft>>
  onNext: () => void
}) {
  const slugValue = draft.slugTouched ? draft.slug : slugify(draft.name)
  const slugInvalid = slugValue.length > 0 && !SLUG_REGEX.test(slugValue)
  const canContinue =
    draft.name.trim().length >= 2 &&
    draft.description.trim().length >= 2 &&
    !slugInvalid &&
    slugValue.length >= 3

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canContinue) return
    setDraft((prev) => ({ ...prev, slug: slugValue }))
    onNext()
  }

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
          value={draft.name}
          onChange={(e) =>
            setDraft((prev) => ({
              ...prev,
              name: e.target.value,
              slug: prev.slugTouched ? prev.slug : slugify(e.target.value),
            }))
          }
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
          onChange={(e) =>
            setDraft((prev) => ({
              ...prev,
              slugTouched: true,
              slug: e.target.value.toLowerCase(),
            }))
          }
        />
        <p
          className={cn(
            "text-xs",
            slugInvalid ? "text-destructive" : "text-muted-foreground"
          )}
        >
          Auto-generated and editable. Use lowercase letters, numbers, and
          hyphens.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-description">Organization description</Label>
        <Textarea
          id="org-description"
          rows={4}
          required
          minLength={2}
          maxLength={2000}
          value={draft.description}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, description: e.target.value }))
          }
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!canContinue}
      >
        Continue to contact & location
      </Button>
    </form>
  )
}

function OrgContactStep({
  draft,
  setDraft,
  defaultContactEmail,
  onBack,
  onNext,
}: {
  draft: OrganizationDraft
  setDraft: Dispatch<SetStateAction<OrganizationDraft>>
  defaultContactEmail: string
  onBack: () => void
  onNext: () => void
}) {
  const [searchQuery, setSearchQuery] = useState(draft.address)
  const [results, setResults] = useState<GeocodeSuggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedPlaceId, setSelectedPlaceId] = useState(draft.googlePlaceId)
  const hasMapsKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)

  const onSearch = async () => {
    const query = searchQuery.trim() || draft.address.trim()
    if (!query) {
      toast.error("Enter an address to search on Google Maps.")
      return
    }
    setSearching(true)
    try {
      const suggestions = await geocodeIndianAddress(query)
      setResults(suggestions)
      if (suggestions.length === 0) {
        toast.error("No matching locations found in India.")
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not fetch map locations."
      )
    } finally {
      setSearching(false)
    }
  }

  const applySuggestion = (suggestion: GeocodeSuggestion) => {
    setSelectedPlaceId(suggestion.placeId)
    setSearchQuery(suggestion.formattedAddress)
    setDraft((prev) => ({
      ...prev,
      address: suggestion.formattedAddress,
      city: suggestion.city || prev.city,
      state: suggestion.state || prev.state,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      googlePlaceId: suggestion.placeId,
    }))
  }

  const canContinue =
    IN_CONTACT_PHONE_REGEX.test(draft.contactPhone) &&
    draft.city.trim().length >= 2 &&
    draft.state.trim().length >= 2 &&
    draft.address.trim().length >= 5

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canContinue) return
    onNext()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="org-contact-email">
          Contact email (default from account)
        </Label>
        <Input
          id="org-contact-email"
          type="email"
          value={draft.contactEmail || defaultContactEmail}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, contactEmail: e.target.value }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-phone">Contact number (India)</Label>
        <Input
          id="org-phone"
          type="tel"
          inputMode="numeric"
          pattern="\d{10}"
          required
          maxLength={10}
          placeholder="10-digit number"
          value={draft.contactPhone}
          onChange={(e) =>
            setDraft((prev) => ({
              ...prev,
              contactPhone: e.target.value.replace(/\D/g, "").slice(0, 10),
            }))
          }
        />
        <p className="text-xs text-muted-foreground">
          Must be exactly 10 digits (India).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="org-city">City</Label>
          <Input
            id="org-city"
            type="text"
            required
            maxLength={120}
            value={draft.city}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, city: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-state">State</Label>
          <Input
            id="org-state"
            type="text"
            required
            maxLength={120}
            value={draft.state}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, state: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-address">Full address</Label>
        <Textarea
          id="org-address"
          rows={3}
          required
          maxLength={500}
          value={draft.address}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, address: e.target.value }))
          }
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
        <p className="text-sm font-medium text-foreground">
          Select on Google Maps
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Search your location and choose the correct result (optional for now).
        </p>

        <div className="mt-3 flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search (e.g. Akurdi, Pune)"
            disabled={!hasMapsKey || searching}
          />
          <Button
            type="button"
            variant="outline"
            onClick={onSearch}
            disabled={!hasMapsKey || searching}
          >
            {searching ? <Spinner className="size-4" /> : null}
            Search
          </Button>
        </div>

        {!hasMapsKey ? (
          <p className="mt-2 text-xs text-destructive">
            Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. Add it to enable location
            selection. You can continue with manual address/city/state details.
          </p>
        ) : null}

        {results.length > 0 ? (
          <div className="mt-3 space-y-2">
            {results.map((result) => (
              <button
                key={result.placeId}
                type="button"
                onClick={() => applySuggestion(result)}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left text-xs transition",
                  selectedPlaceId === result.placeId
                    ? "border-primary bg-primary/5"
                    : "border-border/70 hover:border-border"
                )}
              >
                <p className="font-medium text-foreground">
                  {result.formattedAddress}
                </p>
                <p className="text-muted-foreground">
                  {result.city || "—"}, {result.state || "—"}
                </p>
              </button>
            ))}
          </div>
        ) : null}

        {draft.latitude !== null && draft.longitude !== null ? (
          <div className="mt-3 overflow-hidden rounded-lg border border-border/60">
            <iframe
              title="Selected organization location"
              src={`https://maps.google.com/maps?q=${draft.latitude},${draft.longitude}&z=15&output=embed`}
              className="h-56 w-full"
              loading="lazy"
            />
          </div>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!canContinue}
        >
          Continue to branding
        </Button>
      </div>
    </form>
  )
}

function OrgBrandingStep({
  draft,
  setDraft,
  onBack,
  onNext,
}: {
  draft: OrganizationDraft
  setDraft: Dispatch<SetStateAction<OrganizationDraft>>
  onBack: () => void
  onNext: () => void
}) {
  const socialLinksValid =
    isValidOptionalUrl(draft.instagramUrl) &&
    isValidOptionalUrl(draft.facebookUrl) &&
    isValidOptionalUrl(draft.twitterUrl) &&
    isValidOptionalUrl(draft.websiteUrl)

  const canContinue =
    !!draft.logoFile && draft.galleryFiles.length <= 5 && socialLinksValid

  const onLogoChange = (file: File | null) => {
    setDraft((prev) => {
      if (prev.logoPreviewUrl) {
        URL.revokeObjectURL(prev.logoPreviewUrl)
      }
      return {
        ...prev,
        logoFile: file,
        logoPreviewUrl: file ? URL.createObjectURL(file) : "",
      }
    })
  }

  const onGalleryChange = (files: File[]) => {
    setDraft((prev) => {
      prev.galleryPreviewUrls.forEach((url) => URL.revokeObjectURL(url))
      return {
        ...prev,
        galleryFiles: files,
        galleryPreviewUrls: files.map((file) => URL.createObjectURL(file)),
      }
    })
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canContinue) return
    onNext()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="org-logo">Brand logo (required)</Label>
        <Input
          id="org-logo"
          type="file"
          accept="image/*"
          required
          onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
        />
        {draft.logoPreviewUrl ? (
          <div className="mt-2 overflow-hidden rounded-lg border border-border/60">
            <img
              src={draft.logoPreviewUrl}
              alt="Logo preview"
              className="h-40 w-full bg-muted/30 object-contain"
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="org-gallery">Gallery images (optional, max 5)</Label>
        <Input
          id="org-gallery"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) =>
            onGalleryChange(Array.from(e.target.files ?? []).slice(0, 5))
          }
        />
        <p className="text-xs text-muted-foreground">
          Add up to 5 photos (e.g. turf/hospital pictures).
        </p>
        {draft.galleryPreviewUrls.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {draft.galleryPreviewUrls.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="overflow-hidden rounded-lg border border-border/60"
              >
                <img
                  src={url}
                  alt={`Gallery preview ${index + 1}`}
                  className="h-28 w-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="instagram">Instagram (optional)</Label>
        <Input
          id="instagram"
          type="url"
          placeholder="https://instagram.com/yourbrand"
          value={draft.instagramUrl}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, instagramUrl: e.target.value }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="facebook">Facebook (optional)</Label>
        <Input
          id="facebook"
          type="url"
          placeholder="https://facebook.com/yourbrand"
          value={draft.facebookUrl}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, facebookUrl: e.target.value }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="twitter">Twitter / X (optional)</Label>
        <Input
          id="twitter"
          type="url"
          placeholder="https://twitter.com/yourbrand"
          value={draft.twitterUrl}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, twitterUrl: e.target.value }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="website">Website (optional)</Label>
        <Input
          id="website"
          type="url"
          placeholder="https://yourbrand.com"
          value={draft.websiteUrl}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, websiteUrl: e.target.value }))
          }
        />
      </div>

      {!socialLinksValid ? (
        <p className="text-xs text-destructive">
          One or more social links are invalid. Use full URLs with https://
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!canContinue}
        >
          Continue to review
        </Button>
      </div>
    </form>
  )
}

function OrgReviewStep({
  draft,
  onBack,
  onSubmit,
  submitting,
  error,
}: {
  draft: OrganizationDraft
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
  error: ApiError | null
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
        <p className="font-medium text-foreground">
          Review organization details
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Confirm everything before submitting for admin approval.
        </p>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <ReviewField label="Organization name" value={draft.name} />
          <ReviewField label="Slug" value={draft.slug} />
          <ReviewField label="Description" value={draft.description} full />
          <ReviewField
            label="Contact email"
            value={draft.contactEmail || "—"}
          />
          <ReviewField label="Contact number" value={draft.contactPhone} />
          <ReviewField label="City" value={draft.city} />
          <ReviewField label="State" value={draft.state} />
          <ReviewField label="Address" value={draft.address} full />
          <ReviewField
            label="Coordinates"
            value={
              draft.latitude !== null && draft.longitude !== null
                ? `${draft.latitude}, ${draft.longitude}`
                : "—"
            }
            full
          />
        </dl>

        {draft.logoPreviewUrl ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-foreground">Logo</p>
            <div className="overflow-hidden rounded-lg border border-border/60">
              <img
                src={draft.logoPreviewUrl}
                alt="Logo preview"
                className="h-36 w-full bg-muted/20 object-contain"
              />
            </div>
          </div>
        ) : null}

        {draft.galleryPreviewUrls.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-foreground">Gallery</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {draft.galleryPreviewUrls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="overflow-hidden rounded-lg border border-border/60"
                >
                  <img
                    src={url}
                    alt={`Gallery preview ${index + 1}`}
                    className="h-24 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <dl className="mt-4 grid grid-cols-1 gap-2 text-xs">
          <ReviewField label="Instagram" value={draft.instagramUrl || "—"} />
          <ReviewField label="Facebook" value={draft.facebookUrl || "—"} />
          <ReviewField label="Twitter / X" value={draft.twitterUrl || "—"} />
          <ReviewField label="Website" value={draft.websiteUrl || "—"} />
        </dl>
      </div>

      <AuthError error={error} />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? <Spinner /> : null}
          Review complete — submit for approval
        </Button>
      </div>
    </div>
  )
}

function ReviewField({
  label,
  value,
  full,
}: {
  label: string
  value: string
  full?: boolean
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}

function SubmittedView({
  organization,
}: {
  organization: Organization | null
}) {
  const router = useRouter()

  return (
    <AuthShell title="Application submitted">
      <Stepper steps={ORG_STEPS} currentIndex={3} />

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
              and email you once it&apos;s approved.
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
  )
}
