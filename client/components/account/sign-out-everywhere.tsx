"use client";

import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useLogoutAll } from "@/hooks/useAuth";

export function SignOutEverywhere() {
  const router = useRouter();
  const logoutAll = useLogoutAll();
  const [confirming, setConfirming] = useState(false);

  const onSubmit = () => {
    logoutAll.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(res.message);
        setConfirming(false);
        router.push("/login");
      },
      onError: (err) => {
        toast.error(err.messages[0] ?? "Couldn't sign out of all sessions.");
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base">Active sessions</CardTitle>
        <CardDescription>
          Sign out of every device where you&apos;re currently signed in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          onClick={() => setConfirming(true)}
          disabled={logoutAll.isPending}
        >
          {logoutAll.isPending ? <Spinner className="mr-2 size-4" /> : null}
          Sign out everywhere
        </Button>
      </CardContent>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of all sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll need to sign in again on every device, including this one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={logoutAll.isPending}>
              Stay signed in
            </AlertDialogCancel>
            <AlertDialogAction onClick={onSubmit} disabled={logoutAll.isPending}>
              {logoutAll.isPending ? "Signing out…" : "Sign out everywhere"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
