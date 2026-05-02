"use client";

import { Button } from "@/components/ui/button";

interface RouteErrorProps {
  reset: () => void;
}

export function RouteError({ reset }: RouteErrorProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-8 text-center">
      <p className="text-sm text-gray-700">Something went wrong loading this page.</p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
