
if (process.env.AYBEK_ENABLE_DEMO_ACTIONS !== "1" || !process.argv.includes("--confirm-destroy")) {
  console.error("Refused: destructive demo operation requires AYBEK_ENABLE_DEMO_ACTIONS=1 and --confirm-destroy. Stop the app and verify a backup first.");
  process.exit(1);
}
/**
 * Reset and reseed the Slotly database with six months of realistic demo activity.
 * Usage: npm run seed
 */
import { getDb, resetDatabase, all, get } from "../lib/db";
import { seedDatabase } from "../lib/seed";

const db = getDb();
console.log("→ clearing existing data…");
resetDatabase();

console.log("→ seeding demo workspace…");
const started = Date.now();
seedDatabase(db);

const counts = {
  staff: get<{ c: number }>("SELECT COUNT(*) AS c FROM staff")?.c ?? 0,
  services: get<{ c: number }>("SELECT COUNT(*) AS c FROM services")?.c ?? 0,
  customers: get<{ c: number }>("SELECT COUNT(*) AS c FROM customers")?.c ?? 0,
  bookings: get<{ c: number }>("SELECT COUNT(*) AS c FROM bookings")?.c ?? 0,
  payments: get<{ c: number }>("SELECT COUNT(*) AS c FROM payments")?.c ?? 0,
  reviews: get<{ c: number }>("SELECT COUNT(*) AS c FROM reviews")?.c ?? 0,
};

console.log(`✓ seeded in ${Date.now() - started}ms`);
console.table(counts);
console.log("\nSign in with mamon.aminyar650432@gmail.com / mamonaminyar");
