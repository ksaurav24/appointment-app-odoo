"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { AtSign, ExternalLink, Globe, Link as LinkIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api"
import { useMyOrganization } from "@/hooks/useOrganization"

export function OrgProfileReadonly() {
  const query = useMyOrganization()

  if (query.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization profile</CardTitle>
          <CardDescription>Loading profile details...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (query.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization profile</CardTitle>
          <CardDescription>Could not load organization details.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            {(query.error as ApiError | undefined)?.messages[0] ??
              "Failed to load organization"}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!query.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No organization on this account.
          </p>
        </CardContent>
      </Card>
    )
  }

  const org = query.data
  const hasCoordinates = org.latitude !== null && org.longitude !== null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization profile</CardTitle>
        <CardDescription>
          Your branding, contact details, and public social links.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-[220px,1fr]">
          <div className="space-y-2">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Brand logo
            </p>
            {org.logoUrl ? (
              <img
                src={org.logoUrl}
                alt={`${org.name} logo`}
                className="h-40 w-full rounded-xl border border-border/60 object-cover"
              />
            ) : (
              <div className="flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted text-xs text-muted-foreground">
                No logo uploaded
              </div>
            )}
          </div>

          <div className="space-y-4">
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Field label="Name" value={org.name} />
              <Field label="Slug" value={org.slug} />
              <Field label="Contact email" value={org.contactEmail} />
              <Field label="Contact phone" value={org.contactPhone ?? "—"} />
              <Field label="City" value={org.city ?? "—"} />
              <Field label="State" value={org.state ?? "—"} />
              <Field label="Address" value={org.address ?? "—"} full />
              <Field
                label="Coordinates"
                value={
                  hasCoordinates ? `${org.latitude}, ${org.longitude}` : "—"
                }
                full
              />
              <Field label="Timezone" value={org.timezone} />
              <Field
                label="Status"
                value={org.approvalStatus}
                badge={
                  org.approvalStatus === "APPROVED"
                    ? "default"
                    : org.approvalStatus === "PENDING"
                      ? "secondary"
                      : "destructive"
                }
              />
              <Field
                label="Active"
                value={org.isActive ? "Yes" : "No"}
                badge={org.isActive ? "default" : "outline"}
              />
            </dl>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Gallery images ({org.galleryImageUrls.length})
            </p>
            <Link
              href="/organization/gallery"
              className="text-xs font-medium text-primary hover:underline"
            >
              Open gallery
            </Link>
          </div>
          {org.galleryImageUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {org.galleryImageUrls.slice(0, 4).map((url, index) => (
                <img
                  key={`${url}-${index}`}
                  src={url}
                  alt={`Gallery preview ${index + 1}`}
                  className="h-24 w-full rounded-lg border border-border/60 object-cover"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No gallery images uploaded yet.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Social links
          </p>
          <div className="flex flex-wrap gap-2">
            <SocialLink href={org.instagramUrl} label="Instagram">
              <AtSign className="size-4" />
            </SocialLink>
            <SocialLink href={org.facebookUrl} label="Facebook">
              <LinkIcon className="size-4" />
            </SocialLink>
            <SocialLink href={org.twitterUrl} label="Twitter / X">
              <ExternalLink className="size-4" />
            </SocialLink>
            <SocialLink href={org.websiteUrl} label="Website">
              <Globe className="size-4" />
            </SocialLink>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string | null
  label: string
  children: ReactNode
}) {
  if (!href) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
        {children}
        {label}
      </div>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
    >
      {children}
      {label}
    </a>
  )
}

function Field({
  label,
  value,
  full,
  badge,
}: {
  label: string
  value: string
  full?: boolean
  badge?: "default" | "secondary" | "outline" | "destructive"
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5">
        {badge ? <Badge variant={badge}>{value}</Badge> : value}
      </dd>
    </div>
  )
}
