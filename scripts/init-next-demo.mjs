// Non-destructive first-install helper for the Next.js Windows wizard.
import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { deploymentConfig } from "./deploy-config.mjs";
nextEnv.loadEnvConfig(process.cwd());
try {
  const { dbPath } = deploymentConfig(process.cwd(), process.env);
  if (fs.existsSync(dbPath)) {
    console.log("Existing database preserved. No records read, reset, reseeded or replaced.");
  } else {
    const result = spawnSync(process.execPath, ["scripts/make-demo-db.mjs", "--output", dbPath], { env: process.env, stdio: "inherit" });
    if (result.status !== 0) process.exitCode = 1;
  }
} catch {
  console.error("Initialization refused: check Node version, configured path and file permissions. Existing data was not reset.");
  process.exitCode = 1;
}
