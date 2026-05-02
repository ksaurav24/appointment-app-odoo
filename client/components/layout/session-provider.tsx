"use client";

// SessionProvider rehydrates Zustand auth state on every page load.
//
// WHY this component exists:
//   The backend uses httpOnly cookies for auth — they're invisible to JS.
//   Zustand state is in memory and resets on page refresh.
//   We call GET /auth/me on mount to check if a valid access cookie exists.
//   If it does, we populate Zustand with the user so all components see the session.
//   If it doesn't (401), we clear the store — no redirects happen here.
//
// Placed inside <Providers> so it runs once per app lifetime on the client.

import { useEffect } from "react";
import { getCurrentUser } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAppStore((state) => state.setUser);
  const clearAuth = useAppStore((state) => state.clearAuth);

  useEffect(() => {
    // Only call /auth/me when an API URL is configured.
    // In mock mode, there's no persistent session to restore.
    if (!process.env.NEXT_PUBLIC_API_URL) return;

    getCurrentUser().then((user) => {
      if (user) {
        setUser(user);
      } else {
        clearAuth();
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
