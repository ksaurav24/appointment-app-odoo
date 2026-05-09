"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";
import type { AppointmentTypeWithRelations } from "@/types";

type Props = {
  type: AppointmentTypeWithRelations;
};

export function PublishBar({ type }: Props) {
  const {
    publishMutation,
    unpublishMutation,
    regenerateShareTokenMutation,
    archiveMutation,
    unarchiveMutation,
  } = useAppointmentTypeMutations();
  const [copying, setCopying] = useState(false);

  const missing: string[] = [];
  if (type.entities.length === 0) missing.push("at least one entity");
  if ((type.schedules[0]?.rules.length ?? 0) === 0)
    missing.push("at least one schedule rule");
  const canPublish = missing.length === 0 && type.visibility !== "ARCHIVED";
  const isPublished = type.visibility === "PUBLISHED";
  const isArchived = type.visibility === "ARCHIVED";

  const shareUrl =
    type.shareToken && !isArchived
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/book/share/${type.shareToken}`
      : null;

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    } finally {
      setCopying(false);
    }
  };

  const handleRegenerate = () => {
    if (
      !confirm(
        "Regenerate share link? The old link will stop working immediately.",
      )
    )
      return;
    regenerateShareTokenMutation.mutate(type.id, {
      onSuccess: () => toast.success("Share link regenerated"),
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.messages[0] : "Failed to regenerate";
        toast.error(msg);
      },
    });
  };

  const handlePublish = () => {
    publishMutation.mutate(type.id, {
      onSuccess: () => toast.success("Published"),
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.messages[0] : "Failed to publish";
        toast.error(msg);
      },
    });
  };

  const handleUnpublish = () => {
    unpublishMutation.mutate(type.id, {
      onSuccess: () => toast.success("Unpublished"),
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.messages[0] : "Failed to unpublish";
        toast.error(msg);
      },
    });
  };

  const isPublishPending =
    publishMutation.isPending || unpublishMutation.isPending;
  const isArchivePending =
    archiveMutation.isPending || unarchiveMutation.isPending;
  const statusLabel =
    type.visibility.charAt(0) + type.visibility.slice(1).toLowerCase();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card px-6 py-4 ring-1 ring-foreground/10">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <h1 className="truncate text-lg font-semibold">{type.name}</h1>
        <Badge variant={isPublished ? "default" : "secondary"}>
          {statusLabel}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {shareUrl ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              disabled={copying}
            >
              {copying ? "Copying..." : "Copy link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerateShareTokenMutation.isPending}
            >
              Regen link
            </Button>
          </>
        ) : null}

        {isArchived ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              unarchiveMutation.mutate(type.id, {
                onSuccess: () => toast.success("Restored as draft"),
                onError: (err) => {
                  const msg =
                    err instanceof ApiError
                      ? err.messages[0]
                      : "Failed to restore";
                  toast.error(msg);
                },
              })
            }
            disabled={isArchivePending}
          >
            Restore draft
          </Button>
        ) : isPublished ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnpublish}
            disabled={isPublishPending || isArchivePending}
          >
            Unpublish
          </Button>
        ) : canPublish ? (
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={isPublishPending || isArchivePending}
          >
            Publish
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex">
                    <Button size="sm" disabled>
                      Publish
                    </Button>
                  </span>
                }
              />
              <TooltipContent>
                Missing: {missing.join(", ")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {!isArchived ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              archiveMutation.mutate(type.id, {
                onSuccess: () => toast.success("Archived"),
                onError: (err) => {
                  const msg =
                    err instanceof ApiError ? err.messages[0] : "Failed to archive";
                  toast.error(msg);
                },
              })
            }
            disabled={isArchivePending || isPublishPending}
          >
            Archive
          </Button>
        ) : null}
      </div>
    </div>
  );
}
