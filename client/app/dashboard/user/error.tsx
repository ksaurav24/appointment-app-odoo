"use client";

// Required error boundary for the dashboard route.
// Must be "use client" — Next.js requires all error.tsx files to be client components.
import { RouteError } from "@/components/shared/route-error";

export default function Error({ reset }: { reset: () => void }) {
  return <RouteError reset={reset} />;
}
