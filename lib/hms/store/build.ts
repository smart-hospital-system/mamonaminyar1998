/**
 * Builds the 1 000-line hospital store catalogue.
 *
 * Two distributions are satisfied at once:
 *   • therapeutic — urinary/digestive 27.3 %, respiratory/cardiac 18.2 %,
 *     surgery/anaesthesia 9.1 %, ENT 9.1 %, eye/skin 9.1 %, obstetric 4.5 %,
 *     traffic/forensic 4.5 %, orthopaedic 9.1 %, endocrine/blood 9.1 %
 *     (normalised from the owner's 110 % list to exactly 1 000 items)
 *   • form — oral solids 30 %, liquids 20 %, topical 10 %, injections 10 %,
 *     consumables 10 %, hygiene 10 %, miscellaneous 10 %
 *
 * Batch numbers, manufacturers, shelf locations, prices and stock levels are
 * deterministic so the same catalogue is produced on every run.
 */
import {
  ALLOWED_FORMS,
  CLASS_LABEL,
  CLASS_TARGET,
  FORM_LABEL,
  FORM_TARGET,
  GENERICS,
  type ClassKey,
  type FormGroup,
} from "./pools";

export type StoreItem = {
  sku: string;
  name: string;
  nameFa: string;
  className: string;
  classNameFa: string;
  therapeutic: ClassKey;
  formGroup: FormGroup;
  formLabel: string;
  formLabelFa: string;
  strength: string;
  pack: string;
  unit: string;
  manufacturer: string;
  batch: string;
  /** ISO date. Either 2028 or later, or one of the near-expiry batch. */
  expiry: string;
  nearExpiry: boolean;
  daysToExpiry: number;
  unitPrice: number;
  stock: number;
  reorderLevel: number;
  location: string;
};

/** Fixed reference date so the deliverables are reproducible. */
export const BASE_DATE = new Date("2026-11-01T00:00:00Z");
const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

const PACKS: Record<FormGroup, string[]> = {
  solid: ["x7", "x10", "x12", "x14", "x20", "x21", "x24", "x28", "x30", "x60", "x100", "x120"],
  liquid: ["2 ml", "30 ml", "60 ml", "100 ml", "120 ml", "150 ml", "200 ml", "250 ml", "500 ml", "1 L"],
  topical: ["5 g", "10 g", "15 g", "20 g", "30 g", "50 g", "100 g"],
  injection: ["1 vial", "5 ampoules", "10 ampoules", "1 prefilled syringe", "5 vials", "10 vials"],
  consumable: ["unit", "pack of 5", "pack of 10", "pack of 20", "pack of 50", "pack of 100", "box of 50", "box of 100"],
  hygiene: ["100 ml", "200 ml", "250 ml", "500 ml", "pack of 10", "pack of 20", "pack of 30", "pack of 50"],
  misc: ["unit", "pack of 10", "pack of 25", "pack of 50", "pack of 100", "box of 50"],
};

const UNITS: Record<FormGroup, string> = {
  solid: "tablet",
  liquid: "bottle",
  topical: "tube",
  injection: "vial",
  consumable: "pack",
  hygiene: "pack",
  misc: "unit",
};

const MAKERS = [
  "Kabul Pharma Co.", "Herat Medical Supplies", "Mazar Health Imports", "Afghan Serum Institute",
  "Balkh Pharma", "Aria Medical Trading", "Nangarhar Drug House", "Kandahar MedSupply",
  "Roshana Pharma", "Sahar Healthcare", "MedSupply Intl.", "Pamir Pharmaceuticals",
];

const SHELF: Record<FormGroup, string> = {
  solid: "A",
  liquid: "B",
  topical: "C",
  injection: "D",
  consumable: "E",
  hygiene: "F",
  misc: "G",
};

const PRICE: Record<FormGroup, number> = {
  solid: 0.35,
  liquid: 1.4,
  topical: 1.1,
  injection: 1.9,
  consumable: 0.8,
  hygiene: 1.2,
  misc: 0.9,
};

/**
 * Exact class × form allocation by max-flow (source → class → form → sink).
 * Rows and columns must both be met exactly, so a feasible flow gives an
 * allocation that honours the therapeutic and the form percentages at once.
 */
export function allocate(): Record<ClassKey, Record<string, number>> {
  const classes = Object.keys(CLASS_TARGET) as ClassKey[];
  const forms = Object.keys(FORM_TARGET) as FormGroup[];
  const out = {} as Record<ClassKey, Record<string, number>>;
  for (const c of classes) {
    out[c] = {};
    for (const f of forms) out[c][f] = 0;
  }

  // Node numbering: 0 = source, 1..C = classes, C+1..C+F = forms, last = sink.
  const C = classes.length;
  const F = forms.length;
  const sink = C + F + 1;
  const N = sink + 1;
  const cap: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  const flow: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  const addEdge = (u: number, v: number, c: number) => {
    cap[u][v] = c;
  };

  classes.forEach((c, i) => addEdge(0, 1 + i, CLASS_TARGET[c]));
  forms.forEach((f, j) => addEdge(1 + C + j, sink, FORM_TARGET[f]));
  classes.forEach((c, i) => {
    forms.forEach((f, j) => {
      if (!ALLOWED_FORMS[c].includes(f)) return;
      // Capacity between a class and a form: as much as that class needs.
      addEdge(1 + i, 1 + C + j, CLASS_TARGET[c]);
    });
  });

  const bfs = (): number[] | null => {
    const parent = new Array(N).fill(-1);
    const seen = new Array(N).fill(false);
    const q = [0];
    seen[0] = true;
    while (q.length) {
      const u = q.shift() as number;
      for (let v = 0; v < N; v += 1) {
        if (!seen[v] && cap[u][v] - flow[u][v] > 0) {
          seen[v] = true;
          parent[v] = u;
          q.push(v);
        }
      }
    }
    if (!seen[sink]) return null;
    const path = [sink];
    let v = sink;
    while (v !== 0) {
      v = parent[v];
      path.unshift(v);
    }
    return path;
  };

  for (let guard = 0; guard < 5000; guard += 1) {
    const path = bfs();
    if (!path) break;
    let push = Infinity;
    for (let i = 0; i < path.length - 1; i += 1) {
      push = Math.min(push, cap[path[i]][path[i + 1]] - flow[path[i]][path[i + 1]]);
    }
    for (let i = 0; i < path.length - 1; i += 1) {
      flow[path[i]][path[i + 1]] += push;
      flow[path[i + 1]][path[i]] -= push;
    }
  }

  classes.forEach((c, i) => {
    forms.forEach((f, j) => {
      out[c][f] = Math.max(0, flow[1 + i][1 + C + j]);
    });
  });

  // Report any class the flow could not fill (would mean an impossible request).
  const short = classes.filter((c) => Object.values(out[c]).reduce((n, v) => n + v, 0) !== CLASS_TARGET[c]);
  if (short.length) throw new Error(`allocation infeasible for: ${short.join(", ")}`);
  return out;
}

