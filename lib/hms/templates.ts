export type RxTemplate = {
  id: number;
  slug: string;
  name: string;
  mood: string;
  description: string;
  paper: string;
  ink: string;
  accent: string;
  accentSoft: string;
  rule: string;
  font: "sans" | "serif" | "display" | "mono";
  headerCase: "normal" | "upper";
  ornaments: "none" | "rule" | "fret" | "blobs" | "dashed" | "paws" | "arcs" | "mosaic";
  rxGlyph: "cross" | "script" | "outline" | "badge" | "tooth";
  tableStyle: "soft" | "grid" | "banded" | "pill" | "hairline";
  tags: string[];
};

/**
 * Ten fully editable prescription paper designs.
 * Every colour/serif decision is data so the Settings → Print designer can restyle
 * any template without touching code, and the online preview matches print exactly.
 */
export const RX_TEMPLATES: RxTemplate[] = [
  {
    id: 1,
    slug: "clinical-glass",
    name: "Clinical Glass",
    mood: "Calm · modern · soft 3D",
    description:
      "Frosted white card on a pale blue wash with soft shadows. The hospital default — reads beautifully on phone screens and prints clean on A4.",
    paper: "#f4f8fd",
    ink: "#0f172a",
    accent: "#0ea5a4",
    accentSoft: "#e0f2fe",
    rule: "#dbeafe",
    font: "sans",
    headerCase: "normal",
    ornaments: "blobs",
    rxGlyph: "cross",
    tableStyle: "soft",
    tags: ["default", "light", "clean"],
  },
  {
    id: 2,
    slug: "royal-heritage",
    name: "Royal Heritage",
    mood: "Formal · ornate · gold leaf",
    description:
      "Deep burgundy frame with gold filigree, engraved serif headings and a wax-seal signature block. For surgical authorisations and medico-legal documents.",
    paper: "#fdf8ec",
    ink: "#3b0d12",
    accent: "#a37a1f",
    accentSoft: "#f6e7c5",
    rule: "#c9a54a",
    font: "serif",
    headerCase: "normal",
    ornaments: "fret",
    rxGlyph: "script",
    tableStyle: "grid",
    tags: ["formal", "ornate", "ceremonial"],
  },
  {
    id: 3,
    slug: "sunnycare",
    name: "SunnyCare",
    mood: "Warm · friendly · pastel",
    description:
      "Pastel washes and pill-shaped fields with a playful smile mark. Ideal for paediatric and family clinics where reassurance matters.",
    paper: "#fff7fb",
    ink: "#3b2b4a",
    accent: "#f472b6",
    accentSoft: "#fde7f1",
    rule: "#f9d6e6",
    font: "sans",
    headerCase: "normal",
    ornaments: "blobs",
    rxGlyph: "tooth",
    tableStyle: "pill",
    tags: ["friendly", "paediatric", "pastel"],
  },
  {
    id: 4,
    slug: "midnight-lab",
    name: "Midnight Lab",
    mood: "Dark · technical · precise",
    description:
      "Near-black header band with cyan hairlines and monospaced dosages. Looks like a modern analyser report and hides toner bleed.",
    paper: "#f8fafc",
    ink: "#0b1220",
    accent: "#22d3ee",
    accentSoft: "#0e7490",
    rule: "#cbd5e1",
    font: "mono",
    headerCase: "upper",
    ornaments: "dashed",
    rxGlyph: "outline",
    tableStyle: "hairline",
    tags: ["technical", "dark-header", "lab"],
  },
  {
    id: 5,
    slug: "teal-atelier",
    name: "Teal Atelier",
    mood: "Editorial · airy · geometric",
    description:
      "Big teal arc, generous white space and a thin double rule. A calm editorial layout for consultants who like a signature look.",
    paper: "#ffffff",
    ink: "#0f2b2b",
    accent: "#0d9488",
    accentSoft: "#ccfbf1",
    rule: "#99f6e4",
    font: "sans",
    headerCase: "upper",
    ornaments: "arcs",
    rxGlyph: "badge",
    tableStyle: "banded",
    tags: ["editorial", "modern", "spacious"],
  },
  {
    id: 6,
    slug: "navy-corporate",
    name: "Navy Corporate",
    mood: "Insurance-ready · corporate · crisp",
    description:
      "Navy double rule, bold sans header and clear field grid. Designed for claims and employer-backed billing where clarity beats decoration.",
    paper: "#ffffff",
    ink: "#0c1e3e",
    accent: "#1d4ed8",
    accentSoft: "#dbeafe",
    rule: "#bfdbfe",
    font: "sans",
    headerCase: "upper",
    ornaments: "rule",
    rxGlyph: "cross",
    tableStyle: "grid",
    tags: ["corporate", "claims", "professional"],
  },
  {
    id: 7,
    slug: "veterinary-paws",
    name: "Veterinary Paws",
    mood: "Playful · gentle · light",
    description:
      "Mint wash with paw-print watermark and a vet-specific field set (owner, species, weight). Unused unless the vet module is enabled.",
    paper: "#f6fbf9",
    ink: "#123c33",
    accent: "#10b981",
    accentSoft: "#d1fae5",
    rule: "#d7f0e5",
    font: "sans",
    headerCase: "normal",
    ornaments: "paws",
    rxGlyph: "outline",
    tableStyle: "soft",
    tags: ["veterinary", "gentle", "optional"],
  },
  {
    id: 8,
    slug: "bilingual-surgical",
    name: "Bilingual Surgical",
    mood: "Bilingual · RTL-aware · authoritative",
    description:
      "Dari/English header block with a dotted RTL baseline, mirroring national surgical chart conventions. Mirrors automatically when language is set to Dari.",
    paper: "#fbfdff",
    ink: "#0b2a3a",
    accent: "#0284c7",
    accentSoft: "#e0f2fe",
    rule: "#bae6fd",
    font: "sans",
    headerCase: "normal",
    ornaments: "dashed",
    rxGlyph: "badge",
    tableStyle: "banded",
    tags: ["bilingual", "dari", "national"],
  },
  {
    id: 9,
    slug: "swiss-monochrome",
    name: "Swiss Monochrome",
    mood: "Minimal · grid · typographic",
    description:
      "Black on white with a strict baseline grid and no colour. The most ink-efficient template — perfect for high-volume printing.",
    paper: "#ffffff",
    ink: "#111111",
    accent: "#111111",
    accentSoft: "#f1f1f1",
    rule: "#d4d4d4",
    font: "sans",
    headerCase: "upper",
    ornaments: "none",
    rxGlyph: "outline",
    tableStyle: "hairline",
    tags: ["minimal", "mono", "economical"],
  },
  {
    id: 10,
    slug: "emerald-mosaic",
    name: "Emerald Mosaic",
    mood: "Premium · ornamental · contemporary",
    description:
      "Emerald mosaic band, gold accent lines and a soft card table. The showpiece for private patients, second opinions and referrals abroad.",
    paper: "#f7fbf8",
    ink: "#0b2e21",
    accent: "#047857",
    accentSoft: "#d1fae5",
    rule: "#a7f3d0",
    font: "serif",
    headerCase: "normal",
    ornaments: "mosaic",
    rxGlyph: "script",
    tableStyle: "soft",
    tags: ["premium", "ornamental", "private"],
  },
];

