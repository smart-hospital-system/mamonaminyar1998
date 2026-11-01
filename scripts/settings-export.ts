/** Export hospital settings + licence to a JSON file: tsx scripts/settings-export.ts out.json */
import fs from "node:fs";
import { hmsReady, getSettings } from "../lib/hms/db";
import { licenseState } from "../lib/hms/license";

hmsReady();
const out = process.argv[2] ?? "aybek-settings.json";
fs.writeFileSync(out, JSON.stringify({ exported_at: new Date().toISOString(), settings: getSettings(), licence: licenseState() }, null, 2));
console.log(`Settings written to ${out}`);
