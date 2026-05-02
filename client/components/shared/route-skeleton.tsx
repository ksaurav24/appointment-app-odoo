export function RouteSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <div className="h-6 w-40 animate-pulse rounded bg-gray-100" />
      <div className="h-4 w-56 animate-pulse rounded bg-gray-100" />
      <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
      <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
      <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
    </div>
  );
}
