"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useBookableResourceMutations } from "@/hooks/useBookableResources";
import type { BookableResource, ResourceTypeValue } from "@/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: BookableResource | null;
};

const RESOURCE_TYPE_OPTIONS: Array<{
  value: ResourceTypeValue;
  label: string;
}> = [
  { value: "ROOM", label: "Room" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "VENUE", label: "Venue" },
  { value: "OTHER", label: "Other" },
];

export function ResourceFormDialog({ open, onOpenChange, resource }: Props) {
  const isEdit = !!resource;
  const { createMutation, updateMutation } = useBookableResourceMutations();

  const [name, setName] = useState("");
  const [resourceType, setResourceType] = useState<ResourceTypeValue>("ROOM");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState(1);
  const [location, setLocation] = useState("");
  const [isActive, setIsActive] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setName(resource?.name ?? "");
      setResourceType(resource?.resourceType ?? "ROOM");
      setDescription(resource?.description ?? "");
      setCapacity(resource?.capacity ?? 1);
      setLocation(resource?.location ?? "");
      setIsActive(resource?.isActive ?? true);
    }
  }, [open, resource]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      name: name.trim(),
      resourceType,
      description: description.trim() || undefined,
      capacity,
      location: location.trim() || undefined,
      isActive,
    };
    const onError = (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.messages[0] : "Something went wrong";
      toast.error(msg);
    };
    if (isEdit && resource) {
      updateMutation.mutate(
        { id: resource.id, body },
        {
          onSuccess: () => {
            toast.success("Resource updated");
            onOpenChange(false);
          },
          onError,
        },
      );
    } else {
      createMutation.mutate(body, {
        onSuccess: () => {
          toast.success("Resource added");
          onOpenChange(false);
        },
        onError,
      });
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit resource" : "Add resource"}
            </DialogTitle>
            <DialogDescription>
              Resources are rooms or equipment that can be booked.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="res-name">Name</Label>
              <Input
                id="res-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-type">Type</Label>
              <select
                id="res-type"
                value={resourceType}
                onChange={(e) =>
                  setResourceType(e.target.value as ResourceTypeValue)
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {RESOURCE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-capacity">Capacity</Label>
              <Input
                id="res-capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) =>
                  setCapacity(Math.max(1, Number(e.target.value) || 1))
                }
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-location">Location / room number</Label>
              <Input
                id="res-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-desc">Description (optional)</Label>
              <Textarea
                id="res-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="res-active" className="text-sm font-normal">
                Active
              </Label>
              <Switch
                id="res-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
