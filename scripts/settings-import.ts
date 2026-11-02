/** Import hospital settings from a JSON file: tsx scripts/settings-import.ts file.json */
import fs from "node:fs";
import { hmsReady, saveSettings } from "../lib/hms/db";

hmsReady();
const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error("Usage: tsx scripts/settings-import.ts <file.json>");
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const settings = data.settings ?? data;
for (const [section, values] of Object.entries(settings)) {
  if (values && typeof values === "object") saveSettings(section, values as Record<string, unknown>);
  console.log(`applied ${section}`);
}
console.log("Settings restored.");
