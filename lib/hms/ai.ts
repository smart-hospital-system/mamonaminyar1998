import { hAll, hGet } from "./db";

/* =====================================================================
 * Clinical + operational intelligence
 * Deterministic, explainable rules — no external services required, so the
 * hospital keeps working on an air-gapped LAN.
 * ===================================================================== */

export type RxLine = {
  drug: string;
  strength?: string | null;
  form?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  qty?: number;
};

export type Interaction = {
  severity: "critical" | "major" | "moderate";
  pair: [string, string];
  effect: string;
  action: string;
};

const INTERACTION_RULES: {
  a: RegExp;
  b: RegExp;
  severity: Interaction["severity"];
  effect: string;
  action: string;
}[] = [
  { a: /warfarin|acenocoumarol/i, b: /aspirin|ibuprofen|diclofenac|ketorolac|naproxen/i, severity: "critical", effect: "Additive bleeding risk — anticoagulant effect is markedly increased.", action: "Avoid the combination; if unavoidable add gastroprotection and check INR within 48 hours." },
  { a: /enoxaparin|heparin/i, b: /ketorolac|diclofenac|ibuprofen/i, severity: "major", effect: "NSAIDs plus LMWH increase haemorrhage risk, especially post-operatively.", action: "Prefer paracetamol; if an NSAID is required, monitor for bleeding and keep the course under 72 hours." },
  { a: /metformin/i, b: /ceftriaxone|contrast|iodine/i, severity: "major", effect: "Risk of lactic acidosis with contrast media or severe infection.", action: "Hold metformin 48 hours around contrast administration and recheck creatinine." },
  { a: /metformin/i, b: /glimepiride|insulin/i, severity: "moderate", effect: "Additive hypoglycaemic effect.", action: "Counsel on hypoglycaemia symptoms; consider reducing the sulfonylurea dose." },
  { a: /lisinopril|enalapril|ramipril/i, b: /ibuprofen|diclofenac|ketorolac/i, severity: "major", effect: "NSAIDs blunt the antihypertensive effect and can precipitate acute kidney injury.", action: "Use paracetamol first line; if an NSAID is needed, check renal function and hydrate." },
  { a: /(?:lisinopril|enalapril|ramipril|losartan|valsartan)/i, b: /spironolactone|potassium/i, severity: "major", effect: "Hyperkalaemia risk.", action: "Check serum potassium within 1 week of starting or changing dose." },
  { a: /amoxicillin/i, b: /warfarin/i, severity: "moderate", effect: "Antibiotics can raise INR by altering gut flora.", action: "Recheck INR after 3–5 days of therapy." },
  { a: /azithromycin|clarithromycin/i, b: /atorvastatin|simvastatin/i, severity: "major", effect: "Macrolides raise statin levels — myopathy and rhabdomyolysis risk.", action: "Hold the statin during the macrolide course or switch to an antibiotic without CYP3A4 inhibition." },
  { a: /tramadol/i, b: /ondansetron|sertraline|fluoxetine/i, severity: "major", effect: "Serotonergic load — risk of serotonin syndrome and QT prolongation.", action: "Use the lowest effective doses and monitor for agitation, tremor and hyperreflexia." },
  { a: /tramadol/i, b: /dexamethasone/i, severity: "moderate", effect: "Reduced seizure threshold in susceptible patients.", action: "Avoid in epilepsy; document seizure history before prescribing." },
  { a: /ceftriaxone/i, b: /ringer|lactate|calcium/i, severity: "critical", effect: "Calcium-containing fluids precipitate with ceftriaxone — fatal in neonates.", action: "Never run ceftriaxone and Ringer's lactate through the same line; flush between." },
  { a: /dexamethasone/i, b: /ibuprofen|diclofenac|aspirin/i, severity: "moderate", effect: "Combined GI mucosal injury.", action: "Add a proton-pump inhibitor if both are required." },
  { a: /omeprazole|esomeprazole/i, b: /clopidogrel/i, severity: "major", effect: "CYP2C19 inhibition reduces clopidogrel activation.", action: "Use pantoprazole instead of omeprazole." },
  { a: /salbutamol/i, b: /(?:non-selective beta|propranolol)/i, severity: "major", effect: "Beta-blockers antagonise bronchodilation and can trigger bronchospasm.", action: "Choose a cardioselective beta-blocker and monitor peak flow." },
  { a: /ferrous|iron/i, b: /ceftriaxone|tetracycline|ciprofloxacin/i, severity: "moderate", effect: "Chelation reduces absorption of both agents.", action: "Separate doses by at least 2 hours." },
];

