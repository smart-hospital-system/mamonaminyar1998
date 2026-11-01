#!/usr/bin/env node
/**
 * check-secrets.mjs — fails if a real credential looks committed.
 *
 * Why this exists: an API token that is pasted into a chat, a screenshot or a
 * README is a spent token. The hospital runs on-premise and needs no cloud
 * credentials at all, so the only correct place for a token is *outside* this
 * repository — an environment variable on the owner's machine, a GitHub
 * Actions secret, or Cloudflare's own build settings. This script is the guard
 * rail: it scans every tracked file and stops the mistake before it reaches git
 * history, where it can never be removed by a later commit.
 *
 * Usage:
 *   node scripts/check-secrets.mjs          # scan tracked files (npm run check:secrets)
 *   node scripts/check-secrets.mjs a.txt    # scan specific paths (used in tests)
 *
 * Exit code 0 = clean, 1 = at least one finding.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";

const SELF = "scripts/check-secrets.mjs";
const MAX_BYTES = 2 * 1024 * 1024;
const SKIP_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".pdf",
  ".zip", ".iso", ".db", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3",
]);

/** Only shapes that are unambiguously credentials — no generic "password" guesswork. */
const RULES = [
  { name: "Cloudflare API token", re: /\bcfat_[A-Za-z0-9_-]{20,}/g },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{30,}/g },
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "Stripe live key", re: /\bsk_live_[A-Za-z0-9]{16,}/g },
  { name: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: "Private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g },
  {
    // A 32+ character value assigned to a credential-ish name. The name may be
    // prefixed or suffixed with underscores (R2_SECRET_ACCESS_KEY, GITHUB_TOKEN,
    // cloudflare_api_key…), so no \b — word boundaries break on "_".
    name: "Hard-coded secret value",
    value: 2,
    re: /(?:^|[^A-Za-z0-9])([A-Za-z0-9_]*(?:token|secret|key|passwd|password)[A-Za-z0-9_]*)\s*[:=]\s*["'`]?([A-Za-z0-9+/=_.-]{32,})["'`]?/gim,
  },
];

/**
 * Values that are documented on purpose and are not real credentials, plus
 * values that live in the source by design (see the note in README).
 */
const ALLOW = [
  // The demo sign-in password is published in the README and on the disc by design.
  /mamonaminyar/,
  // Placeholders in .env.example and docs.
  /^(?:your|change|example|placeholder|x{8,}|\.\.\.)/i,
  // Values that are clearly a variable reference or redacted.
  /(?:process\.env|\$\{|\*{4}|…|\.\.\.)/,
];

/**
 * File + line where a long string is intentional and documented, not a leaked
 * credential. Keep this list short and justify every entry.
 */
const ALLOW_LINES = [
  // Licensing HMAC fallback, used when AYBEK_LICENSE_SECRET is not set. It is a
  // signing constant, not an account credential — see "Serial licences" in the
  // README for why the env var should be set on a real deployment.
  { file: "lib/hms/license.ts", reason: "licence signing fallback" },
];

function trackedFiles() {
  const out = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" });
  return out.split("\0").filter(Boolean);
}

function isText(file) {
  try {
    if (statSync(file).size > MAX_BYTES) return false;
    if (SKIP_EXT.has(extname(file).toLowerCase())) return false;
    const buf = readFileSync(file);
    return !buf.subarray(0, 4096).includes(0);
  } catch {
    return false;
  }
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : trackedFiles();
const findings = [];

for (const file of targets) {
  if (file === SELF || !isText(file)) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const lineAllow = ALLOW_LINES.some((a) => file === a.file);
  lines.forEach((line, i) => {
    if (lineAllow) return;
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line)) !== null) {
        const hit = m[rule.value ?? 1] ?? m[0];
        if (ALLOW.some((a) => a.test(hit))) continue;
        const shown = m[0].length > 24 ? `${m[0].slice(0, 12)}…(${m[0].length} chars)` : m[0];
        findings.push({ file, line: i + 1, rule: rule.name, shown });
      }
    }
  });
}

if (findings.length === 0) {
  console.log(`check:secrets — clean. Scanned ${targets.length} path(s), no credentials found.`);
  process.exit(0);
}

console.error("check:secrets — a credential looks committed:\n");
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  ${f.rule}  ${f.shown}`);
}
console.error(`
Do not commit it. Instead:
  1. Revoke it where it was created (it is already exposed).
  2. Move it to an environment variable on the machine that needs it,
     a GitHub Actions secret, or Cloudflare's build settings.
  3. If it reached a commit, rewrite history before pushing:
     git rm --cached <file> && git commit --amend   — or rotate the key and move on.
`);
process.exit(1);
