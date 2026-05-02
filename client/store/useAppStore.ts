import { create } from "zustand";
import type { AuthUser, OrgSetupFormValues, UserRole } from "@/types";

interface AppStore {
  // Auth state 
  user: AuthUser | null;
  token: string | null;
  role: UserRole | null;    // set when user selects role on /signup-role
  setAuth: (user: AuthUser, token: string) => void;
  setRole: (role: UserRole) => void;
  clearAuth: () => void;

  // Organiser onboarding draft 
  // WHY Zustand and not URL params: step 1 data (name + slug) should not be
  // exposed in the browser URL bar. Zustand keeps it in memory only.
  // This draft is populated at end of step 1 and cleared after step 2 submits.
  orgDraft: OrgSetupFormValues | null;
  setOrgDraft: (draft: OrgSetupFormValues) => void;
  clearOrgDraft: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Auth session starts empty and gets filled only after successful auth actions.
  user: null,
  token: null,
  role: null,
  setAuth: (user, token) => set({ user, token }),
  setRole: (role) => set({ role }),
  clearAuth: () => set({ user: null, token: null, role: null }),

  // Draft starts null; set at end of step 1, cleared after step 2 submission.
  orgDraft: null,
  setOrgDraft: (draft) => set({ orgDraft: draft }),
  clearOrgDraft: () => set({ orgDraft: null }),
}));