const ALLERGY_ALIASES: Record<string, RegExp> = {
  penicillin: /amoxicillin|ampicillin|penicillin|clavulan/i,
  sulfa: /sulfameth|sulfasalazine|cotrimoxazole|trimethoprim/i,
  aspirin: /aspirin|acetylsalicyl/i,
  ibuprofen: /ibuprofen|diclofenac|naproxen|ketorolac|nsaid/i,
  codeine: /codeine|tramadol/i,
  latex: /.*/,
  metformin: /metformin/i,
};

export type SafetyReport = {
  interactions: Interaction[];
  allergyHits: { drug: string; allergen: string }[];
  duplicates: string[];
  maxDoseWarnings: string[];
  score: number;
  verdict: "clear" | "review" | "stop";
};

/** Full pre-signature safety screen for a prescription. */
export function screenPrescription(lines: RxLine[], allergies?: string | null): SafetyReport {
  const interactions: Interaction[] = [];
  const drugNames = lines.map((l) => l.drug.toLowerCase());

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      for (const rule of INTERACTION_RULES) {
        const ab = rule.a.test(lines[i].drug) && rule.b.test(lines[j].drug);
        const ba = rule.b.test(lines[i].drug) && rule.a.test(lines[j].drug);
        if (ab || ba) {
          const key = [lines[i].drug, lines[j].drug].sort().join("|");
          if (!interactions.some((x) => [x.pair[0], x.pair[1]].sort().join("|") === key)) {
            interactions.push({
              severity: rule.severity,
              pair: [lines[i].drug, lines[j].drug],
              effect: rule.effect,
              action: rule.action,
            });
          }
        }
      }
    }
  }

  const allergyHits: { drug: string; allergen: string }[] = [];
  if (allergies && !/^none$|^—$|^nil$/i.test(allergies.trim())) {
    const tokens = allergies.split(/[,;/]| and /i).map((t) => t.trim().toLowerCase()).filter(Boolean);
    for (const token of tokens) {
      const pattern = ALLERGY_ALIASES[token] ?? new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      for (const line of lines) {
        if (pattern.test(line.drug)) allergyHits.push({ drug: line.drug, allergen: token });
      }
    }
  }

  const duplicates: string[] = [];
  const seen = new Set<string>();
  for (const name of drugNames) {
    if (seen.has(name)) duplicates.push(lines.find((l) => l.drug.toLowerCase() === name)?.drug ?? name);
    seen.add(name);
  }

  const maxDoseWarnings: string[] = [];
  for (const line of lines) {
    const qty = Number(line.qty ?? 0);
    if (qty > 120) maxDoseWarnings.push(`${line.drug}: ${qty} units exceeds the 120-unit default ceiling — confirm the quantity.`);
    if (/paracetamol/i.test(line.drug) && /every 4|qds|four times/i.test(line.frequency ?? "") && /(500|1000)\s?mg/i.test(line.strength ?? "")) {
      maxDoseWarnings.push("Paracetamol: verify the 24-hour ceiling (4 g/day in adults) against this frequency.");
    }
    if (/tramadol/i.test(line.drug) && Number((line.duration ?? "").replace(/\D/g, "")) > 7) {
      maxDoseWarnings.push("Tramadol: courses beyond 7 days require a documented review.");
    }
    if (/insulin/i.test(line.drug) && !line.dosage) {
      maxDoseWarnings.push("Insulin: a numeric dose is mandatory before signing.");
    }
  }

  const score = Math.min(
    100,
    interactions.reduce((a, b) => a + (b.severity === "critical" ? 40 : b.severity === "major" ? 22 : 10), 0) +
      allergyHits.length * 45 +
      duplicates.length * 12 +
      maxDoseWarnings.length * 8
  );

  return {
    interactions,
    allergyHits,
    duplicates: Array.from(new Set(duplicates)),
    maxDoseWarnings,
    score,
    verdict: allergyHits.length || interactions.some((i) => i.severity === "critical") ? "stop" : score > 0 ? "review" : "clear",
  };
}

/* --------------------------------------------------------------- triage */

