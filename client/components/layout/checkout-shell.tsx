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
    <div className="flex min-h-svh flex-col bg-cream text-slate-dark">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-cream-2 bg-white/95 px-6 backdrop-blur-sm">
        <Link
          href="/"
          className="font-heading text-lg tracking-tight text-forest flex items-center gap-2"
        >
          <svg className="w-5 h-5 text-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Appointly
        </Link>

        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-sm">{stepIndicator}</div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-slate-mid hover:text-slate-dark font-semibold"
          onClick={handleExitClick}
        >
          ✕ Exit
        </Button>
      </header>

      <main className="flex flex-1 flex-col items-center py-10 px-4">
        {children}
      </main>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent className="bg-white border-cream-2 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-xl text-slate-dark">Leave booking?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-mid">
              Your selections will be discarded and any held slot will be released.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-semibold text-slate-dark hover:bg-slate-pale">Stay</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit} className="bg-coral hover:bg-coral/90 text-white rounded-xl font-semibold">
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
