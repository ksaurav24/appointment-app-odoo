"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useDisableTwoFactor, useEnableTwoFactor } from "@/hooks/useAuth";
import type { SafeUser } from "@/types";

type Props = { user: SafeUser };

export function TwoFactorToggle({ user }: Props) {
  const qc = useQueryClient();
  const enable = useEnableTwoFactor();
  const disable = useDisableTwoFactor();
  const [confirmingDisable, setConfirmingDisable] = useState(false);
  const [password, setPassword] = useState("");
  const [disableError, setDisableError] = useState<string | null>(null);

  const onEnable = () => {
    enable.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(res.message);
        qc.invalidateQueries({ queryKey: ["auth", "me"] });
      },
      onError: (err) => {
        toast.error(err.messages[0] ?? "Couldn't enable two-factor auth.");
      },
    });
  };

  const onDisableSubmit = () => {
    setDisableError(null);
    disable.mutate(
      { currentPassword: password },
      {
        onSuccess: (res) => {
          toast.success(res.message);
          setConfirmingDisable(false);
          setPassword("");
          qc.invalidateQueries({ queryKey: ["auth", "me"] });
        },
        onError: (err) => {
          setDisableError(err.messages[0] ?? "Couldn't disable two-factor auth.");
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base">Two-factor authentication</CardTitle>
        <CardDescription>
          When enabled, sign-in requires a one-time code sent to your email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Badge variant={user.twoFactorEnabled ? "default" : "outline"}>
            {user.twoFactorEnabled ? "Enabled" : "Disabled"}
          </Badge>
          {user.twoFactorEnabled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmingDisable(true)}
            >
              Disable
            </Button>
          ) : (
            <Button size="sm" onClick={onEnable} disabled={enable.isPending}>
              {enable.isPending ? <Spinner className="mr-2 size-4" /> : null}
              Enable
            </Button>
          )}
        </div>

        {!user.emailVerified ? (
          <p className="text-xs text-muted-foreground">
            Verify your email first to enable two-factor authentication.
          </p>
        ) : null}
      </CardContent>

      <AlertDialog open={confirmingDisable} onOpenChange={setConfirmingDisable}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your current password to confirm. After this, sign-in will
              only require your password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="disable-2fa-password">Current password</Label>
            <Input
              id="disable-2fa-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {disableError ? (
              <p className="text-sm text-destructive">{disableError}</p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPassword("");
                setDisableError(null);
              }}
              disabled={disable.isPending}
            >
              Keep enabled
            </AlertDialogCancel>
            <AlertDialogAction onClick={onDisableSubmit} disabled={disable.isPending || !password}>
              {disable.isPending ? "Disabling…" : "Disable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