export type Vitals = {
  bp?: string;
  pulse?: number | string;
  temp?: number | string;
  spo2?: number | string;
  resp?: number | string;
  weight?: number | string;
  height?: number | string;
};

export type TriageResult = {
  score: number;
  band: "green" | "amber" | "red";
  label: string;
  drivers: string[];
  actions: string[];
};

/** NEWS2-style early warning score adapted for the ten-bed hospital. */
export function triage(v: Vitals): TriageResult {
  let score = 0;
  const drivers: string[] = [];

  const pulse = Number(v.pulse ?? 0);
  if (pulse) {
    if (pulse <= 40 || pulse >= 131) { score += 3; drivers.push(`Pulse ${pulse}/min (critical)`); }
    else if (pulse <= 50 || pulse >= 111) { score += 2; drivers.push(`Pulse ${pulse}/min (abnormal)`); }
    else if (pulse <= 60 || pulse >= 91) { score += 1; drivers.push(`Pulse ${pulse}/min (borderline)`); }
  }

  const spo2 = Number(v.spo2 ?? 0);
  if (spo2) {
    if (spo2 <= 91) { score += 3; drivers.push(`SpO₂ ${spo2}% (severe hypoxia)`); }
    else if (spo2 <= 93) { score += 2; drivers.push(`SpO₂ ${spo2}% (hypoxia)`); }
    else if (spo2 <= 95) { score += 1; drivers.push(`SpO₂ ${spo2}% (low-normal)`); }
  }

  const temp = Number(v.temp ?? 0);
  if (temp) {
    if (temp <= 35 || temp >= 39.1) { score += 2; drivers.push(`Temperature ${temp}°C`); }
    else if (temp >= 38.1) { score += 1; drivers.push(`Temperature ${temp}°C (febrile)`); }
  }

  const resp = Number(v.resp ?? 0);
  if (resp) {
    if (resp <= 8 || resp >= 25) { score += 3; drivers.push(`Respiratory rate ${resp}/min`); }
    else if (resp >= 21) { score += 2; drivers.push(`Respiratory rate ${resp}/min (tachypnoea)`); }
  }

  const [sys, dia] = String(v.bp ?? "").split("/").map(Number);
  if (sys) {
    if (sys <= 90 || sys >= 220) { score += 3; drivers.push(`Systolic BP ${sys} mmHg`); }
    else if (sys <= 100) { score += 2; drivers.push(`Systolic BP ${sys} mmHg (hypotensive)`); }
    else if (sys >= 160) { score += 1; drivers.push(`Systolic BP ${sys} mmHg (hypertensive)`); }
  }
  if (dia && dia >= 110) { score += 1; drivers.push(`Diastolic BP ${dia} mmHg`); }

  const band = score >= 7 ? "red" : score >= 4 ? "amber" : "green";
  const label = band === "red" ? "Urgent — escalate now" : band === "amber" ? "At risk — review within 30 minutes" : "Stable";
  const actions =
    band === "red"
      ? [
          "Call the on-call surgeon and start the emergency pathway.",
          "Attach continuous SpO₂ and a cardiac monitor; repeat observations every 15 minutes.",
          "Secure two large-bore IV lines and prepare for transfer to the high-dependency bed (B-10).",
        ]
      : band === "amber"
        ? [
            "Repeat observations in 30 minutes and document the trend.",
            "Ask the physician to review before discharge from OPD.",
            "Review medication for causes (e.g. beta-blockade, opioids, diuretics).",
          ]
        : ["Routine observations continued.", "No escalation required — document and file."];

  return { score, band, label, drivers, actions };
}

/* -------------------------------------------------------- dose suggestions */

export type DoseSuggestion = { drug: string; dose: string; note: string };

