import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthUser, OrgSetupFormValues, UserRole } from "@/types";

// Temporarily stores the user's signup credentials (name, email, password)
// while they navigate through the signup-role → onboarding flow.
// Cleared immediately after the backend register call succeeds.
// WHY sessionStorage (not memory): prevents data loss on accidental page refresh.
// WHY Zustand (not URL params): password must NEVER appear in the URL bar.
export interface SignupCredentials {
  fullName: string;
  email: string;
  password: string;
}

interface AppStore {
  // ── Auth state ─────────────────────────────────────────────────────────────
  // user is null when logged out. Populated from /auth/me on app init or
  // from loginUser responses.
  user: AuthUser | null;
  // role is set when user selects CUSTOMER or ORGANIZER on /signup-role.
  // It determines routing after OTP verification.
  role: UserRole | null;
  setUser: (user: AuthUser) => void;
  setRole: (role: UserRole) => void;
  clearAuth: () => void;

  // ── Signup credentials draft ───────────────────────────────────────────────
  // Holds name/email/password temporarily between /signup → /signup-role.
  // Cleared immediately after POST /auth/register is called.
  signupCredentials: SignupCredentials | null;
  setSignupCredentials: (creds: SignupCredentials) => void;
  clearSignupCredentials: () => void;

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

      // Signup credentials — only live for the duration of the signup flow.
      signupCredentials: null,
      setSignupCredentials: (creds) => set({ signupCredentials: creds }),
      clearSignupCredentials: () => set({ signupCredentials: null }),

      // Org setup draft — starts null, set at step 1, cleared after submission.
      orgDraft: null,
      setOrgDraft: (draft) => set({ orgDraft: draft }),
      clearOrgDraft: () => set({ orgDraft: null }),
    }),
    {
      name: "app-store",
      storage: createJSONStorage(() => sessionStorage),
      // Persist everything except the live auth user (always re-fetched from /auth/me).
      partialize: (state) => ({
        role: state.role,
        orgDraft: state.orgDraft,
        signupCredentials: state.signupCredentials,
      }),
    },
  ),
);
