"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMyOrganization } from "@/hooks/useOrganization";

export function OrgApprovalBanner() {
  const { data: org, isPending, isError } = useMyOrganization();

  if (isPending || isError || !org || org.approvalStatus === "APPROVED") {
    return null;
  }

  if (org.approvalStatus === "PENDING") {
    return (
      <div className="mb-4">
        <Alert variant="default">
          <HugeiconsIcon icon={AlertCircleIcon} />
          <AlertTitle>Awaiting admin approval</AlertTitle>
          <AlertDescription>
            Your published services won&apos;t appear in the public browse list
            or be accessible by ID until an admin approves your organization.
            Share-link tokens stay private regardless of approval state.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const reason = org.rejectedReason?.trim();

  return (
    <div className="mb-4">
      <Alert variant="destructive">
        <HugeiconsIcon icon={AlertCircleIcon} />
        <AlertTitle>Organization rejected</AlertTitle>
        <AlertDescription>
          <p>
            Your services are hidden from the public site. Please contact an
            admin to resolve this.
          </p>
          {reason ? <p>Reason: {reason}</p> : null}
        </AlertDescription>
      </Alert>
    </div>
  );
}