export function templateById(id: number): RxTemplate {
  return RX_TEMPLATES.find((t) => t.id === id) ?? RX_TEMPLATES[0];
}

/* ---------------------------------------------------------------- documents */

export type DocTemplate = {
  id: number;
  slug: string;
  name: string;
  purpose: string;
  accent: string;
  layout: "letterhead" | "chart" | "discharge" | "statement";
};

/** Patient-facing documents get their own look so a chart never mimics a prescription. */
export const DOC_TEMPLATES: DocTemplate[] = [
  { id: 1, slug: "letterhead-minimal", name: "Clinic Letterhead", purpose: "Referral letters, certificates, patient summaries", accent: "#0ea5a4", layout: "letterhead" },
  { id: 2, slug: "chart-banded", name: "Banded Patient Chart", purpose: "Encounter notes, vitals and treatment timeline", accent: "#6366f1", layout: "chart" },
  { id: 3, slug: "discharge-formal", name: "Formal Discharge Summary", purpose: "Discharge summary, operation note, discharge medication plan", accent: "#a3371f", layout: "discharge" },
  { id: 4, slug: "statement-ledger", name: "Ledger Statement", purpose: "Invoices, receipts, insurance statements", accent: "#1d4ed8", layout: "statement" },
];

/* ------------------------------------------------------------------- themes */