/** Weight-banded suggestions — a starting point a clinician must confirm. */
export function suggestDoses(weightKg: number, ageYears: number): DoseSuggestion[] {
  const paediatric = ageYears < 14;
  const w = Math.max(3, weightKg || (paediatric ? 20 : 70));
  const paracetamol = paediatric
    ? `${Math.round(w * 15)} mg (15 mg/kg) every 6 h, max 4 doses/day`
    : "1000 mg every 6 h, max 4 g/day";
  const amox = paediatric
    ? `${Math.round((w * 25) / 3 / 5) * 5} mg (25 mg/kg/day divided q8h)`
    : "500 mg three times daily";
  return [
    { drug: "Paracetamol", dose: paracetamol, note: "First-line analgesic and antipyretic; hepatotoxic in overdose." },
    { drug: "Amoxicillin", dose: amox, note: "Reduce if eGFR < 30 ml/min; avoid with a documented penicillin allergy." },
    { drug: "Ibuprofen", dose: paediatric ? `${Math.round(w * 10)} mg (10 mg/kg) every 8 h with food` : "400 mg three times daily", note: "Avoid in renal impairment, peptic ulcer and third-trimester pregnancy." },
    { drug: "Cetirizine", dose: paediatric ? `${Math.round(w * 0.25)} mg once daily (max 10 mg)` : "10 mg once daily at night", note: "Mild sedation — caution with driving." },
    { drug: "Ondansetron", dose: paediatric ? `${Math.round(w * 0.1)} mg IV (0.1 mg/kg, max 4 mg)` : "4 mg IV/PO every 8 h as needed", note: "QT prolongation — check electrolytes if repeated." },
  ];
}

/* -------------------------------------------------- prescription drafting */

const PHRASE_BANK: Record<string, string[]> = {
  uri: [
    "Viral upper respiratory tract infection — symptomatic management with attention to hydration and rest.",
    "Acute pharyngitis; no exudate or lymphadenopathy. Advised saline gargle and analgesia.",
  ],
  postop: [
    "Post-operative day 2 — wound edges apposed, no discharge, minimal surrounding erythema. Continue dressing protocol.",
    "Uncomplicated recovery after laparoscopic procedure; bowel sounds present, tolerating oral intake.",
  ],
  diabetes: [
    "Type 2 diabetes with suboptimal control (HbA1c above target). Reinforced adherence, diet and foot care.",
  ],
  hypertension: [
    "Essential hypertension, currently controlled on monotherapy. Home BP log reviewed — continue current dose.",
  ],
};

function phraseFor(dx: string) {
  const d = dx.toLowerCase();
  if (/respiratory|pharyng|uri|cough|throat/.test(d)) return PHRASE_BANK.uri;
  if (/post-?op|wound|surgical/.test(d)) return PHRASE_BANK.postop;
  if (/diabet/.test(d)) return PHRASE_BANK.diabetes;
  if (/hypertens/.test(d)) return PHRASE_BANK.hypertension;
  return ["Clinical findings documented; treatment plan discussed with the patient and written instructions provided."];
}

export function draftNote(diagnosis: string, vitals?: Vitals) {
  const phrases = phraseFor(diagnosis);
  const t = triage(vitals ?? {});
  const base = phrases[Math.floor(Math.random() * phrases.length)];
  const vitalsLine = vitals?.bp
    ? ` Observations: BP ${vitals.bp} mmHg, pulse ${vitals.pulse ?? "—"}/min, temperature ${vitals.temp ?? "—"} °C, SpO₂ ${vitals.spo2 ?? "—"}%.`
    : "";
  const plan = t.band === "red" ? " Escalated for urgent senior review." : " Reviewed and safe for outpatient management.";
  return `${base}${vitalsLine}${plan}`;
}

export function suggestTemplate(diagnosis: string) {
  const d = diagnosis.toLowerCase();
  if (/diabet/.test(d)) return 2;
  if (/hypertens/.test(d)) return 2;
  if (/post-?op|wound|surg|append|hernia/.test(d)) return 6;
  if (/infect|pneumon|urinary|cellulit/.test(d)) return 3;
  if (/anaem|pregnan/.test(d)) return 5;
  if (/respiratory|pharyng|uri|asthma/.test(d)) return 1;
  if (/gastr|reflux|ulcer/.test(d)) return 4;
  if (/migraine|headache|neuro/.test(d)) return 8;
  return 1;
}

/* ------------------------------------------------------ lab interpretation */

