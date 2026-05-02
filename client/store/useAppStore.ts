import { create } from "zustand";
import type { AuthUser, UserRole } from "@/types";

interface AppStore {
  user: AuthUser | null;
  token: string | null;
  role: UserRole | null;
  setAuth: (user: AuthUser, token: string) => void;
  setRole: (role: UserRole) => void;
  clearAuth: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Auth session starts empty and gets filled only after successful auth actions.
  user: null,
  token: null,
  role: null,
  setAuth: (user, token) => set({ user, token }),
  setRole: (role) => set({ role }),
  clearAuth: () => set({ user: null, token: null, role: null }),
}));
