"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/layout/session-provider";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      // useState keeps a single QueryClient instance for the app lifetime on client.
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* SessionProvider calls GET /auth/me once on mount to restore the
          user object from the httpOnly access cookie into Zustand. */}
      <SessionProvider>
        {children}
      </SessionProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
