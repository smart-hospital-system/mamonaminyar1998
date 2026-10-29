import type { RxTemplate } from "@/lib/hms/templates";
import { age, dateShort } from "@/lib/hms/format";

export type RxPatient = {
  patient_name: string;
  patient_mrn?: string | null;
  mrn?: string | null;
  gender?: string | null;
  dob?: string | null;
  phone?: string | null;
  allergies?: string | null;
  address?: string | null;
};

export type RxItem = {
  id?: string;
  drug: string;
  strength?: string | null;
  form?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
  qty?: number | null;
  unit_price?: number | null;
};

export type RxDoc = {
  rx_no: string;
  created_at: string;
  diagnosis?: string | null;
  icd10?: string | null;
  notes?: string | null;
  follow_up?: string | null;
  doctor_name?: string | null;
  doctor_title?: string | null;
  status?: string | null;
  signed_at?: string | null;
};

export type RxIdentity = {
  name: string;
  name_short?: string;
  local?: string;
  tagline?: string;
  licence?: string;
  phone?: string;
  emergency?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  footer?: string;
};

const FONT: Record<RxTemplate["font"], string> = {
  sans: "ui-sans-serif, 'Segoe UI', system-ui, sans-serif",
  serif: "'Georgia', 'Times New Roman', serif",
  display: "'Trebuchet MS', 'Segoe UI', sans-serif",
  mono: "'Courier New', ui-monospace, monospace",
};

function crossSvg(color: string, size = 30) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <rect x="15" y="2" width="10" height="36" rx="2.5" fill={color} />
      <rect x="2" y="15" width="36" height="10" rx="2.5" fill={color} />
    </svg>
  );
}

function Glyph({ kind, color }: { kind: RxTemplate["rxGlyph"]; color: string }) {
  if (kind === "cross") return crossSvg(color, 26);
  if (kind === "script")
    return (
      <span style={{ fontFamily: FONT.serif, fontSize: 40, lineHeight: 1, color, fontStyle: "italic" }}>℞</span>
    );
  if (kind === "outline")
    return (
      <span
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34,
          borderRadius: "50%", border: `1.6px solid ${color}`, color, fontSize: 19, fontFamily: FONT.serif, lineHeight: 1,
        }}
      >
        ℞
      </span>
    );
  if (kind === "badge")
    return (
      <span
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 30,
          borderRadius: 6, background: color, color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
        }}
      >
        Rx
      </span>
    );
  return (
    <svg width={30} height={30} viewBox="0 0 40 40" aria-hidden>
      <path d="M12 8c0 9 4 12 8 14s8 5 8 10" stroke={color} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2.4" fill="none" />
      <circle cx="28" cy="32" r="4" stroke={color} strokeWidth="2.4" fill="none" />
    </svg>
  );
}

