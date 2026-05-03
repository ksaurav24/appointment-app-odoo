"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

type Props = {
  reason?: string;
};

export function EndedScreen({ reason }: Props) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-20 text-center text-white">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Call ended
      </h1>
      <p className="text-sm text-white/70">
        {reason ?? "The meeting has finished. You can safely close this tab."}
      </p>
      <Button variant="outline" render={<Link href="/bookings" />}>
        Back to bookings
      </Button>
    </div>
  );
}
