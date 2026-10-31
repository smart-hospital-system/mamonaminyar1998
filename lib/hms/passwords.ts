/**
 * Password quality — pure, client-safe rules.
 *
 * Kept apart from `security.ts` because the browser needs to show the strength
 * meter as a person types, and `security.ts` uses node:crypto on the server.
 */

/* -------------------------------------------------------------------- scoring */

export type Strength = {
  score: number; // 0–100
  band: "very-weak" | "weak" | "fair" | "strong" | "excellent";
  label: [string, string];
  color: string;
  hints: [string, string][];
  acceptable: boolean;
};

const COMMON = [
  "password", "123456", "12345678", "qwerty", "admin", "hospital", "aybek", "doctor",
  "welcome", "letmein", "iloveyou", "kabul", "afghan", "nurse", "pharmacy", "mamon",
];

export function scoreCode(code: string): Strength {
  const c = code ?? "";
  const hints: [string, string][] = [];
  let score = 0;

  // Length dominates: every extra character multiplies the search space.
  score += Math.min(46, c.length * 3.4);

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(c)).length;
  score += classes * 9;

  if (c.length >= 12) score += 8;
  if (c.length >= 16) score += 6;

  // Uniform codes are weak even when long.
  const unique = new Set(c.toLowerCase()).size;
  if (c.length > 0 && unique / c.length < 0.5) {
    score -= 18;
    hints.push(["Too many repeated characters.", "حروف تکراری زیاد است."]);
  }
  if (/(.)\1{2,}/.test(c)) {
    score -= 10;
    hints.push(["Avoid runs like “aaa” or “111”.", "از تکرارهایی مثل «aaa» یا «۱۱۱» بپرهیزید."]);
  }
  // A common word only matters when it is most of the code. "Kabul-surgery-2026-ward"
  // is a fine passphrase; "kabul2026" is not.
  const commonHit = COMMON.some((w) => c.toLowerCase().includes(w));
  if (commonHit && c.length < 16) {
    score -= 26;
    hints.push(["Contains a word anyone would guess.", "یک واژهٔ حدس‌زدنی دارد."]);
  } else if (commonHit) {
    score -= 8;
    hints.push(["Add a word that is not in a dictionary.", "یک واژهٔ غیرفرهنگی اضافه کنید."]);
  }
  if (/\d{4,}/.test(c) && c.length < 14) {
    score -= 8;
    hints.push(["Use letters as well as digits.", "هم حرف و هم رقم استفاده کنید."]);
  }
  if (c.length < 10) hints.push(["Use at least 12 characters.", "حداقل ۱۲ حرف استفاده کنید."]);

  score = Math.max(0, Math.min(100, Math.round(score)));

  const band: Strength["band"] =
    score < 25 ? "very-weak" : score < 45 ? "weak" : score < 65 ? "fair" : score < 85 ? "strong" : "excellent";

  const label: Record<Strength["band"], [string, string]> = {
    "very-weak": ["Very weak — do not use", "بسیار ضعیف — استفاده نکنید"],
    weak: ["Weak", "ضعیف"],
    fair: ["Fair", "متوسط"],
    strong: ["Strong", "قوی"],
    excellent: ["Excellent", "عالی"],
  };

  const color: Record<Strength["band"], string> = {
    "very-weak": "#dc2626",
    weak: "#ea580c",
    fair: "#d97706",
    strong: "#0f9d6e",
    excellent: "#0e7490",
  };

  return {
    score,
    band,
    label: label[band],
    color: color[band],
    hints: hints.slice(0, 3),
    // The server enforces this floor when a code is set for someone.
    // The floor enforced by the server: long, mixed, and not a short common word.
    acceptable: c.length >= 12 && classes >= 3 && !(commonHit && c.length < 16),
  };
}

