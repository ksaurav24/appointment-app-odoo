"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { ChangePasswordForm } from "@/components/account/change-password-form"
import { ProfileCard } from "@/components/account/profile-card"
import { SignOutEverywhere } from "@/components/account/sign-out-everywhere"
import { TwoFactorToggle } from "@/components/account/two-factor-toggle"
import { PublicShell } from "@/components/layout/public-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentUser } from "@/hooks/useAuth"

export default function AccountPage() {
  const router = useRouter()
  const { data: user, isPending } = useCurrentUser()

  useEffect(() => {
    if (!isPending && !user) {
      router.replace("/login?next=/account")
    }
  }, [user, isPending, router])

  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <header className="mb-6 space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Account
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile, password, and security settings.
          </p>
        </header>

        {isPending || !user ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <ProfileCard user={user} />
            <ChangePasswordForm />
            <TwoFactorToggle user={user} />
            <SignOutEverywhere />
          </div>
        )}
      </div>
    </PublicShell>
  )
}
