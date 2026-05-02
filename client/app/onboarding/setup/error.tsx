"use client";

// Error boundary for Step 1 route.
// Must be "use client" \u2014 Next.js requires error.tsx to be a client component.
import { RouteError } from "@/components/shared/route-error";

export default function Error({ reset }: { reset: () => void }) {
  return <RouteError reset={reset} />;
}
