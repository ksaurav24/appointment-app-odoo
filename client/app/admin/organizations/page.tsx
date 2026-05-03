"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import {
  useAdminOrganizationMutations,
  useAdminOrganizations,
} from "@/hooks/useAdminOrganizations";
import type {
  AdminOrganizationStatusFilter,
  OrganizationWithOrganiser,
} from "@/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const STATUS_TABS: { value: AdminOrganizationStatusFilter; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

export default function AdminOrganizationsPage() {
  const [status, setStatus] = useState<AdminOrganizationStatusFilter>(
    "PENDING",
  );
  const [rejectTarget, setRejectTarget] =
    useState<OrganizationWithOrganiser | null>(null);

  const orgsQuery = useAdminOrganizations(status);
  const {
    approveMutation,
    activateMutation,
    deactivateMutation,
  } = useAdminOrganizationMutations();

  const items = orgsQuery.data ?? [];

  const onApprove = (org: OrganizationWithOrganiser) => {
    approveMutation.mutate(org.id, {
      onSuccess: () => toast.success(`${org.name} approved`),
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.messages[0] : "Failed"),
    });
  };

  const onToggleActive = (org: OrganizationWithOrganiser) => {
    const action = org.isActive ? deactivateMutation : activateMutation;
    action.mutate(org.id, {
      onSuccess: (updated) => {
        toast.success(
          updated.isActive
            ? `${org.name} activated`
            : `${org.name} deactivated`,
        );
      },
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.messages[0] : "Failed"),
    });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Organizations
        </h1>
        <p className="text-sm text-muted-foreground">
          Approve, reject, and toggle organization activity.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {STATUS_TABS.find((t) => t.value === status)?.label}
          </CardTitle>
          <Tabs
            value={status}
            onValueChange={(v) =>
              setStatus(v as AdminOrganizationStatusFilter)
            }
          >
            <TabsList>
              {STATUS_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgsQuery.isPending ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No organizations in this status.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-medium">{org.name}</div>
                        <div className="text-xs text-muted-foreground">
                          /{org.slug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="text-sm">{org.organiser.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {org.organiser.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={org.approvalStatus} />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={org.isActive ? "default" : "destructive"}
                      >
                        {org.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {org.approvalStatus === "PENDING" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => onApprove(org)}
                              disabled={approveMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setRejectTarget(org)}
                            >
                              Reject
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant={
                              org.isActive ? "destructive" : "default"
                            }
                            onClick={() => onToggleActive(org)}
                            disabled={
                              activateMutation.isPending ||
                              deactivateMutation.isPending
                            }
                          >
                            {org.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RejectDialog
        org={rejectTarget}
        onClose={() => setRejectTarget(null)}
      />
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: OrganizationWithOrganiser["approvalStatus"];
}) {
  const map: Record<
    typeof status,
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
  > = {
    PENDING: { variant: "secondary", label: "Pending" },
    APPROVED: { variant: "default", label: "Approved" },
    REJECTED: { variant: "destructive", label: "Rejected" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function RejectDialog({
  org,
  onClose,
}: {
  org: OrganizationWithOrganiser | null;
  onClose: () => void;
}) {
  const { rejectMutation } = useAdminOrganizationMutations();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (org) setReason("");
  }, [org]);

  const submit = () => {
    if (!org) return;
    rejectMutation.mutate(
      {
        organizationId: org.id,
        body: reason.trim() ? { reason: reason.trim() } : {},
      },
      {
        onSuccess: () => {
          toast.success(`${org.name} rejected`);
          onClose();
        },
        onError: (err) => {
          toast.error(
            err instanceof ApiError ? err.messages[0] : "Failed",
          );
        },
      },
    );
  };

  return (
    <Dialog open={!!org} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject organization</DialogTitle>
          <DialogDescription>
            {org ? (
              <>
                This will mark <strong>{org.name}</strong> as rejected.
                Optionally include a reason to share with the organizer.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label htmlFor="reject-reason" className="text-xs">
            Reason (optional, max 1000 chars)
          </Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            placeholder="Why is this being rejected?"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={rejectMutation.isPending}
          >
            {rejectMutation.isPending ? <Spinner className="size-4" /> : null}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
