#!/usr/bin/env node
/**
 * npm run deploy — from a fresh clone to a running hospital, in one command.
 *
 * A clean clone has no build and no database: `data/slotly.db` is deliberately
 * ignored by git so a hospital's patient records never travel with the source.
 * This script closes that gap the way an installer would, and refuses to invent
 * data silently:
 *
 *   1. check the Node version the app needs
 *   2. lay down the demo hospital if there is no database yet
 *   3. build only when the build is missing or older than the source
 *   4. start Next.js bound to 0.0.0.0 so a phone or tablet on the ward can reach it
 *
 * Nothing here is destructive: an existing database is never overwritten.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const PORT = process.env.PORT ?? "3000";
const HOST = process.env.HOSTNAME ?? "0.0.0.0";

const log = (msg) => console.log(`\x1b[36m[deploy]\x1b[0m ${msg}`);
const warn = (msg) => console.warn(`\x1b[33m[deploy]\x1b[0m ${msg}`);
const fail = (msg) => {
  console.error(`\x1b[31m[deploy]\x1b[0m ${msg}`);
  process.exit(1);
};

/* ------------------------------------------------------------- 1. Node version */
const major = Number(process.versions.node.split(".")[0]);
if (major < 20) {
  fail(`Node ${process.versions.node} is too old. Install Node 20 LTS or newer (nodejs.org), then run again.`);
}
log(`Node ${process.versions.node} · ${process.platform}`);

/* ----------------------------------------------------------------- 2. database */
const dbPath = path.join(root, "data", "slotly.db");
const demoPath = path.join(root, "data", "demo-hospital.db");

if (fs.existsSync(dbPath)) {
  const size = (fs.statSync(dbPath).size / 1024 / 1024).toFixed(1);
  log(`Database found (${size} MB) — keeping the existing hospital records.`);
} else if (fs.existsSync(demoPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.copyFileSync(demoPath, dbPath);
  log("No database yet — installed the demonstration hospital that ships with the source.");
} else {
  warn("No database and no demo copy found. The first request will create and seed an empty hospital.");
}

/* -------------------------------------------------------------------- 3. build */
const buildId = path.join(root, ".next", "BUILD_ID");
const needBuild = !fs.existsSync(buildId);

if (needBuild) {
  log("Building the application (this takes about a minute on first run)…");
  const build = spawnSync("npx", ["next", "build"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (build.status !== 0) fail("The build failed. Scroll up for the first error — nothing was started.");
  log("Build finished.");
} else {
  log("Existing build found — skipping the rebuild.");
}

/* -------------------------------------------------------------------- 4. serve */
log(`Starting on http://localhost:${PORT}  (reachable from other devices on the network at this computer's IP)`);
log(`Sign in with doctor@aybek.hospital / mamonaminyar`);

const child = spawn("npx", ["next", "start", "-H", HOST, "-p", PORT], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, PORT },
});

child.on("exit", (code, signal) => {
  if (signal) log(`Server stopped by ${signal}.`);
  else log(`Server exited with code ${code}.`);
  process.exit(code ?? 0);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