export type AppTheme = {
  id: string;
  name: string;
  note: string;
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  text: string;
  muted: string;
  faint: string;
  brand: string;
  brandHover: string;
  brandSoft: string;
  brandInk: string;
  success: string;
  warn: string;
  danger: string;
  chart: string[];
  preview: string;
};

/** Ten interface themes, all editable, all dark-mode safe. */
export const APP_THEMES: AppTheme[] = [
  {
    id: "clinical", name: "Clinical Teal", note: "The hospital default — calm, legible, low fatigue on long shifts.",
    bg: "#f4f8fb", surface: "#ffffff", surface2: "#f8fbfd", surface3: "#eef4f9", border: "#dbe7ef",
    text: "#0f172a", muted: "#5b6b7c", faint: "#8b9aa9", brand: "#0e9488", brandHover: "#0b827a",
    brandSoft: "#d7f5f1", brandInk: "#0a5f5a", success: "#0f9d6e", warn: "#d97706", danger: "#dc2626",
    chart: ["#0e9488", "#38bdf8", "#6366f1", "#f59e0b", "#ec4899", "#22c55e"], preview: "linear-gradient(135deg,#0e9488,#38bdf8)",
  },
  {
    id: "midnight", name: "Midnight Ward", note: "Low-light friendly for night duty and radiology reading rooms.",
    bg: "#0a1220", surface: "#111a2b", surface2: "#16223a", surface3: "#1d2b46", border: "#243653",
    text: "#eaf2ff", muted: "#93a6c0", faint: "#6b7f9c", brand: "#38bdf8", brandHover: "#5cc9fb",
    brandSoft: "#0e2a44", brandInk: "#bfe8ff", success: "#34d399", warn: "#fbbf24", danger: "#f87171",
    chart: ["#38bdf8", "#818cf8", "#34d399", "#fbbf24", "#f472b6", "#22d3ee"], preview: "linear-gradient(135deg,#0a1220,#38bdf8)",
  },
  {
    id: "surgical", name: "Surgical Red", note: "High-contrast theatre theme; critical values jump off the page.",
    bg: "#faf7f5", surface: "#ffffff", surface2: "#fdf8f6", surface3: "#f6ece8", border: "#eddcd5",
    text: "#1a1110", muted: "#6b5551", faint: "#9c837d", brand: "#b91c1c", brandHover: "#9f1717",
    brandSoft: "#fde4e1", brandInk: "#7f1d1d", success: "#15803d", warn: "#b45309", danger: "#991b1b",
    chart: ["#b91c1c", "#f59e0b", "#0ea5e9", "#65a30d", "#7c3aed", "#ec4899"], preview: "linear-gradient(135deg,#b91c1c,#f59e0b)",
  },
  {
    id: "pharmacy", name: "Pharmacy Mint", note: "Green accents help staff scan stock and expiry quickly.",
    bg: "#f3faf6", surface: "#ffffff", surface2: "#f7fdf9", surface3: "#e8f5ee", border: "#d4e9dd",
    text: "#10231a", muted: "#4f6b5c", faint: "#849c8f", brand: "#0f9d6e", brandHover: "#0c855c",
    brandSoft: "#d5f5e6", brandInk: "#0a5c41", success: "#16a34a", warn: "#d97706", danger: "#dc2626",
    chart: ["#0f9d6e", "#22d3ee", "#6366f1", "#f59e0b", "#a3e635", "#ec4899"], preview: "linear-gradient(135deg,#0f9d6e,#a3e635)",
  },
  {
    id: "lab", name: "Laboratory Blue", note: "Cool blue used across analyser screens; good for long result tables.",
    bg: "#f5f8fd", surface: "#ffffff", surface2: "#f9fbff", surface3: "#edf3fb", border: "#dbe5f3",
    text: "#0d1b2e", muted: "#54657c", faint: "#8797ac", brand: "#2563eb", brandHover: "#1d4ed8",
    brandSoft: "#dbeafe", brandInk: "#1e3a8a", success: "#059669", warn: "#d97706", danger: "#dc2626",
    chart: ["#2563eb", "#06b6d4", "#6366f1", "#22c55e", "#f59e0b", "#ec4899"], preview: "linear-gradient(135deg,#2563eb,#06b6d4)",
  },
  {
    id: "radiology", name: "Radiology Slate", note: "Neutral slate that never competes with greyscale imaging.",
    bg: "#f6f7f9", surface: "#ffffff", surface2: "#fafbfc", surface3: "#eef0f3", border: "#e0e4e9",
    text: "#111827", muted: "#5b6572", faint: "#8d97a4", brand: "#475569", brandHover: "#334155",
    brandSoft: "#e6ebf1", brandInk: "#1f2937", success: "#0f766e", warn: "#b45309", danger: "#b91c1c",
    chart: ["#475569", "#94a3b8", "#0ea5e9", "#22c55e", "#f59e0b", "#8b5cf6"], preview: "linear-gradient(135deg,#475569,#94a3b8)",
  },
  {
    id: "violet", name: "Violet Consult", note: "Warm violet for private clinics and cosmetic surgery consults.",
    bg: "#f7f5fd", surface: "#ffffff", surface2: "#fbf9ff", surface3: "#f1ecfc", border: "#e3daf7",
    text: "#1b1430", muted: "#62548a", faint: "#9188ad", brand: "#7c3aed", brandHover: "#6d28d9",
    brandSoft: "#ede4ff", brandInk: "#4c1d95", success: "#0f9d6e", warn: "#d97706", danger: "#dc2626",
    chart: ["#7c3aed", "#c026d3", "#2563eb", "#f59e0b", "#22c55e", "#fb7185"], preview: "linear-gradient(135deg,#7c3aed,#c026d3)",
  },
  {
    id: "sand", name: "Sandstone", note: "Paper-like warmth that is easy on the eyes under clinic lighting.",
    bg: "#faf7f1", surface: "#fffdf9", surface2: "#fdf9f2", surface3: "#f4ece0", border: "#e9dcc9",
    text: "#241d12", muted: "#6d5f49", faint: "#a0917a", brand: "#a16207", brandHover: "#854d0e",
    brandSoft: "#fbeed2", brandInk: "#713f12", success: "#4d7c0f", warn: "#c2410c", danger: "#b91c1c",
    chart: ["#a16207", "#0f766e", "#b45309", "#475569", "#65a30d", "#be123c"], preview: "linear-gradient(135deg,#a16207,#eab308)",
  },
  {
    id: "ocean", name: "Ocean Depth", note: "Deep teal-blue for a premium, uncluttered surgical brand.",
    bg: "#f2f8f9", surface: "#ffffff", surface2: "#f7fbfc", surface3: "#e9f2f5", border: "#d3e5ea",
    text: "#0a1f26", muted: "#4a6672", faint: "#7f99a4", brand: "#0e7490", brandHover: "#0b5f77",
    brandSoft: "#d3eef7", brandInk: "#0c4a56", success: "#0f9d6e", warn: "#d97706", danger: "#dc2626",
    chart: ["#0e7490", "#22d3ee", "#2563eb", "#0f9d6e", "#f59e0b", "#8b5cf6"], preview: "linear-gradient(135deg,#0e7490,#22d3ee)",
  },
  {
    id: "highcontrast", name: "High Contrast", note: "WCAG-AAA contrast for accessibility audits and shared workstations.",
    bg: "#ffffff", surface: "#ffffff", surface2: "#f7f7f7", surface3: "#ececec", border: "#8a8a8a",
    text: "#000000", muted: "#333333", faint: "#555555", brand: "#0b3ea8", brandHover: "#082f80",
    brandSoft: "#e3ecff", brandInk: "#082a6b", success: "#006b3c", warn: "#8a4b00", danger: "#a30000",
    chart: ["#0b3ea8", "#a30000", "#006b3c", "#8a4b00", "#5b21b6", "#0f766e"], preview: "linear-gradient(135deg,#0b3ea8,#000000)",
  },
];

export function themeById(id: string): AppTheme {
  return APP_THEMES.find((t) => t.id === id) ?? APP_THEMES[0];
}
