"use client";

import { RouteError } from "@/components/shared/route-error";

export default function ErrorPage({
  reset,
}: {
  reset: () => void;
}) {
  return <RouteError reset={reset} />;
}