const REFERENCE: Record<string, (v: number) => "low" | "normal" | "high" | "critical"> = {
  wbc: (v) => (v < 2 || v > 20 ? "critical" : v < 4 ? "low" : v > 11 ? "high" : "normal"),
  hb: (v) => (v < 7 ? "critical" : v < 12 ? "low" : v > 17.5 ? "high" : "normal"),
  plt: (v) => (v < 50 ? "critical" : v < 150 ? "low" : v > 450 ? "high" : "normal"),
  creatinine: (v) => (v > 3 ? "critical" : v > 1.2 ? "high" : "normal"),
  urea: (v) => (v > 60 ? "critical" : v > 40 ? "high" : "normal"),
  alt: (v) => (v > 200 ? "critical" : v > 45 ? "high" : "normal"),
  ast: (v) => (v > 200 ? "critical" : v > 40 ? "high" : "normal"),
  hba1c: (v) => (v > 10 ? "critical" : v > 5.6 ? "high" : "normal"),
  inr: (v) => (v > 4 ? "critical" : v > 1.2 ? "high" : "normal"),
  crp: (v) => (v > 100 ? "critical" : v > 5 ? "high" : "normal"),
  potassium: (v) => (v < 2.5 || v > 6 ? "critical" : v < 3.5 ? "low" : v > 5.1 ? "high" : "normal"),
  sodium: (v) => (v < 125 || v > 155 ? "critical" : v < 135 ? "low" : v > 145 ? "high" : "normal"),
  glucose: (v) => (v < 3 || v > 20 ? "critical" : v < 3.9 ? "low" : v > 7.8 ? "high" : "normal"),
  albumin: (v) => (v < 2.5 ? "critical" : v < 3.5 ? "low" : "normal"),
  bilirubin: (v) => (v > 5 ? "critical" : v > 1.2 ? "high" : "normal"),
  amylase: (v) => (v > 300 ? "critical" : v > 100 ? "high" : "normal"),
  calcium: (v) => (v < 1.8 || v > 3.2 ? "critical" : v < 2.1 ? "low" : v > 2.6 ? "high" : "normal"),
};

export type ParsedLab = {
  analyte: string;
  value: number;
  unit: string;
  flag: "low" | "normal" | "high" | "critical" | "unknown";
  reference: string;
};

/** Extract numeric analytes from a free-text result and flag them. */
export function parseLabResult(text: string | null | undefined): ParsedLab[] {
  if (!text) return [];
  // The analyser prints "WBC: 14.2", "Hb 9.1 g/dL" and "Platelets 88" in the same
  // worksheet, so every pattern tolerates an optional colon and unit.
  const specs: { key: string; re: RegExp; unit: string; ref: string }[] = [
    { key: "wbc", re: /\bWBC\s*:?\s*([\d.]+)/i, unit: "×10⁹/L", ref: "4.0–11.0" },
    { key: "hb", re: /\b(?:Hb|Hgb|Haemoglobin|Hemoglobin)\s*:?\s*([\d.]+)/i, unit: "g/dL", ref: "12.0–17.5" },
    { key: "plt", re: /\b(?:PLT|Platelets?)\s*:?\s*([\d.]+)/i, unit: "×10⁹/L", ref: "150–450" },
    { key: "creatinine", re: /Creatinine\s*:?\s*([\d.]+)/i, unit: "mg/dL", ref: "0.6–1.2" },
    { key: "urea", re: /\bUrea\s*:?\s*([\d.]+)/i, unit: "mg/dL", ref: "15–40" },
    { key: "alt", re: /\bALT\s*:?\s*([\d.]+)/i, unit: "U/L", ref: "7–45" },
    { key: "ast", re: /\bAST\s*:?\s*([\d.]+)/i, unit: "U/L", ref: "8–40" },
    { key: "hba1c", re: /HbA1c\s*:?\s*([\d.]+)/i, unit: "%", ref: "4.0–5.6" },
    { key: "inr", re: /\bINR\s*:?\s*([\d.]+)/i, unit: "ratio", ref: "0.8–1.2" },
    { key: "crp", re: /\bCRP\s*:?\s*([\d.]+)/i, unit: "mg/L", ref: "<5" },
    { key: "potassium", re: /\b(?:K|Potassium)\s*:?\s*([\d.]+)/i, unit: "mmol/L", ref: "3.5–5.1" },
    { key: "sodium", re: /\b(?:Na|Sodium)\s*:?\s*([\d.]+)/i, unit: "mmol/L", ref: "135–145" },
    { key: "glucose", re: /\b(?:Random glucose|Fasting glucose|Glucose|RBS|FBS)\s*:?\s*([\d.]+)/i, unit: "mmol/L", ref: "3.9–7.8" },
    { key: "albumin", re: /Albumin\s*:?\s*([\d.]+)/i, unit: "g/dL", ref: "3.5–5.0" },
    { key: "bilirubin", re: /\b(?:Total bilirubin|Bilirubin)\s*:?\s*([\d.]+)/i, unit: "mg/dL", ref: "<1.2" },
    { key: "amylase", re: /Amylase\s*:?\s*([\d.]+)/i, unit: "U/L", ref: "30–100" },
    { key: "calcium", re: /Calcium\s*:?\s*([\d.]+)/i, unit: "mmol/L", ref: "2.1–2.6" },
  ];
  const out: ParsedLab[] = [];
  for (const s of specs) {
    const m = s.re.exec(text);
    if (!m) continue;
    const value = Number(m[1]);
    if (!Number.isFinite(value)) continue;
    out.push({
      analyte: s.key,
      value,
      unit: s.unit,
      flag: REFERENCE[s.key] ? REFERENCE[s.key](value) : "unknown",
      reference: s.ref,
    });
  }
  return out;
}