/** Days until the fixed near-expiry window, spread +60..+90 days. */
function nearExpiryDate(i: number) {
  const days = 60 + (i % 31);
  return new Date(BASE_DATE.getTime() + days * DAY);
}

/** Shelf-life date 2028-01 .. 2031-06, spread deterministically. */
function longExpiryDate(i: number) {
  const monthsFrom2028 = i % 42; // 42 months → Jan 2028 .. Jun 2031
  const year = 2028 + Math.floor(monthsFrom2028 / 12);
  const month = (monthsFrom2028 % 12) + 1;
  const day = 1 + ((i * 7) % 27);
  return new Date(Date.UTC(year, month - 1, day));
}

export function buildStore(): StoreItem[] {
  const plan = allocate();
  const items: StoreItem[] = [];
  let sku = 0;
  let nearExpiryUsed = 0;


  for (const cls of Object.keys(plan) as ClassKey[]) {
    for (const form of Object.keys(plan[cls]) as FormGroup[]) {
      const need = plan[cls][form];
      if (!need) continue;
      const pool = GENERICS.filter((g) => g.cls === cls && g.form === form);
      const fallback = GENERICS.filter((g) => g.cls === cls);
      const source = pool.length ? pool : fallback;
      if (!source.length) continue;

      // Round-robin across the pool, giving every generic its own variant counter,
      // so a bucket never repeats the same strength and pack twice.
      const used = new Map<string, number>();
      for (let n = 0; n < need; n += 1) {
        let pick = -1;
        let best = Infinity;
        for (let k = 0; k < source.length; k += 1) {
          const g = source[(n + k) % source.length];
          const u = used.get(g.name) ?? 0;
          if (u >= g.strengths.length * PACKS[form].length) continue;
          if (u < best) {
            best = u;
            pick = (n + k) % source.length;
          }
        }
        if (pick < 0) {
          throw new Error(`not enough strengths/packs for ${cls}/${form} (${need} lines, ${source.length} products)`);
        }
        const g = source[pick];
        const vi = used.get(g.name) ?? 0;
        used.set(g.name, vi + 1);
        const strength = g.strengths[vi % g.strengths.length];
        const packs = PACKS[form];
        const pack = packs[Math.floor(vi / g.strengths.length) % packs.length];
        sku += 1;

        // Every tenth line belongs to the near-expiry batch the owner asked for.
        const isNear = sku % 10 === 0 && nearExpiryUsed < 100;
        const exp = isNear ? nearExpiryDate(nearExpiryUsed++) : longExpiryDate(sku);
        const daysToExpiry = Math.round((exp.getTime() - BASE_DATE.getTime()) / DAY);
        const reorder = 20 + ((sku * 13) % 60);
        const stock = sku % 17 === 0 ? Math.floor(reorder / 3) : 40 + ((sku * 37) % 360);

        items.push({
          sku: `STK-${String(sku).padStart(4, "0")}`,
          name: g.name,
          nameFa: g.nameFa,
          className: CLASS_LABEL[cls].en,
          classNameFa: CLASS_LABEL[cls].fa,
          therapeutic: cls,
          formGroup: form,
          formLabel: FORM_LABEL[form].en,
          formLabelFa: FORM_LABEL[form].fa,
          strength,
          pack,
          unit: UNITS[form],
          manufacturer: MAKERS[(sku * 5) % MAKERS.length],
          batch: `BT-${2028 + (sku % 4)}-${String(1000 + sku)}`,
          expiry: iso(exp),
          nearExpiry: isNear,
          daysToExpiry,
          unitPrice: Math.round((PRICE[form] * (1 + (sku % 7) * 0.15)) * 100) / 100,
          stock,
          reorderLevel: reorder,
          location: `${SHELF[form]}-${1 + (sku % 12)}-${1 + (sku % 5)}`,
        });
      }
    }
  }
  return items;
}

export function distribution(items: StoreItem[]) {
  const byClass = {} as Record<string, number>;
  const byForm = {} as Record<string, number>;
  for (const i of items) {
    byClass[i.therapeutic] = (byClass[i.therapeutic] ?? 0) + 1;
    byForm[i.formGroup] = (byForm[i.formGroup] ?? 0) + 1;
  }
  return { byClass, byForm };
}
