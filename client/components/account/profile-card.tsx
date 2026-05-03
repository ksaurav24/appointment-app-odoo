"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SafeUser } from "@/types";

type ProfileCardProps = { user: SafeUser };

export function ProfileCard({ user }: ProfileCardProps) {
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base">Profile</CardTitle>
        <CardDescription>Your account information.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Row label="Name" value={user.fullName} />
        <Row label="Email" value={user.email} />
        <Row
          label="Role"
          value={
            <Badge variant="outline" className="font-normal">
              {user.role.toLowerCase()}
            </Badge>
          }
        />
        <Row
          label="Email verified"
          value={user.emailVerified ? "Yes" : "No"}
        />
        <Row label="Member since" value={memberSince} />
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