function Ornament({ kind, t }: { kind: RxTemplate["ornaments"]; t: RxTemplate }) {
  const base = { position: "absolute" as const, inset: 0, pointerEvents: "none" as const, overflow: "hidden" };
  if (kind === "none") return null;
  if (kind === "rule")
    return (
      <div style={base}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 7, background: t.accent }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 7, height: 2, background: t.rule }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: t.accent, opacity: 0.8 }} />
      </div>
    );
  if (kind === "fret")
    return (
      <div style={base}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: "absolute", left: 8 + i * 4, right: 8 + i * 4, top: 8 + i * 4, bottom: 8 + i * 4, border: `1px solid ${t.rule}`, opacity: i === 0 ? 0.9 : 0.45 }} />
        ))}
        <div style={{ position: "absolute", inset: 0, borderTop: `10px solid ${t.accent}`, borderBottom: `10px solid ${t.accent}`, opacity: 0.09 }} />
        <div style={{ position: "absolute", top: 22, left: 26, width: 44, height: 44, borderTop: `2px solid ${t.accent}`, borderLeft: `2px solid ${t.accent}` }} />
        <div style={{ position: "absolute", bottom: 22, right: 26, width: 44, height: 44, borderBottom: `2px solid ${t.accent}`, borderRight: `2px solid ${t.accent}` }} />
      </div>
    );
  if (kind === "blobs")
    return (
      <div style={base}>
        <div style={{ position: "absolute", top: -70, right: -60, width: 260, height: 260, borderRadius: "50%", background: t.accentSoft, opacity: 0.85 }} />
        <div style={{ position: "absolute", top: -20, right: 90, width: 90, height: 90, borderRadius: "50%", background: t.accent, opacity: 0.1 }} />
        <div style={{ position: "absolute", bottom: -90, left: -70, width: 240, height: 240, borderRadius: "50%", background: t.accentSoft, opacity: 0.6 }} />
      </div>
    );
  if (kind === "dashed")
    return (
      <div style={base}>
        <div style={{ position: "absolute", inset: 14, border: `1.5px dashed ${t.rule}` }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 26, background: t.accentSoft }} />
      </div>
    );
  if (kind === "paws")
    return (
      <div style={base}>
        <div style={{ position: "absolute", top: -40, right: -30, width: 190, height: 190, borderRadius: "50%", background: t.accentSoft, opacity: 0.7 }} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: "absolute", right: 40 + i * 26, top: 46 + (i % 2) * 16, width: 11, height: 11, borderRadius: "50%", background: t.accent, opacity: 0.18 }} />
        ))}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, background: `repeating-linear-gradient(90deg, ${t.accent} 0 14px, transparent 14px 28px)`, opacity: 0.35 }} />
      </div>
    );
  if (kind === "arcs")
    return (
      <div style={base}>
        <div style={{ position: "absolute", top: -180, left: "50%", transform: "translateX(-50%)", width: 620, height: 340, borderRadius: "50%", border: `26px solid ${t.accent}`, opacity: 0.07 }} />
        <div style={{ position: "absolute", top: -140, left: "50%", transform: "translateX(-50%)", width: 480, height: 280, borderRadius: "50%", border: `2px solid ${t.rule}`, opacity: 0.5 }} />
      </div>
    );
  // mosaic
  return (
    <div style={base}>
      <div
        style={{
          position: "absolute", top: 0, right: 0, width: 180, height: 120, opacity: 0.14,
          background: `repeating-linear-gradient(45deg, ${t.accent} 0 10px, transparent 10px 20px)`,
        }}
      />
      <div
        style={{
          position: "absolute", bottom: 0, left: 0, width: 150, height: 90, opacity: 0.1,
          background: `repeating-linear-gradient(-45deg, ${t.accent} 0 8px, transparent 8px 18px)`,
        }}
      />
    </div>
  );
}

