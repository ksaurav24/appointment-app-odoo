"use client";

// Error boundary for the appointments route.
// Must be "use client" — Next.js requires all error.tsx to be client components.
import { RouteError } from "@/components/shared/route-error";

export default function Error({ reset }: { reset: () => void }) {
  return <RouteError reset={reset} />;
}
