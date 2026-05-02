"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { APP_NAME, ROUTES } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";

export function SiteHeader() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const { logoutMutation } = useAuth();

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync();
      toast.success("Signed out.");
      router.push(ROUTES.login);
    } catch {
      toast.error("Unable to sign out. Please try again.");
    }
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <Link
          href={ROUTES.home}
          className="flex items-center gap-3 text-sm font-medium text-gray-900"
        >
          <Image src="/globe.svg" alt="App logo" width={20} height={20} priority />
          {APP_NAME}
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            // Authenticated state: show user name + logout
            <>
              <Link
                href={ROUTES.dashboardUser}
                className="text-gray-700 transition-all duration-150 hover:text-blue-600"
              >
                {user.fullName.split(" ")[0]}
              </Link>
              <button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-200 disabled:opacity-50"
              >
                {logoutMutation.isPending ? "Signing out..." : "Sign out"}
              </button>
            </>
          ) : (
            // Unauthenticated state: show login + signup
            <>
              <Link
                href={ROUTES.login}
                className="text-gray-700 transition-all duration-150 hover:text-blue-600"
              >
                Login
              </Link>
              <Link
                href={ROUTES.signup}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-blue-500"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