/* ------------------------------------------------------------- operations */

export type DeptLoad = { department: string; today: number; week: number; backlog: number; label: string };

export function departmentLoad(): DeptLoad[] {
  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date(Date.now() + 7 * 864e5).toISOString();
  const rows = hAll<{ department: string; today: number; week: number }>(
    `SELECT department,
            SUM(CASE WHEN substr(start_at,1,10) = ? THEN 1 ELSE 0 END) AS today,
            SUM(CASE WHEN start_at >= ? AND start_at < ? THEN 1 ELSE 0 END) AS week
     FROM hms_appointments GROUP BY department`,
    [today, new Date().toISOString(), weekEnd]
  );
  const backlog = {
    Laboratory: hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_lab_orders WHERE status != 'verified'")?.c ?? 0,
    Radiology: hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_imaging_orders WHERE status != 'reported'")?.c ?? 0,
    Pharmacy: hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_prescriptions WHERE status = 'pending'")?.c ?? 0,
    Inpatient: hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_beds WHERE status = 'occupied'")?.c ?? 0,
    Surgery: hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_surgeries WHERE status = 'scheduled'")?.c ?? 0,
    OPD: hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_appointments WHERE status IN ('waiting','confirmed')")?.c ?? 0,
  } as Record<string, number>;

  const map = new Map(rows.map((r) => [r.department, r]));
  return Object.keys(backlog).map((department) => {
        const row = map.get(department);
        const todayCount = Number(row?.today ?? 0);
        const backlogCount = backlog[department];
        const load = department === "Pharmacy" || department === "Laboratory" || department === "Radiology"
          ? backlogCount
          : todayCount;
        return {
          department,
          today: todayCount,
          week: Number(row?.week ?? 0),
          backlog: backlogCount,
          label: load > 15 ? "busy" : load > 6 ? "steady" : "quiet",
        };
      })
      .sort((a, b) => b.backlog - a.backlog);
}

export type Insight = {
  id: string;
  title: string;
  detail: string;
  impact: string;
  severity: "opportunity" | "warning" | "win";
  action?: { label: string; href: string };
  metric?: { value: string; label: string };
};

