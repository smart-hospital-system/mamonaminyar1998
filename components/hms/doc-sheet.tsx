import type { DocTemplate } from "@/lib/hms/templates";
import { dateShort } from "@/lib/hms/format";

/**
 * Four patient-document layouts that deliberately look nothing like the ten
 * prescription papers — a referral letter must never be mistaken for a script.
 */
export function DocumentSheet({
  template,
  identity,
  title = "Referral letter",
  patient = "Fatima Noor",
  mrn = "MRN-1004",
  body = "Thank you for seeing this patient, who was assessed in our surgical clinic today. Imaging and laboratory results are enclosed. We would be grateful for your opinion regarding further management.",
  signature = "Dr. Mamon Aminyar",
  role = "Medical Director · General Surgeon",
  amount,
}: {
  template: DocTemplate;
  identity: { name: string; address: string; city: string; country: string; phone: string; email: string; license_no: string };
  title?: string;
  patient?: string;
  mrn?: string;
  body?: string;
  signature?: string;
  role?: string;
  amount?: { total: number; paid: number };
}) {
  const a = template.accent;

  if (template.layout === "statement") {
    const total = amount?.total ?? 240;
    const paid = amount?.paid ?? 150;
    return (
      <div className="rx-sheet" style={{ padding: "16mm 14mm", background: "#fff", color: "#0f172a", fontFamily: "ui-sans-serif, system-ui" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `3px solid ${a}`, paddingBottom: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{identity.name}</p>
            <p style={{ margin: "2px 0 0", fontSize: 9, color: "#64748b" }}>{identity.address} · {identity.city}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: a }}>Statement</p>
            <p style={{ margin: "2px 0 0", fontSize: 9, color: "#64748b" }}>{dateShort(new Date().toISOString())}</p>
          </div>
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", fontSize: 10 }}>
          <div><b>{patient}</b><br /><span style={{ color: "#64748b" }}>{mrn}</span></div>
          <div style={{ textAlign: "right" }}><b>AYB-2026-3124</b><br /><span style={{ color: "#64748b" }}>Due on receipt</span></div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14, fontSize: 10 }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              {["Description", "Qty", "Unit", "Amount"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 8, letterSpacing: 1, textTransform: "uppercase", color: "#475569" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[["Surgical consultation", 1, 25], ["Laparoscopic appendicectomy", 1, 180], ["Bed charge — 1 night", 1, 45]].map((r) => (
              <tr key={String(r[0])}>
                <td style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0" }}>{r[0]}</td>
                <td style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0" }}>{r[1]}</td>
                <td style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0" }}>${r[2]}</td>
                <td style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0" }}>${Number(r[1]) * Number(r[2])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12, marginLeft: "auto", width: 210, fontSize: 10 }}>
          {[["Total", total], ["Paid", paid], ["Balance", total - paid]].map(([k, v], i) => (
            <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderTop: i === 2 ? `2px solid ${a}` : "1px solid #e2e8f0", fontWeight: i === 2 ? 700 : 400 }}>
              <span>{k}</span><span>${v}</span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 20, fontSize: 8, color: "#94a3b8" }}>Bank transfer · Kabul Bank · Account 0042 8891 0033 · Reference: patient MRN</p>
      </div>
    );
  }

  if (template.layout === "discharge") {
    return (
      <div className="rx-sheet" style={{ padding: "16mm 16mm", background: "#fffdfa", color: "#1c1917", fontFamily: "'Georgia', serif" }}>
        <div style={{ border: `1px solid ${a}`, padding: "14px 16px" }}>
          <p style={{ margin: 0, fontSize: 8.5, letterSpacing: 2, textTransform: "uppercase", color: a }}>{identity.name}</p>
          <h1 style={{ margin: "4px 0 0", fontSize: 17, letterSpacing: 0.4 }}>Discharge summary</h1>
          <p style={{ margin: "3px 0 0", fontSize: 9, color: "#78716c" }}>{identity.address} · {identity.city}, {identity.country} · {identity.phone}</p>
        </div>
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, fontSize: 9.5 }}>
          {[["Patient", patient], ["MRN", mrn], ["Admitted", "12 Oct 2026"], ["Discharged", "15 Oct 2026"], ["Ward / bed", "Surgical ward · B-03"], ["Consultant", signature]].map(([k, v]) => (
            <div key={k}><p style={{ margin: 0, fontSize: 7.4, letterSpacing: 1, textTransform: "uppercase", color: "#a8a29e" }}>{k}</p><p style={{ margin: "1px 0 0", fontWeight: 600 }}>{v}</p></div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 10, lineHeight: 1.7 }}>
          <p style={{ margin: 0, fontSize: 8, letterSpacing: 1.4, textTransform: "uppercase", color: a }}>Diagnosis</p>
          <p style={{ margin: "2px 0 10px" }}>Acute appendicitis (K35.8), uncomplicated. Laparoscopic appendicectomy performed without incident.</p>
          <p style={{ margin: 0, fontSize: 8, letterSpacing: 1.4, textTransform: "uppercase", color: a }}>Hospital course</p>
          <p style={{ margin: "2px 0 10px" }}>Admitted through the emergency route. Nil-by-mouth from midnight, consented for laparoscopy. Afebrile from day one with normal diet tolerated on day two. Wound dry, clips intact.</p>
          <p style={{ margin: 0, fontSize: 8, letterSpacing: 1.4, textTransform: "uppercase", color: a }}>Discharge medication</p>
          <p style={{ margin: "2px 0 10px" }}>Amoxicillin-clavulanate 625 mg three times daily for 5 days · Paracetamol 1 g up to four times daily · Review in the surgical clinic in 10 days for clip removal.</p>
        </div>
        <div style={{ marginTop: 26, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <p style={{ fontSize: 8, color: "#a8a29e", maxWidth: 250, lineHeight: 1.5 }}>{identity.license_no} · This summary is computer generated and valid with the electronic signature below.</p>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontStyle: "italic", fontSize: 16, color: a }}>{signature}</p>
            <p style={{ margin: "3px 0 0", fontSize: 9, fontWeight: 700, borderTop: `1px solid ${a}`, paddingTop: 3 }}>{role}</p>
          </div>
        </div>
      </div>
    );
  }

  if (template.layout === "chart") {
    return (
      <div className="rx-sheet" style={{ background: "#fff", color: "#111827", fontFamily: "ui-sans-serif, system-ui" }}>
        <div style={{ background: a, color: "#fff", padding: "12px 14mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{identity.name}</p>
            <p style={{ margin: "1px 0 0", fontSize: 8.5, opacity: 0.85 }}>Patient chart · {title}</p>
          </div>
          <div style={{ textAlign: "right", fontSize: 8.5, opacity: 0.9 }}>
            <p style={{ margin: 0 }}>{dateShort(new Date().toISOString())}</p>
            <p style={{ margin: 0 }}>{mrn}</p>
          </div>
        </div>
        <div style={{ padding: "14px 14mm" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {[["Patient", patient], ["Sex / age", "Female · 34y"], ["Allergies", "Penicillin"], ["Blood group", "O+"]].map(([k, v]) => (
              <div key={k} style={{ borderTop: `2px solid ${a}`, paddingTop: 4 }}>
                <p style={{ margin: 0, fontSize: 7, letterSpacing: 0.9, textTransform: "uppercase", color: "#9ca3af" }}>{k}</p>
                <p style={{ margin: "1px 0 0", fontSize: 9.5, fontWeight: 600 }}>{v}</p>
              </div>
            ))}
          </div>
          <p style={{ margin: "16px 0 6px", fontSize: 8, letterSpacing: 1.2, textTransform: "uppercase", color: "#6b7280" }}>Vitals trend</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6 }}>
            {[["BP", "118/76"], ["Pulse", "82"], ["Temp", "36.9"], ["SpO₂", "98%"], ["Resp", "16"], ["NEWS", "2"]].map(([k, v]) => (
              <div key={k} style={{ background: "#f3f4f6", borderRadius: 6, padding: "7px 8px" }}>
                <p style={{ margin: 0, fontSize: 7, textTransform: "uppercase", color: "#9ca3af" }}>{k}</p>
                <p style={{ margin: "1px 0 0", fontSize: 11, fontWeight: 700 }}>{v}</p>
              </div>
            ))}
          </div>
          <p style={{ margin: "16px 0 6px", fontSize: 8, letterSpacing: 1.2, textTransform: "uppercase", color: "#6b7280" }}>Encounter</p>
          <p style={{ fontSize: 9.5, lineHeight: 1.75, margin: 0 }}>{body} Reviewed with the surgical team; plan discussed with the patient and consent documented.</p>
        </div>
        <div style={{ position: "absolute", bottom: "12mm", left: "14mm", right: "14mm", borderTop: "1px solid #e5e7eb", paddingTop: 5, fontSize: 8, color: "#9ca3af", display: "flex", justifyContent: "space-between" }}>
          <span>{identity.name}</span><span>{identity.phone}</span>
        </div>
      </div>
    );
  }

  // letterhead
  return (
    <div className="rx-sheet" style={{ padding: "18mm 17mm", background: "#fff", color: "#0f172a", fontFamily: "ui-sans-serif, system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ margin: 0, fontSize: 8, letterSpacing: 2.4, textTransform: "uppercase", color: a }}>Referral</p>
          <p style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 600, letterSpacing: -0.2 }}>{identity.name}</p>
          <p style={{ margin: "2px 0 0", fontSize: 8.5, color: "#64748b" }}>{identity.address} · {identity.city}, {identity.country}</p>
        </div>
        <div style={{ width: 64, height: 64, borderRadius: 12, background: `color-mix(in srgb, ${a} 12%, #fff)`, border: `1px solid ${a}`, display: "flex", alignItems: "center", justifyContent: "center", color: a, fontSize: 22, fontWeight: 700 }}>
          ℞
        </div>
      </div>
      <div style={{ marginTop: 18, borderTop: `4px solid ${a}`, paddingTop: 14 }}>
        <p style={{ margin: 0, fontSize: 9.5, color: "#64748b" }}>{dateShort(new Date().toISOString())}</p>
        <p style={{ margin: "8px 0 0", fontSize: 11, fontWeight: 600 }}>Dear colleague,</p>
        <p style={{ margin: "8px 0 0", fontSize: 10, lineHeight: 1.85 }}>Re: <b>{patient}</b> ({mrn})</p>
        <p style={{ margin: "8px 0 0", fontSize: 10, lineHeight: 1.85 }}>{body}</p>
        <div style={{ marginTop: 14, padding: "9px 11px", borderLeft: `3px solid ${a}`, background: `color-mix(in srgb, ${a} 6%, #fff)`, fontSize: 9.4, lineHeight: 1.7 }}>
          <b>Enclosed:</b> full blood count, renal profile, discharge medication plan and imaging report.
        </div>
        <p style={{ margin: "16px 0 0", fontSize: 10 }}>Yours sincerely,</p>
        <p style={{ margin: "22px 0 0", fontSize: 12, fontWeight: 600 }}>{signature}</p>
        <p style={{ margin: 0, fontSize: 9, color: "#64748b" }}>{role}</p>
        <p style={{ margin: "2px 0 0", fontSize: 8.5, color: "#94a3b8" }}>{identity.phone} · {identity.email} · {identity.license_no}</p>
      </div>
    </div>
  );
}
