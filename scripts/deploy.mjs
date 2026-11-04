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
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { deploymentConfig, needsBuild } from "./deploy-config.mjs";

const root = process.cwd();
loadEnvConfig(root);
// Next.js telemetry is on by default and phones home on every build; on a
// hospital machine with no internet that is a pointless delay.
process.env.NEXT_TELEMETRY_DISABLED = process.env.NEXT_TELEMETRY_DISABLED ?? "1";


const log = (msg) => console.log(`\x1b[36m[deploy]\x1b[0m ${msg}`);
const warn = (msg) => console.warn(`\x1b[33m[deploy]\x1b[0m ${msg}`);
const fail = (msg) => {
  console.error(`\x1b[31m[deploy]\x1b[0m ${msg}`);
  process.exit(1);
};

/* ------------------------------------------------------------- 1. Node version */
let config;
try { config = deploymentConfig(root, process.env); } catch (error) { fail(error.message); }
const { port: PORT, host: HOST, dbPath } = config;
// Pass one resolved database choice through build and server processes.
process.env.SLOTLY_DB_PATH = dbPath;
log(`Node ${process.versions.node} · ${process.platform}`);

/* ----------------------------------------------------------------- 2. database */
if (!fs.existsSync(dbPath) && [`${dbPath}-wal`, `${dbPath}-shm`, `${dbPath}-journal`].some((p) => fs.existsSync(p))) {
  fail("Database sidecars exist without the main file. Stop and recover from a verified backup; no demo was copied.");
}
const demoPath = path.join(root, "data", "demo-hospital.db");

if (fs.existsSync(dbPath)) {
  // SQLite runs in WAL mode, so most recent writes live in slotly.db-wal until a
  // checkpoint: count the sidecars or the report reads "0.0 MB" for a full hospital.
  const bytes = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]
    .filter((p) => fs.existsSync(p))
    .reduce((sum, p) => sum + fs.statSync(p).size, 0);
  log(`Database found (${(bytes / 1024 / 1024).toFixed(1)} MB on disk) — keeping the existing hospital records.`);
} else if (fs.existsSync(demoPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.copyFileSync(demoPath, dbPath, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(dbPath, 0o600);
  log("No database yet — installed the demonstration hospital that ships with the source.");
} else {
  warn("No database and no demo copy found. The first request will create and seed an empty hospital.");
}

/* -------------------------------------------------------------------- 3. build */
const needBuild = needsBuild(root);

if (needBuild) {
  log("Building the application (this takes about a minute on first run)…");
  const build = spawnSync("npx", ["next", "build"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (build.status !== 0) fail("The build failed. Scroll up for the first error — nothing was started.");
  log("Build finished.");
} else {
  log("Existing build is newer than application sources — skipping the rebuild.");
}

/* -------------------------------------------------------------------- 4. serve */
log(`Starting on http://localhost:${PORT}  (reachable from other devices on the network at this computer's IP)`);
warn("Synthetic demo accounts have published credentials. Change them before any real records; do not expose an unchanged demo to the internet.");

const child = spawn("npx", ["next", "start", "-H", HOST, "-p", PORT], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, PORT },
});

child.on("error", () => fail("Unable to start Next.js. Verify Node and installed dependencies."));

child.on("exit", (code, signal) => {
  if (signal) log(`Server stopped by ${signal}.`);
  else log(`Server exited with code ${code}.`);
  process.exit(code ?? 0);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
