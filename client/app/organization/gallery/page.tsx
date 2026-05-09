"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyOrganization } from "@/hooks/useOrganization";

export default function OrganizationGalleryPage() {
  const query = useMyOrganization();

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Gallery
          </h1>
          <p className="text-sm text-muted-foreground">
            Media uploaded for your organization.
          </p>
        </header>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Gallery
          </h1>
          <p className="text-sm text-muted-foreground">
            Media uploaded for your organization.
          </p>
        </header>
        <Card>
          <CardContent className="py-8 text-sm text-destructive">
            Could not load gallery right now.
          </CardContent>
        </Card>
      </div>
    );
  }

  const org = query.data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Gallery
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your uploaded logo and showcase images.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Brand logo</CardTitle>
        </CardHeader>
        <CardContent>
          {org.logoUrl ? (
            <img
              src={org.logoUrl}
              alt={`${org.name} logo`}
              className="h-28 w-28 rounded-xl border border-border/60 object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted text-xs text-muted-foreground">
              No logo
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gallery images ({org.galleryImageUrls.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {org.galleryImageUrls.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No gallery images uploaded yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {org.galleryImageUrls.map((url, index) => (
                <a
                  key={`${url}-${index}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-xl border border-border/60 bg-card transition hover:border-primary/40"
                >
                  <img
                    src={url}
                    alt={`Gallery image ${index + 1}`}
                    className="h-48 w-full object-cover"
                  />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
