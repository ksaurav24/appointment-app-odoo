"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ChangePasswordDialog } from "@/components/organization/settings/change-password-dialog";
import { DisableTwoFactorDialog } from "@/components/organization/settings/disable-2fa-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import {
  useCurrentUser,
  useEnableTwoFactor,
  useLogoutAll,
} from "@/hooks/useAuth";

export function AccountSection() {
  const router = useRouter();
  const { data: user, isPending } = useCurrentUser();
  const enable2faMutation = useEnableTwoFactor();
  const logoutAllMutation = useLogoutAll();
  const [pwOpen, setPwOpen] = useState(false);
  const [disable2faOpen, setDisable2faOpen] = useState(false);

  const handleEnable = () => {
    enable2faMutation.mutate(undefined, {
      onSuccess: () => toast.success("Two-factor enabled"),
      onError: (err) => {
        const msg = err instanceof ApiError ? err.messages[0] : "Enable failed";
        toast.error(msg);
      },
    });
  };

  const handleLogoutAll = () => {
    if (!confirm("Sign out from all devices? You will need to log in again.")) {
      return;
    }
    logoutAllMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Signed out everywhere");
        router.push("/login");
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.messages[0] : "Logout-all failed";
        toast.error(msg);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account & security</CardTitle>
        <CardDescription>
          Password, two-factor, and active sessions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending ? (
          <Skeleton className="h-12 w-full" />
        ) : user ? (
          <div className="rounded-md border p-3 text-sm">
            <div className="font-medium">{user.fullName}</div>
            <div className="text-muted-foreground">{user.email}</div>
            <div className="mt-1 flex gap-2">
              <Badge variant="outline">{user.role}</Badge>
              {user.emailVerified ? (
                <Badge variant="default">Email verified</Badge>
              ) : (
                <Badge variant="secondary">Email unverified</Badge>
              )}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium text-sm">Password</div>
              <div className="text-xs text-muted-foreground">
                Update your account password.
              </div>
            </div>
            <Button variant="outline" onClick={() => setPwOpen(true)}>
              Change password
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium text-sm">Two-factor</div>
              <div className="text-xs text-muted-foreground">
                {user?.twoFactorEnabled
                  ? "Currently enabled. A code is required at every login."
                  : "Currently disabled."}
              </div>
            </div>
            {user?.twoFactorEnabled ? (
              <Button
                variant="outline"
                onClick={() => setDisable2faOpen(true)}
              >
                Disable
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleEnable}
                disabled={enable2faMutation.isPending}
              >
                {enable2faMutation.isPending ? "Working…" : "Enable"}
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium text-sm">Sessions</div>
              <div className="text-xs text-muted-foreground">
                Sign out of every device, including this one.
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={handleLogoutAll}
              disabled={logoutAllMutation.isPending}
            >
              {logoutAllMutation.isPending ? "Working…" : "Logout everywhere"}
            </Button>
          </div>
        </div>
      </CardContent>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
      <DisableTwoFactorDialog
        open={disable2faOpen}
        onOpenChange={setDisable2faOpen}
      />
    </Card>
  );
}
