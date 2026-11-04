import nextEnv from "@next/env";
import { deploymentConfig } from "./deploy-config.mjs";
import { createSnapshot } from "./sqlite-snapshot-lib.mjs";
nextEnv.loadEnvConfig(process.cwd());
try {
  const action = process.argv[2];
  const value = (name) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? "" : process.argv[index + 1] || "";
  };
  const output = value("--output");
  if (!["backup", "restore"].includes(action) || !output || output.startsWith("--")) throw new Error("Usage: sqlite-maintenance.mjs backup|restore --output NEW_FILE [--source BACKUP]");
  const { dbPath } = deploymentConfig(process.cwd(), process.env);
  const source = action === "backup" ? dbPath : value("--source");
  if (!source || source.startsWith("--")) throw new Error("Restore requires --source BACKUP");
  createSnapshot(source, output, { restore: action === "restore" });
  console.log(action === "restore" ? "Verified NEW restore created; sessions invalidated. Existing hospital untouched. Stop the server, verify this copy, then explicitly select its SLOTLY_DB_PATH." : "Verified SQLite snapshot created, including committed WAL data. Contains sensitive records: secure/encrypt separately. No automatic pruning.");
} catch (error) {
  console.error(`Maintenance refused/failed: ${error.message}. No existing database was replaced. Inspect any newly created output before retrying.`);
  process.exitCode = 1;
}