export function insights(): Insight[] {
  const out: Insight[] = [];
  const lowStock = hAll<{ name: string; stock: number; reorder_level: number }>(
    "SELECT name, stock, reorder_level FROM hms_medicines WHERE stock <= reorder_level ORDER BY (stock * 1.0 / NULLIF(reorder_level,0)) ASC LIMIT 4"
  );
  if (lowStock.length) {
    out.push({
      id: "stock",
      title: `${lowStock.length} medicines at or below reorder level`,
      detail: `${lowStock.map((m) => `${m.name} (${m.stock})`).join(", ")} will run out during routine surgical lists. Raise a purchase order today.`,
      impact: "Prevents theatre cancellation",
      severity: "warning",
      action: { label: "Open pharmacy stock", href: "/hms/pharmacy?tab=stock" },
      metric: { value: String(lowStock.length), label: "items low" },
    });
  }

  const expiring = hGet<{ c: number }>(
    "SELECT COUNT(*) AS c FROM hms_medicines WHERE expiry IS NOT NULL AND expiry <= date('now','+30 day')"
  );
  if (Number(expiring?.c ?? 0) > 0) {
    out.push({
      id: "expiry",
      title: "Batches expiring within 30 days",
      detail: "Rotate stock to the front of the shelf and quarantine anything already expired — using expired antibiotics is an infection-control breach.",
      impact: "Avoids dispensing risk",
      severity: "warning",
      action: { label: "Review expiry list", href: "/hms/pharmacy?tab=stock" },
      metric: { value: String(expiring?.c ?? 0), label: "batches" },
    });
  }

  const beds = hGet<{ total: number; occupied: number }>(
    "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) AS occupied FROM hms_beds"
  );
  const occupancy = beds?.total ? Math.round((Number(beds.occupied) / Number(beds.total)) * 100) : 0;
  out.push({
    id: "beds",
    title: occupancy >= 70 ? "Bed occupancy is high" : "Bed capacity is available",
    detail:
      occupancy >= 70
        ? `${occupancy}% of the ten beds are occupied. Keep B-10 (high dependency) clear and plan discharges before 11:00 to protect tomorrow's surgical list.`
        : `${occupancy}% occupancy leaves room for urgent transfers. Pre-emptive admission of elective cases the evening before surgery would cut morning delays.`,
    impact: occupancy >= 70 ? "Discharge planning" : "+2 elective slots/week",
    severity: occupancy >= 70 ? "warning" : "opportunity",
    action: { label: "Open inpatient board", href: "/hms/inpatients" },
    metric: { value: `${occupancy}%`, label: "occupancy" },
  });

  const labPending = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_lab_orders WHERE status != 'verified'")?.c ?? 0;
  out.push({
    id: "lab",
    title: labPending > 8 ? "Laboratory backlog needs attention" : "Laboratory turnaround is healthy",
    detail:
      labPending > 8
        ? `${labPending} orders are still open. Prioritise urgent panels first, then batch the routine biochemistry run at 14:00 to use one reagent cycle.`
        : `Only ${labPending} orders remain open — well inside the 24-hour target. Consider offering same-day panels to OPD as an upsell.`,
    impact: labPending > 8 ? "Results within 24 h" : "Same-day panel revenue",
    severity: labPending > 8 ? "warning" : "win",
    action: { label: "Open laboratory", href: "/hms/lab" },
    metric: { value: String(labPending), label: "open orders" },
  });

  const unpaid = hGet<{ n: number; total: number }>(
    "SELECT COUNT(*) AS n, COALESCE(SUM(total - paid),0) AS total FROM hms_invoices WHERE status != 'paid'"
  );
  if (Number(unpaid?.n ?? 0) > 0) {
    out.push({
      id: "cash",
      title: "Outstanding invoices to collect",
      detail: `${unpaid?.n} invoices carry an open balance. Send a statement at 10:00 and again at 16:00 — two reminders recover most balances without a phone call.`,
      impact: "Cash-flow protection",
      severity: "opportunity",
      action: { label: "Open billing", href: "/hms/billing" },
      metric: { value: `$${Number(unpaid?.total ?? 0).toFixed(0)}`, label: "outstanding" },
    });
  }

  const unsigned = hGet<{ c: number }>("SELECT COUNT(*) AS c FROM hms_prescriptions WHERE status = 'pending'")?.c ?? 0;
  if (Number(unsigned) > 0) {
    out.push({
      id: "unsigned",
      title: "Prescriptions awaiting signature",
      detail: `${unsigned} draft prescriptions cannot be dispensed. Sign them from the worklist in one pass — the pharmacy queue updates immediately.`,
      impact: "Faster dispensing",
      severity: "warning",
      action: { label: "Sign prescriptions", href: "/hms/prescriptions" },
      metric: { value: String(unsigned), label: "unsigned" },
    });
  }

  return out;
}

export type ForecastPoint = {
  date: string;
  label: string;
  weekday: string;
  visits: number;
  capacity: number;
  demandPct: number;
  level: "low" | "steady" | "high";
};

