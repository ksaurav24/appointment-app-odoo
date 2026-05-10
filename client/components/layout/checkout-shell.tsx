"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
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

type CheckoutShellProps = {
  children: ReactNode;
  confirmExit?: boolean;
  stepIndicator?: ReactNode;
  exitHref?: string;
};

export function CheckoutShell({
  children,
  confirmExit = false,
  stepIndicator,
  exitHref = "/browse",
}: CheckoutShellProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const handleExitClick = () => {
    if (confirmExit) {
      setConfirming(true);
    } else {
      router.push(exitHref);
    }
  };

  const handleConfirmExit = () => {
    setConfirming(false);
    router.push(exitHref);
  };

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b border-cream2 px-6 py-4">
        <Link
          href="/"
          className="font-heading text-lg tracking-tight text-foreground"
        >
          Appointly
        </Link>

        <div className="flex-1 px-6">
          <div className="mx-auto max-w-md">{stepIndicator}</div>
        </div>

        <Button variant="ghost" size="sm" onClick={handleExitClick}>
          Exit
        </Button>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Your selections will be discarded and any held slot will be released.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
