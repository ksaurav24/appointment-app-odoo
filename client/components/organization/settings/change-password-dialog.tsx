"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useChangePassword } from "@/hooks/useAuth";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const mutation = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      toast.error("New password does not match confirmation.");
      return;
    }
    mutation.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          toast.success("Password updated");
          onOpenChange(false);
          setCurrent("");
          setNext("");
          setConfirm("");
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Update failed";
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-3">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Current password</Label>
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>New password</Label>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm new password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
