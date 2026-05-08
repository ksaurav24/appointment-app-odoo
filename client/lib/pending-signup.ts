type PendingSignupRole = "CUSTOMER" | "ORGANIZER";

export type PendingSignup = {
  email: string;
  password: string;
  role: PendingSignupRole;
  savedAt: number;
};

const STORAGE_KEY = "pending-signup";
const MAX_AGE_MS = 20 * 60 * 1000;
const SEP = "::";

export function savePendingSignup(input: {
  email: string;
  password: string;
  role: PendingSignupRole;
}): void {
  if (typeof window === "undefined") return;
  const payload = [
    encodeURIComponent(input.email),
    encodeURIComponent(input.password),
    input.role,
    String(Date.now()),
  ].join(SEP);
  window.sessionStorage.setItem(STORAGE_KEY, payload);
}

export function loadPendingSignup(
  expectedRole?: PendingSignupRole,
): PendingSignup | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  const [rawEmail, rawPassword, role, rawSavedAt] = raw.split(SEP);
  if (!rawEmail || !rawPassword || !role || !rawSavedAt) {
    clearPendingSignup();
    return null;
  }

  if (role !== "CUSTOMER" && role !== "ORGANIZER") {
    clearPendingSignup();
    return null;
  }

  const savedAt = Number(rawSavedAt);
  if (!Number.isFinite(savedAt) || Date.now() - savedAt > MAX_AGE_MS) {
    clearPendingSignup();
    return null;
  }

  if (expectedRole && role !== expectedRole) return null;

  return {
    email: decodeURIComponent(rawEmail),
    password: decodeURIComponent(rawPassword),
    role,
    savedAt,
  };
}

export function clearPendingSignup(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
