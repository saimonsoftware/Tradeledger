import { PASSWORD_MIN } from "@/lib/validation/auth";

export type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string; hint?: string };

// A small list of extremely common passwords and fragments. The real protection
// against breached passwords is Supabase's leaked-password check (HaveIBeenPwned);
// this meter just nudges people towards better choices while they type.
const COMMON = [
  "password",
  "123456",
  "qwerty",
  "letmein",
  "welcome",
  "iloveyou",
  "admin",
  "trading",
  "trader",
  "monkey",
  "dragon",
  "abc123",
];

/** Lightweight, dependency-free strength estimate for the live meter. */
export function passwordStrength(password: string): Strength {
  if (!password) return { score: 0, label: "Too short" };
  if (password.length < PASSWORD_MIN) {
    return {
      score: 0,
      label: "Too short",
      hint: `${PASSWORD_MIN - password.length} more character${PASSWORD_MIN - password.length === 1 ? "" : "s"} needed`,
    };
  }

  const lower = password.toLowerCase();
  if (COMMON.some((c) => lower.includes(c))) {
    return { score: 1, label: "Weak", hint: "Avoid common words like “password”" };
  }
  if (/^(.)\1+$/.test(password) || /(.)\1{3,}/.test(password)) {
    return { score: 1, label: "Weak", hint: "Avoid repeating the same character" };
  }

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  let points = 0;
  if (password.length >= 12) points++;
  if (password.length >= 16) points++;
  if (password.length >= 20) points++;
  if (classes >= 2) points++;
  if (classes >= 3) points++;
  if (classes === 4) points++;

  if (points >= 5) return { score: 4, label: "Very strong" };
  if (points >= 4) return { score: 3, label: "Strong" };
  if (points >= 2) return { score: 2, label: "Fair", hint: "Longer is stronger: try a passphrase" };
  return { score: 1, label: "Weak", hint: "Mix in numbers, symbols or more words" };
}
