export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

export type PasswordStrength = {
  score: PasswordStrengthScore;
  label: "" | "Weak" | "Fair" | "Good" | "Strong";
  unmet: string[];
};

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "qwertyuiop",
  "iloveyou",
  "letmein",
  "welcome",
  "welcome1",
  "admin",
  "admin123",
  "abc12345",
  "monkey123",
  "football",
  "baseball",
  "dragon123",
]);

const LABELS: Record<PasswordStrengthScore, PasswordStrength["label"]> = {
  0: "",
  1: "Weak",
  2: "Fair",
  3: "Good",
  4: "Strong",
};

export function scorePassword(
  password: string,
  context?: { email?: string; fullName?: string },
): PasswordStrength {
  if (!password) {
    return { score: 0, label: "", unmet: [] };
  }

  const lower = password.toLowerCase();
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const len = password.length;

  let raw = 0;
  if (len >= 8) raw += 1;
  if (len >= 12) raw += 1;
  if (len >= 16) raw += 1;
  if (hasLower && hasUpper) raw += 1;
  if (hasDigit) raw += 1;
  if (hasSymbol) raw += 1;

  let score = Math.min(4, raw) as PasswordStrengthScore;

  // Hard penalties: force score to 1 regardless of arithmetic.
  let penalized = false;
  let penaltyReason: "common" | "context" | null = null;

  if (COMMON_PASSWORDS.has(lower)) {
    penalized = true;
    penaltyReason = "common";
  }

  if (context) {
    const emailLocal = context.email?.split("@")[0]?.toLowerCase();
    const emailFull = context.email?.toLowerCase();
    const nameSquashed = context.fullName?.toLowerCase().replace(/\s+/g, "");
    if (
      (emailLocal && emailLocal.length >= 3 && lower === emailLocal) ||
      (emailFull && lower === emailFull) ||
      (nameSquashed && nameSquashed.length >= 3 && lower === nameSquashed)
    ) {
      penalized = true;
      penaltyReason = penaltyReason ?? "context";
    }
  }

  if (penalized) {
    score = 1;
  }

  // Coercion: any non-empty input scores at minimum 1 ("Weak").
  if (password.length > 0 && score === 0) {
    score = 1;
  }

  const unmet: string[] = [];
  if (penaltyReason === "common") unmet.push("Avoid common passwords");
  if (penaltyReason === "context") unmet.push("Avoid using your name or email");
  if (len < 12) unmet.push("Use at least 12 characters");
  if (!(hasLower && hasUpper)) unmet.push("Mix upper and lowercase letters");
  if (!hasDigit) unmet.push("Add a number");
  if (!hasSymbol) unmet.push("Add a symbol like ! or #");

  return {
    score,
    label: LABELS[score],
    unmet: unmet.slice(0, 3),
  };
}
