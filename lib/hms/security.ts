import crypto from "node:crypto";
import { scoreCode } from "./passwords";

export { scoreCode } from "./passwords";
export type { Strength } from "./passwords";

/**
 * Access codes for the hospital.
 *
 * Two problems this solves. First, a ten-bed hospital has nine logins and no IT
 * department: people choose "hospital123" because it is easy to type at 03:00.
 * Second, a shared workstation gets left logged in, so a determined person can
 * guess a weak code in an afternoon. So: generate codes that are strong but
 * *sayable* (no ambiguous characters), score them honestly, and slow down
 * repeated failures at the door.
 */

/* ------------------------------------------------------------------ alphabet */

/** No 0/O, 1/I/L, 5/S, 2/Z — the pairs people misread on a printed card or over the phone. */
const CONSONANTS = "BCDFGHJKMNPQRTVWXY";
const VOWELS = "AEU";
const DIGITS = "34679";

const pick = (alphabet: string) => alphabet[crypto.randomInt(alphabet.length)];

/** Twenty independent cryptographically random characters, displayed in four groups.
 * Separators add no entropy. Reject no-digit samples so generated passwords meet
 * the server's mixed-character policy without predictable replacement positions.
 */
export function strongCode() {
  const alphabet = CONSONANTS + VOWELS + DIGITS;
  while (true) {
    const raw = Array.from({ length: 20 }, () => pick(alphabet)).join("");
    if (!/[0-9]/.test(raw)) continue;
    const code = raw.match(/.{5}/g)!.join("-");
    if (scoreCode(code).acceptable) return code;
  }
}

/** A short numeric PIN for a shared ward tablet (six digits, still rate-limited). */
export function strongPin() {
  return String(crypto.randomInt(100000, 1000000));
}

/* ------------------------------------------------------------------ throttling */

/**
 * Failed sign-ins, in memory, per email + address.
 *
 * In-memory is deliberate: the hospital runs one process on one machine, and a
 * restart clearing the counters is acceptable — it is a speed bump against
 * guessing, not a lockout policy. Five failures costs a minute; each further
 * failure doubles the wait up to fifteen minutes.
 */
const attempts = new Map<string, { count: number; first: number; until: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const FREE_ATTEMPTS = 5;
const MAX_TRACKED_ATTEMPTS = 4096;

export function throttleKey(email: string, ip: string) {
  return `${email.trim().toLowerCase()}|${ip}`;
}

export function checkThrottle(key: string): { blocked: boolean; secondsLeft: number; remaining: number } {
  const row = attempts.get(key);
  if (!row) return { blocked: false, secondsLeft: 0, remaining: FREE_ATTEMPTS };
  const now = Date.now();
  if (now - row.first > WINDOW_MS && row.until < now) {
    attempts.delete(key);
    return { blocked: false, secondsLeft: 0, remaining: FREE_ATTEMPTS };
  }
  if (row.until > now) {
    return { blocked: true, secondsLeft: Math.ceil((row.until - now) / 1000), remaining: 0 };
  }
  return { blocked: false, secondsLeft: 0, remaining: Math.max(0, FREE_ATTEMPTS - row.count) };
}

export function recordFailure(key: string) {
  const now = Date.now();
  const row = attempts.get(key);
  if (!row || now - row.first > WINDOW_MS) {
    for (const [oldKey, old] of attempts) {
      if (now - old.first > WINDOW_MS && old.until <= now) attempts.delete(oldKey);
    }
    if (!attempts.has(key) && attempts.size >= MAX_TRACKED_ATTEMPTS) {
      const oldest = attempts.keys().next().value;
      if (oldest !== undefined) attempts.delete(oldest);
    }
    attempts.set(key, { count: 1, first: now, until: 0 });
    return checkThrottle(key);
  }
  row.count += 1;
  if (row.count > FREE_ATTEMPTS) {
    // 60s after the fifth failure, then doubling, capped at 15 minutes.
    const wait = Math.min(15 * 60, 60 * Math.pow(2, row.count - FREE_ATTEMPTS - 1));
    row.until = now + wait * 1000;
  }
  return checkThrottle(key);
}

export function recordSuccess(key: string) {
  attempts.delete(key);
}

/** For tests and the owner console: forget every counter. */
export function resetThrottle() {
  attempts.clear();
}

/** A snapshot for the security panel: is anybody currently locked out? */
export function throttleSnapshot(limit = 8) {
  const now = Date.now();
  return Array.from(attempts.entries())
    .filter(([, v]) => v.until > now || now - v.first < WINDOW_MS)
    .slice(0, limit)
    .map(([key, v]) => ({
      target: key.split("|")[0],
      failures: v.count,
      lockedFor: v.until > now ? Math.ceil((v.until - now) / 1000) : 0,
    }));
}