export function RxSheet({
  template: t,
  identity,
  doc,
  patient,
  items,
  scale = 1,
}: {
  template: RxTemplate;
  identity: RxIdentity;
  doc: RxDoc;
  patient: RxPatient;
  items: RxItem[];
  scale?: number;
}) {
  const tableBorder = t.tableStyle === "grid" || t.tableStyle === "hairline" ? `1px solid ${t.rule}` : "none";
  const headBg =
    t.tableStyle === "soft" ? t.accentSoft : t.tableStyle === "banded" ? t.accent : t.tableStyle === "pill" ? "transparent" : "transparent";
  const headColor = t.tableStyle === "banded" ? "#fff" : t.ink;

  return (
    <div
      className="rx-sheet"
      style={{
        background: t.paper,
        color: t.ink,
        fontFamily: FONT[t.font],
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: "top left",
        boxShadow: "0 18px 60px -28px rgba(15,23,42,0.45)",
      }}
    >
      <Ornament kind={t.ornaments} t={t} />

      <div style={{ position: "relative", padding: "16mm 15mm 12mm", display: "flex", flexDirection: "column", minHeight: "297mm", boxSizing: "border-box" }}>
        {/* ---------------------------------------------------------- header */}
        <header style={{ display: "flex", alignItems: "flex-start", gap: 14, borderBottom: `2px solid ${t.accent}`, paddingBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 54, height: 54, borderRadius: t.ornaments === "fret" ? 0 : 12, border: `1.5px solid ${t.accent}`, background: "rgba(255,255,255,0.5)" }}>
            <Glyph kind={t.rxGlyph} color={t.accent} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 19,
                letterSpacing: t.headerCase === "upper" ? 1.4 : 0.1,
                textTransform: t.headerCase === "upper" ? "uppercase" : "none",
                lineHeight: 1.15,
                fontWeight: t.font === "serif" ? 600 : 700,
              }}
            >
              {identity.name}
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: 9.5, letterSpacing: 0.2, opacity: 0.75, textTransform: "uppercase" }}>
              {identity.tagline}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 9, opacity: 0.62 }}>
              {identity.address} · {identity.city}, {identity.country}
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: 8.6, lineHeight: 1.65, opacity: 0.8, minWidth: 128 }}>
            <div style={{ fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", fontSize: 7.6, color: t.accent }}>
              {t.name}
            </div>
            <div>{identity.phone}</div>
            <div>Emergency {identity.emergency}</div>
            <div>{identity.website}</div>
            <div>Licence {identity.licence}</div>
          </div>
        </header>

        {/* ------------------------------------------------------- patient bar */}
        <div
          style={{
            display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginTop: 12,
            padding: "9px 11px", borderRadius: t.ornaments === "fret" ? 0 : 8,
            background: t.ornaments === "fret" || t.ornaments === "mosaic" ? "transparent" : "rgba(255,255,255,0.72)",
            border: `1px solid ${t.rule}`,
          }}
        >
          {[
            { k: "Patient", v: patient.patient_name },
            { k: "MRN", v: patient.patient_mrn ?? patient.mrn ?? "—" },
            { k: "Age / Sex", v: `${age(patient.dob)} · ${patient.gender ?? "—"}` },
            { k: "Date", v: dateShort(doc.created_at) },
          ].map((f) => (
            <div key={f.k} style={{ minWidth: 0 }}>
              <div style={{ fontSize: 7.2, letterSpacing: 0.9, textTransform: "uppercase", opacity: 0.55 }}>{f.k}</div>
              <div style={{ fontSize: 10.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.v}</div>
            </div>
          ))}
        </div>

        {(patient.allergies || doc.diagnosis) && (
          <div style={{ display: "flex", gap: 8, marginTop: 7, fontSize: 9 }}>
            {doc.diagnosis && (
              <div style={{ flex: 1, padding: "6px 9px", borderRadius: 6, background: t.accentSoft, borderLeft: `3px solid ${t.accent}` }}>
                <b style={{ letterSpacing: 0.5, textTransform: "uppercase", fontSize: 7.4, opacity: 0.7 }}>Diagnosis</b>
                <div style={{ fontWeight: 600, fontSize: 10 }}>{doc.diagnosis}{doc.icd10 ? ` (${doc.icd10})` : ""}</div>
              </div>
            )}
            {patient.allergies && (
              <div style={{ minWidth: 150, padding: "6px 9px", borderRadius: 6, border: "1px solid #e6b3ab", background: "#fdf3f1" }}>
                <b style={{ letterSpacing: 0.5, textTransform: "uppercase", fontSize: 7.4, color: "#a33a2b" }}>Allergies</b>
                <div style={{ fontWeight: 600, fontSize: 9.4, color: "#8c2f22" }}>{patient.allergies}</div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- Rx ℞ */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 14, marginBottom: 6 }}>
          <span style={{ fontFamily: FONT.serif, fontSize: 30, lineHeight: 0.9, color: t.accent, fontStyle: t.font === "serif" ? "normal" : "italic" }}>℞</span>
          <div style={{ flex: 1, height: 1, background: t.rule }} />
          <span style={{ fontSize: 8.2, letterSpacing: 0.9, textTransform: "uppercase", opacity: 0.6 }}>{doc.rx_no}</span>
        </div>

        {/* ----------------------------------------------------------- table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 2 }}>
          <thead>
            <tr style={{ background: headBg, color: headColor }}>
              {["#", "Medicine", "Dose & route", "Frequency", "Duration", "Qty"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: i === 0 ? "center" : "left",
                    padding: "6px 7px",
                    fontSize: 7.6,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    border: tableBorder,
                    borderColor: t.rule,
                    fontWeight: 700,
                    width: i === 0 ? 22 : i === 1 ? "34%" : undefined,
                    borderRadius: t.tableStyle === "pill" ? 999 : 0,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr
                key={it.id ?? i}
                style={{
                  background: t.tableStyle === "banded" && i % 2 === 1 ? t.accentSoft : "transparent",
                  borderBottom: t.tableStyle === "hairline" ? `1px solid ${t.rule}` : "none",
                }}
              >
                <td style={{ padding: "7px 6px", fontSize: 9, textAlign: "center", border: tableBorder, borderColor: t.rule, opacity: 0.6 }}>{i + 1}</td>
                <td style={{ padding: "7px 7px", fontSize: 10, border: tableBorder, borderColor: t.rule }}>
                  <div style={{ fontWeight: 650 }}>{it.drug}{it.strength ? ` ${it.strength}` : ""}</div>
                  <div style={{ fontSize: 8, opacity: 0.62 }}>{[it.form, it.instructions].filter(Boolean).join(" · ") || "—"}</div>
                </td>
                <td style={{ padding: "7px 7px", fontSize: 9.2, border: tableBorder, borderColor: t.rule }}>{it.dosage ?? "—"}</td>
                <td style={{ padding: "7px 7px", fontSize: 9.2, border: tableBorder, borderColor: t.rule }}>{it.frequency ?? "—"}</td>
                <td style={{ padding: "7px 7px", fontSize: 9.2, border: tableBorder, borderColor: t.rule }}>{it.duration ?? "—"}</td>
                <td style={{ padding: "7px 7px", fontSize: 9.2, border: tableBorder, borderColor: t.rule }}>{it.qty ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* --------------------------------------------------------- notes */}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: doc.follow_up ? "1.6fr 1fr" : "1fr", gap: 10 }}>
          <div style={{ fontSize: 9.4, lineHeight: 1.55 }}>
            <b style={{ fontSize: 7.6, letterSpacing: 0.9, textTransform: "uppercase", opacity: 0.6 }}>Advice & notes</b>
            <p style={{ margin: "3px 0 0", opacity: 0.85 }}>
              {doc.notes ??
                "Take medicines exactly as prescribed. Complete the full course even if you feel better. Return immediately if you develop fever above 38.5 °C, uncontrolled pain, bleeding or shortness of breath."}
            </p>
          </div>
          {doc.follow_up && (
            <div style={{ padding: "7px 9px", borderRadius: 6, border: `1px dashed ${t.accent}`, fontSize: 9.2 }}>
              <b style={{ fontSize: 7.4, letterSpacing: 0.9, textTransform: "uppercase", opacity: 0.6 }}>Follow-up</b>
              <div style={{ fontWeight: 600 }}>{doc.follow_up}</div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------ signature */}
        <div style={{ marginTop: "auto", paddingTop: 26, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ fontSize: 8, opacity: 0.6, maxWidth: 250, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", fontSize: 7.2, color: t.accent }}>
              {t.ornaments === "fret" ? "Sealed document" : "Electronic authorisation"}
            </div>
            {identity.footer}
            {doc.status && <div style={{ marginTop: 3, textTransform: "capitalize" }}>Status: {doc.status}</div>}
          </div>
          <div style={{ textAlign: "center", minWidth: 190 }}>
            <div
              style={{
                fontFamily: FONT.serif,
                fontStyle: "italic",
                fontSize: 19,
                color: t.accent,
                borderBottom: `1.4px solid ${t.ink}`,
                paddingBottom: 5,
                marginBottom: 4,
                opacity: 0.92,
              }}
            >
              {doc.doctor_name}
            </div>
            <div style={{ fontSize: 8.6, fontWeight: 700 }}>{doc.doctor_name}</div>
            <div style={{ fontSize: 7.8, opacity: 0.65 }}>{doc.doctor_title ?? "Attending physician"}</div>
            <div style={{ fontSize: 7.2, opacity: 0.5, marginTop: 2 }}>
              {doc.signed_at ? `Signed ${dateShort(doc.signed_at)}` : "Signature on file"}
            </div>
          </div>
        </div>

        <footer style={{ marginTop: 12, paddingTop: 7, borderTop: `1px solid ${t.rule}`, display: "flex", justifyContent: "space-between", fontSize: 7.4, opacity: 0.6 }}>
          <span>{identity.name_short ?? identity.name} · {identity.local}</span>
          <span>{doc.rx_no} · page 1 of 1</span>
        </footer>
      </div>
    </div>
  );
}