/** Seasonal-naive demand forecast across the next N days. */
export function forecastOpd(days = 14): { points: ForecastPoint[]; avg: number; trend: number; busiest: string } {
  const history = hAll<{ d: string; c: number }>(
    `SELECT substr(start_at,1,10) AS d, COUNT(*) AS c FROM hms_appointments
     WHERE start_at >= date('now','-56 day') GROUP BY d`
  );
  const byWeekday = Array.from({ length: 7 }, () => ({ total: 0, days: 0 }));
  for (const row of history) {
    const wd = new Date(`${row.d}T00:00:00Z`).getUTCDay();
    byWeekday[wd].total += Number(row.c);
    byWeekday[wd].days += 1;
  }
  const overall = history.reduce((a, b) => a + Number(b.c), 0) / Math.max(1, history.length || 1);
  const baseline = byWeekday.map((w) => (w.days ? w.total / w.days : overall || 8));
  const capacity = 16; // OPD consultation slots per day across the physician rota

  const points: ForecastPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const wd = d.getUTCDay();
    const visits = Math.max(2, Math.round((baseline[wd] || overall || 8) * (1 + (i * 0.004))));
    const demandPct = Math.round((visits / capacity) * 100);
    points.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      weekday: d.toLocaleDateString("en-GB", { weekday: "short" }),
      visits,
      capacity,
      demandPct,
      level: demandPct >= 85 ? "high" : demandPct >= 55 ? "steady" : "low",
    });
  }
  const firstWeek = points.slice(0, 7).reduce((a, b) => a + b.visits, 0);
  const lastWeek = points.slice(7).reduce((a, b) => a + b.visits, 0) || firstWeek;
  const busiest = [...points].sort((a, b) => b.visits - a.visits)[0]?.weekday ?? "Sat";
  return {
    points,
    avg: Math.round(points.reduce((a, b) => a + b.visits, 0) / Math.max(1, points.length)),
    trend: lastWeek ? Math.round(((lastWeek - firstWeek) / firstWeek) * 1000) / 10 : 0,
    busiest,
  };
}

export type FollowUp = {
  id: string;
  patient: string;
  patient_id: string;
  channel: "sms" | "email";
  subject: string;
  body: string;
  reason: string;
};

export function generateFollowUps(patientIds?: string[]): FollowUp[] {
  const rows = hAll<{ id: string; name: string; phone: string | null; email: string | null; diagnosis: string | null; created_at: string | null }>(
    `SELECT p.id, p.name, p.phone, p.email, e.diagnosis, e.created_at
     FROM hms_patients p
     LEFT JOIN hms_encounters e ON e.patient_id = p.id
     WHERE ${patientIds?.length ? `p.id IN (${patientIds.map(() => "?").join(",")})` : "1=1"}
     GROUP BY p.id ORDER BY p.name LIMIT 12`,
    patientIds ?? []
  );
  return rows.map((r, i) => {
    const days = Math.floor((Date.now() - new Date(r.created_at ?? Date.now()).getTime()) / 864e5);
    const reason = days > 10 ? "overdue review" : "post-visit check";
    return {
      id: r.id,
      patient: r.name,
      patient_id: r.id,
      channel: i % 3 === 0 ? "email" : "sms",
      reason,
      subject: `Your follow-up at Aybek Ten-Bed Specialy Surgical Hospital`,
      body:
        days > 10
          ? `Dear ${r.name.split(" ")[0]}, our team is reviewing your record from ${days} days ago${r.diagnosis ? ` (${r.diagnosis})` : ""}. Please book a review so we can confirm your recovery is on track. Reply 1 to request a call.`
          : `Dear ${r.name.split(" ")[0]}, thank you for visiting us. How are you feeling after your appointment? Reply 1 if you would like the physician to call you, or 2 to book a follow-up.`,
    };
  });
}

export function noShowRisk(limit = 8) {
  const rows = hAll<{ id: string; name: string; start_at: string; department: string; status: string }>(
    `SELECT a.id, p.name, a.start_at, a.department, a.status
     FROM hms_appointments a JOIN hms_patients p ON p.id = a.patient_id
     WHERE a.status IN ('confirmed','waiting') AND a.start_at >= ? ORDER BY a.start_at LIMIT 40`,
    [new Date().toISOString()]
  );
  return rows
    .map((r) => {
      let risk = 14;
      const hour = new Date(r.start_at).getUTCHours();
      if (hour >= 15) risk += 9;
      if (/reception|radiology/i.test(r.department)) risk += 4;
      if (r.status === "confirmed") risk += 6;
      return {
        ...r,
        risk: Math.min(94, risk),
        band: risk >= 30 ? "high" : risk >= 20 ? "medium" : "low",
      };
    })
    .sort((a, b) => b.risk - a.risk)
    .slice(0, limit);
}
