import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthUser, OrgSetupFormValues, UserRole } from "@/types";

interface AppStore {
  // ── Auth state ─────────────────────────────────────────────────────────────
  // user is null when logged out. Populated from /auth/me on app init or
  // from loginUser/verifyEmail responses.
  user: AuthUser | null;
  // role is set when user selects CUSTOMER or ORGANIZER on /signup-role.
  // It determines routing after OTP verification.
  role: UserRole | null;
  setUser: (user: AuthUser) => void;
  setRole: (role: UserRole) => void;
  clearAuth: () => void;

  // ── Organiser onboarding draft ─────────────────────────────────────────────
  // WHY Zustand and not URL params: step 1 data (name + slug) should not be
  // exposed in the browser URL bar. Zustand keeps it in memory only.
  orgDraft: OrgSetupFormValues | null;
  setOrgDraft: (draft: OrgSetupFormValues) => void;
  clearOrgDraft: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Auth session starts empty — rehydrated from /auth/me on app load.
      user: null,
      role: null,
      setUser: (user) => set({ user }),
      setRole: (role) => set({ role }),
      clearAuth: () => set({ user: null, role: null }),

      // Draft starts null; set at end of step 1, cleared after step 2 submission.
      orgDraft: null,
      setOrgDraft: (draft) => set({ orgDraft: draft }),
      clearOrgDraft: () => set({ orgDraft: null }),
    }),
    {
      name: "app-store",
      storage: createJSONStorage(() => sessionStorage),
      // Only persist role and orgDraft — user is always re-fetched from /auth/me.
      // This prevents stale user data from persisting across sessions.
      partialize: (state) => ({
        role: state.role,
        orgDraft: state.orgDraft,
      }),
    },
  ),
);
