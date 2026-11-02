/**
 * build-store.ts — writes the 1 000-line hospital store catalogue.
 *
 * Run: npm run hms:store
 * Output: data/store-catalogue.json | .csv | .md
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { buildStore, distribution } from "../lib/hms/store/build";
import { CLASS_LABEL, CLASS_TARGET, FORM_LABEL, FORM_TARGET, type ClassKey, type FormGroup } from "../lib/hms/store/pools";

const items = buildStore();
const { byClass, byForm } = distribution(items);
const generatedAt = new Date().toISOString();
const BASE = "2026-11-01";

const problems: string[] = [];
if (items.length !== 1000) problems.push(`expected 1000 items, got ${items.length}`);
for (const [k, v] of Object.entries(CLASS_TARGET)) if ((byClass[k] ?? 0) !== v) problems.push(`class ${k}: ${byClass[k] ?? 0} vs ${v}`);
for (const [k, v] of Object.entries(FORM_TARGET)) if ((byForm[k] ?? 0) !== v) problems.push(`form ${k}: ${byForm[k] ?? 0} vs ${v}`);
const near = items.filter((i) => i.nearExpiry);
if (near.length !== 100) problems.push(`near-expiry batch: ${near.length}, expected 100`);
for (const i of items) {
  if (i.nearExpiry && (i.daysToExpiry < 60 || i.daysToExpiry > 90)) problems.push(`${i.sku}: near-expiry out of window (${i.daysToExpiry} d)`);
  if (!i.nearExpiry && i.expiry < "2028-01-01") problems.push(`${i.sku}: expiry ${i.expiry} before 2028`);
}
const unique = new Set(items.map((i) => `${i.name}|${i.strength}|${i.pack}`));
const lowStock = items.filter((i) => i.stock < i.reorderLevel);
const value = items.reduce((n, i) => n + i.stock * i.unitPrice, 0);

mkdirSync("data", { recursive: true });
writeFileSync(
  "data/store-catalogue.json",
  JSON.stringify(
    {
      generatedAt,
      baseDate: BASE,
      disclaimer:
        "Demonstration inventory for training and software testing. Batch numbers, manufacturers, prices and quantities are synthetic; expiry dates are fixed relative to 2026-11-01 so the alert screens always have something to show.",
      totals: {
        items: items.length,
        nearExpiry: near.length,
        lowStock: lowStock.length,
        stockValue: Math.round(value * 100) / 100,
      },
      targets: { classes: CLASS_TARGET, forms: FORM_TARGET },
      actual: { classes: byClass, forms: byForm },
      items,
    },
    null,
    1
  )
);

const header = ["sku", "name", "name_fa", "therapeutic", "therapeutic_fa", "form_group", "form_label", "strength", "pack", "unit", "manufacturer", "batch", "expiry", "days_to_expiry", "near_expiry", "unit_price", "stock", "reorder_level", "location"];
const esc = (v: string | number | boolean) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const rows = [header.join(",")];
for (const i of items) {
  rows.push([i.sku, i.name, i.nameFa, i.className, i.classNameFa, i.formGroup, i.formLabel, i.strength, i.pack, i.unit, i.manufacturer, i.batch, i.expiry, i.daysToExpiry, i.nearExpiry, i.unitPrice, i.stock, i.reorderLevel, i.location].map(esc).join(","));
}
writeFileSync("data/store-catalogue.csv", rows.join("\n") + "\n");

const pct = (n: number) => `${((n / items.length) * 100).toFixed(1)}%`;
const classRows = (Object.keys(CLASS_TARGET) as ClassKey[])
  .map((k) => `| ${CLASS_LABEL[k].en} | ${byClass[k]} | ${pct(byClass[k])} | ${CLASS_TARGET[k]} | ${CLASS_LABEL[k].fa} |`)
  .join("\n");
const formRows = (Object.keys(FORM_TARGET) as FormGroup[])
  .map((k) => `| ${FORM_LABEL[k].en} | ${byForm[k]} | ${pct(byForm[k])} | ${FORM_TARGET[k]} | ${FORM_LABEL[k].fa} |`)
  .join("\n");
const expiryBuckets = [
  ["Near expiry — 60 to 90 days", near.length],
  ["2028", items.filter((i) => i.expiry.startsWith("2028")).length],
  ["2029", items.filter((i) => i.expiry.startsWith("2029")).length],
  ["2030", items.filter((i) => i.expiry.startsWith("2030")).length],
  ["2031", items.filter((i) => i.expiry.startsWith("2031")).length],
] as [string, number][];

writeFileSync(
  "data/store-catalogue.md",
  `# Hospital store catalogue — ${items.length} lines

**Generated:** ${generatedAt} · **Reference date:** ${BASE} · **Stock value:** ${value.toFixed(0)} AFN (indicative)

Two distributions run at the same time, and both are exact.

## By therapeutic area

| Area | Items | Share | Requested | دری |
| --- | --- | --- | --- | --- |
${classRows}

## By dosage form / supply group

| Form group | Items | Share | Requested | دری |
| --- | --- | --- | --- | --- |
${formRows}

## Expiry

| Bucket | Items |
| --- | --- |
${expiryBuckets.map(([k, v]) => `| ${k} | ${v} |`).join("\n")}

Every line not in the near-expiry batch expires on or after **2028-01-01** (spread to June 2031).
The near-expiry batch expires in **60–90 days** from the reference date — that is the group the
alert screen is meant to catch. ${lowStock.length} lines are below their reorder level.

## Files

- \`data/store-catalogue.json\` — every field, per line
- \`data/store-catalogue.csv\` — flat table for Excel
- \`data/store-catalogue.md\` — this summary

## Disclaimer

Demonstration inventory for training and software testing. Batch numbers, manufacturers,
prices and quantities are synthetic. Expiry dates are anchored to a fixed reference date so the
alert screens always have something to show; they are not a real stock record.
`
);

console.log(`items: ${items.length}  near-expiry: ${near.length}  low stock: ${lowStock.length}  value: ${value.toFixed(0)}`);
console.log(`unique name/strength/pack: ${unique.size}`);
console.log(`classes: ${Object.entries(byClass).map(([k, v]) => `${k}=${v}`).join(" ")}`);
console.log(`forms: ${Object.entries(byForm).map(([k, v]) => `${k}=${v}`).join(" ")}`);
console.log(`problems: ${problems.length ? problems.slice(0, 5).join("; ") : "none"}`);
if (problems.length) process.exitCode = 1;
