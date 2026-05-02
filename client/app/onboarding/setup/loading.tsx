import { RouteSkeleton } from "@/components/shared/route-skeleton";

// Shown automatically by Next.js while the page.tsx suspends.
// Uses the same RouteSkeleton as all other pages for consistency.
export default function Loading() {
  return <RouteSkeleton />;
}
