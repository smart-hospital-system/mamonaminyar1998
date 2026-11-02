/**
 * Generate activation serials from the command line:
 *   npx tsx scripts/generate-serials.ts hospital 3
 * Serials are appended to aybek-hms/SERIALS.txt so the owner always has a copy.
 */
import fs from "node:fs";
import path from "node:path";
import { generateSerial, type SerialPlan } from "../lib/hms/license";

const plan = (process.argv[2] ?? "hospital") as SerialPlan;
const count = Math.max(1, Math.min(50, Number(process.argv[3] ?? 1)));
const out = path.join(process.cwd(), "aybek-hms", "SERIALS.txt");

const lines: string[] = [];
for (let i = 0; i < count; i++) {
  const s = generateSerial(plan);
  const line = `${s.serial}  ${s.plan}  seats ${s.seats}  issued ${new Date().toISOString().slice(0, 10)}`;
  console.log(line);
  lines.push(line);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.appendFileSync(out, lines.join("\n") + "\n");
console.log(`\nAppended to ${out} — keep this file private.`);
