# The design system — ten prescription papers, four documents, ten themes

All of it is data, not pictures: `lib/hms/templates.ts` holds the palettes, and
`components/hms/rx-sheet.tsx` renders them with the same code that prints the
real prescription. That is why what you see in `/hms/print` is exactly what
comes out of the printer.

---

## 1. The ten prescription papers

| # | Name | Mood | Best for |
|---|------|------|----------|
| 1 | **Clinical Glass** | calm, modern, soft 3D | the hospital default; clean on A4 and readable on a phone |
| 2 | **Royal Heritage** | formal, ornate, gold leaf | surgical authorisations, medico-legal documents |
| 3 | **Sunny Care** | warm, friendly, rounded | paediatric and family clinics, outpatient follow-ups |
| 4 | **Midnight Lab** | dark, technical, monospace | night duty, laboratory-linked prescriptions |
| 5 | **Teal Atelier** | editorial, airy, generous margins | long prescriptions, chronic care |
| 6 | **Navy Corporate** | authoritative, insurance-friendly | insurance claims, corporate contracts |
| 7 | **Veterinary Paws** | playful but precise | the animal clinic that shares the building |
| 8 | **Bilingual Surgical** | bilingual headline, surgical red | Dari/English documents for the ministry |
| 9 | **Swiss Monochrome** | strict grid, no colour | academic referrals, teaching hospital |
| 10 | **Emerald Mosaic** | geometric, warm green | community outreach camps |

Each paper defines: paper colour, ink colour, accent, soft accent, rule colour,
font family (sans / serif / display / mono), header case, ornament style,
℞ glyph and table style. Change any of those in `templates.ts` and every screen,
preview and printout follows.

### Anatomy every paper shares

1. **Header** — logo glyph, hospital name, tagline, address, phone, emergency
   line, website, ministry licence, and the name of the paper itself.
2. **Patient bar** — patient, MRN, age/sex, date.
3. **Diagnosis and allergy strip** — diagnosis with ICD-10; allergies in red.
4. **℞ line** — the prescription symbol, a rule, and the Rx number.
5. **Medication table** — number, medicine and strength, dose and route,
   frequency, duration, quantity.
6. **Advice and follow-up** — free text advice plus a boxed follow-up interval.
7. **Signature block** — hand-written style signature, printed name, role,
   signature date.
8. **Footer** — hospital short name, local name, page count and the legal note.

---

## 2. The four patient documents

Deliberately *not* prescription-shaped, so nobody confuses a letter with a script.

| Layout | Use | Signature features |
|--------|-----|--------------------|
| Clinic Letterhead | referrals, certificates, summaries | top rule, ℞ seal on the right, “Dear colleague” letter structure |
| Banded Patient Chart | encounter notes, vitals, timeline | coloured header band, vitals tiles, no ℞ anywhere |
| Formal Discharge Summary | discharge, operation notes | boxed serif frame, three-column facts grid, discharge medication paragraph |
| Ledger Statement | invoices, receipts, insurance | slate table, right-aligned totals, bank details |

---

## 3. The ten interface themes

`clinical` (teal, default), `midnight` (night duty), `surgical` (high-contrast
red), `pharmacy` (mint), `lab` (laboratory blue), `radiology` (slate),
`surgical-night`, `highcontrast`, plus two additional palettes for long shifts.
Every colour in the workspace comes from a CSS variable set by the active theme,
so a theme switch changes the whole hospital without touching a single component.

Accent colour is independent: choose one of eight presets or pick any colour.

---

## 4. How to change a design

### Small change (no code)
Settings → **Look & print** → theme, accent, default paper. Or open a prescription
and pick a different paper from the dropdown at the top of the sheet.

### Paper-level change (one line of data)
`lib/hms/templates.ts` → find the template → change `accent`, `paper`, `font` or
`tableStyle` → save → refresh. No rebuild is needed in development mode; run
`05-build.ps1` for the production copy.

### Structural change
`components/hms/rx-sheet.tsx`. The ornaments are pure CSS/SVG:
`rule`, `fret`, `blobs`, `dashed`, `paws`, `arcs`, `mosaic`, `none`.
Table styles are `soft`, `grid`, `banded`, `pill`, `hairline`.

---

## 5. Print checklist

* A4 · portrait · margins **none** · scale **100 %** · background graphics **on**
* One prescription = exactly one page (verified for 8 items; the hospital caps a
  prescription at 8 items by default)
* Black-and-white printing works on every paper: contrast is guaranteed by the
  ink colour, not by the accent

---

## 6. Reference material

The original ten designs supplied by the hospital are kept in
`public/hms/reference/` so the papers can always be compared with the source
artwork. They are not loaded by any screen — they are documentation.
