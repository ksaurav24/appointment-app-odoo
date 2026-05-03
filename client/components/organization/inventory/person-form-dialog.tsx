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
import { ApiError } from "@/lib/api";
import { useBookablePersonMutations } from "@/hooks/useBookablePersons";
import type { BookablePerson } from "@/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: BookablePerson | null;
};

export function PersonFormDialog({ open, onOpenChange, person }: Props) {
  const isEdit = !!person;
  const { createMutation, updateMutation } = useBookablePersonMutations();

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [isActive, setIsActive] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setName(person?.name ?? "");
      setContactEmail(person?.contactEmail ?? "");
      setPhone(person?.phone ?? "");
      setDesignation(person?.designation ?? "");
      setIsActive(person?.isActive ?? true);
    }
  }, [open, person]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      name: name.trim(),
      contactEmail: contactEmail.trim(),
      phone: phone.trim() || undefined,
      designation: designation.trim() || undefined,
      isActive,
    };
    const onError = (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.messages[0] : "Something went wrong";
      toast.error(msg);
    };
    if (isEdit && person) {
      updateMutation.mutate(
        { id: person.id, body },
        {
          onSuccess: () => {
            toast.success("Person updated");
            onOpenChange(false);
          },
          onError,
        },
      );
    } else {
      createMutation.mutate(body, {
        onSuccess: () => {
          toast.success("Person added");
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
            <DialogTitle>{isEdit ? "Edit person" : "Add person"}</DialogTitle>
            <DialogDescription>
              Bookable persons receive email notifications when their slots
              are booked.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="person-name">Name</Label>
              <Input
                id="person-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="person-email">Contact email</Label>
              <Input
                id="person-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                maxLength={254}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="person-phone">Phone (optional)</Label>
              <Input
                id="person-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="person-designation">Designation (optional)</Label>
              <Input
                id="person-designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="person-active" className="text-sm font-normal">
                Active
              </Label>
              <Switch
                id="person-active"
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
