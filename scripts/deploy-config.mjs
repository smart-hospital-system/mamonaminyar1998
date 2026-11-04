import fs from "node:fs";
import path from "node:path";

export function deploymentConfig(root, env, version = process.versions.node) {
  const [major, minor] = version.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 13)) throw new Error("Node 22.13 or newer is required for node:sqlite.");
  const port = env.PORT ?? "3000";
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error("PORT must be between 1 and 65535.");
  if (env.SLOTLY_DB_PATH !== undefined && !env.SLOTLY_DB_PATH.trim()) throw new Error("SLOTLY_DB_PATH cannot be empty.");
  const host = env.AYBEK_HOST ?? "0.0.0.0";
  if (!host.trim()) throw new Error("AYBEK_HOST cannot be empty.");
  return { port, host, dbPath: path.resolve(root, env.SLOTLY_DB_PATH || "data/slotly.db") };
}

/** Timestamp check intentionally excludes databases, caches and runtime exports. */
export function needsBuild(root) {
  const marker = path.join(root, ".next", "BUILD_ID");
  if (!fs.existsSync(marker)) return true;
  const built = fs.statSync(marker).mtimeMs;
  const newer = (file) => {
    if (!fs.existsSync(file)) return false;
    const info = fs.statSync(file);
    if (info.isDirectory()) return info.mtimeMs > built || fs.readdirSync(file).some((name) => newer(path.join(file, name)));
    return info.mtimeMs > built;
  };
  return ["app", "components", "lib", "public", "frontend", "package.json", "package-lock.json", "next.config.ts", "postcss.config.mjs", "tsconfig.json", "middleware.ts", ".env", ".env.local", ".env.production", ".env.production.local"]
    .some((name) => newer(path.join(root, name)));
}
