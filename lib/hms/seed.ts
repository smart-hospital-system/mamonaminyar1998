import type { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";

/* ------------------------------------------------------------------ helpers */

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260412);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (p: number) => rand() < p;
const pad = (n: number) => String(n).padStart(2, "0");

const iso = (d: Date) => d.toISOString();
const at = (base: Date, dayOffset: number, hour: number, minute = 0) => {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return iso(d);
};

export function seedHms(db: DatabaseSync) {
  const now = new Date();
  const nowIso = iso(now);

  const ins = (table: string, row: Record<string, unknown>) => {
    const keys = Object.keys(row);
    db.prepare(
      `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`
    ).run(...(keys.map((k) => (row[k] === undefined ? null : row[k])) as never[]));
  };

  const audit = (user: string, action: string, entity: string, detail: string, when = nowIso) =>
    ins("hms_audit", {
      id: `aud_s${Math.random().toString(36).slice(2, 9)}`,
      user_id: user,
      user_name: user,
      action,
      entity,
      entity_id: null,
      detail,
      created_at: when,
    });

  db.exec("BEGIN");
  try {
    /* --------------------------------------------------------------- users */
    const pw = bcrypt.hashSync("mamonaminyar", 10);
    const users = [
      { id: "usr_admin", name: "Dr. Mamon Aminyar", email: "doctor@aybek.hospital", role: "admin", dept: "Administration", title: "Medical Director · General Surgeon", color: "#0ea5a4" },
      { id: "usr_arash", name: "Dr. Arash Shirazi", email: "arash@aybek.hospital", role: "doctor", dept: "OPD", title: "Specialist, Internal Medicine", color: "#6366f1" },
      { id: "usr_evelyn", name: "Dr. Evelyn Reed", email: "evelyn@aybek.hospital", role: "doctor", dept: "OPD", title: "General Practitioner", color: "#ec4899" },
      { id: "usr_yusuf", name: "Dr. Yusuf Karimi", email: "yusuf@aybek.hospital", role: "doctor", dept: "Surgery", title: "Consultant Surgeon", color: "#f59e0b" },
      { id: "usr_laila", name: "Dr. Laila Noor", email: "laila@aybek.hospital", role: "radiology", dept: "Radiology", title: "Consultant Radiologist", color: "#8b5cf6" },
      { id: "usr_zahra", name: "Zahra Ahmadi", email: "pharmacy@aybek.hospital", role: "pharmacist", dept: "Pharmacy", title: "Chief Pharmacist", color: "#10b981" },
      { id: "usr_samir", name: "Samir Hadi", email: "lab@aybek.hospital", role: "lab", dept: "Laboratory", title: "Senior Lab Technologist", color: "#0ea5e9" },
      { id: "usr_nadia", name: "Nadia Sultani", email: "nurse@aybek.hospital", role: "nurse", dept: "Inpatient", title: "Ward Sister", color: "#f43f5e" },
      { id: "usr_reza", name: "Reza Amiri", email: "reception@aybek.hospital", role: "reception", dept: "Reception", title: "Front Desk Lead", color: "#64748b" },
    ];
    for (const u of users) {
      ins("hms_users", {
        id: u.id, name: u.name, email: u.email, password_hash: pw, role: u.role,
        department: u.dept, title: u.title, phone: `+93 70 ${int(100, 999)} ${int(1000, 9999)}`,
        avatar_color: u.color, active: 1, last_login_at: nowIso, created_at: nowIso,
      });
    }

    /* ------------------------------------------------------------- settings */
    const settings: Record<string, unknown> = {
      identity: {
        name: "Aybek Ten-Bed Specialy Surgical Hospital",
        name_short: "Aybek Hospital",
        name_local: "شفاخانه ده بستر جراحی ایبک",
        tagline: "Ten beds. One standard: surgical precision with human warmth.",
        license_no: "MOPH-AYB-2026-0148",
        tax_id: "TIN 900-482-771",
        phone: "+93 20 250 1188",
        emergency: "+93 700 118 800",
        email: "care@aybekhospital.af",
        website: "https://aybekhospital.af",
        address: "Street 4, Aybek Medical District, Kabul",
        city: "Kabul",
        country: "Afghanistan",
        timezone: "Asia/Kabul",
        currency: "USD",
        logo_mark: "cross",
        footer_note: "Computer-generated document — valid with the electronic signature of the attending physician.",
      },
      license: {
        status: "trial", serial: "", plan: "Trial (14 days)", seats: 5,
        activated_at: "", owner: "Dr. Mamon Aminyar", machine: "",
      },
      theme: { active: "clinical", rx_template: 1, density: "comfortable", accent: "#0ea5a4" },
    };
    for (const [section, value] of Object.entries(settings)) {
      ins("hms_settings", { section, value: JSON.stringify(value), updated_at: nowIso });
    }

    /* ------------------------------------------------------------- patients */
    const people: [string, "Male" | "Female", string, string, string, string][] = [
      ["Ahmad Wali Karimi", "Male", "1985-03-14", "O+", "Penicillin", "Hypertension"],
      ["Zarghuna Rahimi", "Female", "1991-07-22", "A+", "None", "Iron-deficiency anaemia"],
      ["Najibullah Safi", "Male", "1974-11-02", "B+", "Sulfa drugs", "Type 2 Diabetes Mellitus, Hypertension"],
      ["Farida Noori", "Female", "1998-01-09", "AB+", "None", "—"],
      ["Bilal Hashimi", "Male", "2003-05-18", "O-", "Latex", "Asthma"],
      ["Mariam Sadat", "Female", "1966-09-30", "A-", "Aspirin", "Osteoarthritis"],
      ["Omid Qadiri", "Male", "1989-12-11", "B-", "None", "—"],
      ["Shabnam Azizi", "Female", "1995-04-06", "O+", "None", "Migraine"],
      ["Hamidullah Niazi", "Male", "1979-08-25", "A+", "Ibuprofen", "Peptic ulcer disease"],
      ["Sulaiman Yousufi", "Male", "1958-02-17", "AB-", "None", "Chronic kidney disease stage 3"],
      ["Nasrin Ahmadi", "Female", "2001-10-29", "B+", "None", "—"],
      ["Mohammad Yousuf Rahmani", "Male", "1970-06-13", "O+", "Penicillin", "Type 2 Diabetes Mellitus"],
      ["Laila Haidari", "Female", "1987-03-03", "A+", "None", "Hypothyroidism"],
      ["Rafiullah Naeem", "Male", "1993-11-21", "B+", "None", "—"],
      ["Sima Rasa", "Female", "2009-07-08", "O+", "None", "Recurrent tonsillitis"],
      ["Abdul Qadir Shirzai", "Male", "1962-04-19", "A+", "None", "COPD"],
      ["Parwana Osmani", "Female", "1999-12-05", "AB+", "Codeine", "—"],
      ["Hamza Mubarez", "Male", "1990-05-27", "O+", "None", "—"],
      ["Soraya Jamal", "Female", "1976-09-09", "B-", "Sulfa drugs", "Rheumatoid arthritis"],
      ["Tariq Sultani", "Male", "1983-01-30", "A-", "None", "Hypertension"],
      ["Nargis Habibi", "Female", "1994-08-14", "O+", "None", "—"],
      ["Ihsanullah Faizi", "Male", "1988-02-23", "B+", "None", "Gastritis"],
      ["Meena Popal", "Female", "2002-11-16", "A+", "None", "—"],
      ["Sharif Kamali", "Male", "1968-07-01", "O+", "Metformin", "Type 2 Diabetes Mellitus, CKD"],
      ["Gulsom Barakzai", "Female", "1981-10-10", "AB+", "None", "Anaemia in pregnancy"],
      ["Yusuf Karimi Jr.", "Male", "1997-05-05", "A+", "None", "—"],
    ];
    const patients = people.map(([name, gender, dob, blood, allergies, chronic], i) => ({
      id: `pat_${1001 + i}`,
      mrn: `MRN-${1001 + i}`,
      name,
      gender,
      dob,
      phone: `+93 70 ${int(200, 999)} ${int(1000, 9999)}`,
      email: `${name.split(" ")[0].toLowerCase()}${i + 1}@example.af`,
      address: pick(["Kabul", "Kabul", "Herat", "Mazar-i-Sharif", "Jalalabad", "Kandahar"]) + `, District ${int(1, 12)}`,
      blood_group: blood,
      allergies,
      chronic,
      emergency_contact: `${pick(["Ahmad", "Fatima", "Bashir", "Roya", "Sami"])} ${pick(["Karimi", "Noori", "Safi", "Ahmadi"])} · +93 70 ${int(200, 999)} ${int(1000, 9999)}`,
      insurance: chance(0.45) ? pick(["Aybek Care Plus", "National Health Fund", "Self-pay"]) : "Self-pay",
      notes: chance(0.3) ? pick(["Speaks Dari and Uzbek.", "Prefers female clinician for examinations.", "Requires wheelchair assistance.", "Previous surgery 2022 — appendectomy."]) : null,
      created_at: at(now, -int(0, 380), int(9, 16)),
    }));
    for (const p of patients) ins("hms_patients", p);

    /* ------------------------------------------------------------ medicines */
    const meds: [string, string, string, string, number, number, number][] = [
      ["Amoxicillin", "500 mg", "Capsule", "Antibiotic", 0.35, 8, 40],
      ["Amoxicillin-Clavulanate", "625 mg", "Tablet", "Antibiotic", 1.1, 96, 30],
      ["Ibuprofen", "400 mg", "Tablet", "Analgesic", 0.08, 640, 100],
      ["Paracetamol", "500 mg", "Tablet", "Analgesic", 0.05, 1240, 200],
      ["Cetirizine", "10 mg", "Tablet", "Antihistamine", 0.07, 310, 60],
      ["Metformin", "500 mg", "Tablet", "Antidiabetic", 0.09, 820, 120],
      ["Atorvastatin", "20 mg", "Tablet", "Lipid-lowering", 0.16, 240, 60],
      ["Lisinopril", "10 mg", "Tablet", "Antihypertensive", 0.11, 180, 50],
      ["Aspirin", "80 mg", "Tablet", "Antiplatelet", 0.04, 900, 100],
      ["Glimepiride", "1 mg", "Tablet", "Antidiabetic", 0.12, 140, 40],
      ["Omeprazole", "20 mg", "Capsule", "GI protectant", 0.18, 260, 60],
      ["Ondansetron", "4 mg", "Tablet", "Antiemetic", 0.22, 88, 30],
      ["Cefazolin", "1 g", "Vial", "Antibiotic (IV)", 2.4, 4, 20],
      ["Ceftriaxone", "1 g", "Vial", "Antibiotic (IV)", 2.8, 36, 25],
      ["Tramadol", "50 mg", "Capsule", "Analgesic", 0.24, 120, 40],
      ["Diclofenac", "50 mg", "Tablet", "NSAID", 0.07, 300, 60],
      ["Dexamethasone", "4 mg/ml", "Injection", "Corticosteroid", 0.9, 45, 20],
      ["Normal Saline 0.9%", "500 ml", "IV bag", "Fluid", 0.85, 12, 30],
      ["Ringer's Lactate", "500 ml", "IV bag", "Fluid", 0.95, 58, 25],
      ["Vitamin C", "1000 mg", "Effervescent", "Supplement", 0.2, 210, 40],
      ["Probiotic", "10 Billion CFU", "Sachet", "Supplement", 0.45, 130, 30],
      ["Salbutamol Inhaler", "100 mcg", "Inhaler", "Bronchodilator", 4.2, 22, 10],
      ["Insulin Glargine", "100 IU/ml", "Pen", "Antidiabetic", 18.5, 14, 8],
      ["Enoxaparin", "40 mg", "Pre-filled syringe", "Anticoagulant", 5.6, 30, 15],
      ["Ferrous Sulfate", "200 mg", "Tablet", "Supplement", 0.06, 420, 80],
      ["Folic Acid", "5 mg", "Tablet", "Supplement", 0.03, 500, 80],
      ["Azithromycin", "250 mg", "Tablet", "Antibiotic", 0.42, 72, 30],
      ["Ketorolac", "30 mg/ml", "Injection", "Analgesic", 1.3, 26, 15],
      ["Lidocaine 2%", "20 ml", "Vial", "Local anaesthetic", 1.1, 64, 20],
      ["Povidone Iodine 10%", "500 ml", "Solution", "Antiseptic", 1.6, 40, 12],
      ["Ceftazidime", "1 g", "Vial", "Antibiotic (IV)", 3.1, 18, 20],
      ["Metronidazole", "500 mg", "IV bag", "Antibiotic (IV)", 1.9, 44, 25],
    ];
    meds.forEach(([name, strength, form, category, price, stock, reorder], i) => {
      const expiry = new Date(now);
      expiry.setMonth(expiry.getMonth() + (i === 0 ? -1 : i === 12 ? 0 : int(4, 30)));
      ins("hms_medicines", {
        id: `med_${i + 1}`, name, strength, form, category, unit_price: price, stock,
        reorder_level: reorder, batch: `BT-${2026}-${1000 + i}`, expiry: expiry.toISOString().slice(0, 10),
        supplier: pick(["Kabul Pharma Co.", "MedSupply Intl.", "Ariana Medical", "Global Health Distributors"]),
        location: `Shelf ${String.fromCharCode(65 + (i % 5))}-${int(1, 6)}`, active: 1, updated_at: nowIso,
      });
    });

    /* ------------------------------------------------------------ beds/ward */
    const bedDefs: [string, string, string, number][] = [
      ["B-01", "Ward A", "Surgical", 45], ["B-02", "Ward A", "Surgical", 45],
      ["B-03", "Ward A", "Surgical", 45], ["B-04", "Ward A", "Surgical", 45],
      ["B-05", "Ward A", "Surgical", 45], ["B-06", "Ward A", "Isolation", 65],
      ["B-07", "Ward B", "Post-op", 55], ["B-08", "Ward B", "Post-op", 55],
      ["B-09", "Ward B", "Post-op", 55], ["B-10", "Ward B", "High dependency", 85],
    ];
    for (const [label, ward, type, rate] of bedDefs) {
      ins("hms_beds", { id: `bed_${label.replace("-", "")}`, label, ward, type, status: "available", daily_rate: rate });
    }

    /* ---------------------------------------------------------- appointments */
    const apptReasons = [
      "Post-operative wound review", "Abdominal pain, 3 days", "Follow-up: hypertension",
      "Fever and productive cough", "Pre-operative assessment", "Knee pain on walking",
      "Dressing change", "Diabetes medication review", "Headache and blurred vision",
      "Right upper quadrant pain", "Sutures removal", "Chest tightness on exertion",
      "Antenatal check", "Suspected hernia", "Ear pain, reduced hearing",
    ];
    const deptFor = (doctorId: string) =>
      doctorId === "usr_yusuf" ? "Surgery" : doctorId === "usr_laila" ? "Radiology" : "OPD";
    // 8 weeks of OPD history plus the coming fortnight, so charts and forecasts have signal.
    let apptSeq = 2000;
    for (let dayOffset = -56; dayOffset <= 13; dayOffset++) {
      const d = new Date(now);
      d.setDate(d.getDate() + dayOffset);
      const dow = d.getDay();
      if (dow === 5) continue; // Friday clinic closure
      const growth = dayOffset < 0 ? 1 - (Math.abs(dayOffset) / 56) * 0.3 : 1;
      const base = dow === 1 ? 11 : dow === 6 ? 13 : 9;
      const count = Math.max(3, Math.round(base * growth * (0.85 + rand() * 0.35)));
      for (let k = 0; k < count; k++) {
        const patient = patients[int(0, patients.length - 1)];
        const doctor = pick(["usr_admin", "usr_arash", "usr_evelyn", "usr_yusuf", "usr_arash", "usr_evelyn"]);
        const hour = 8 + Math.floor(k * (9 / Math.max(1, count)));
        const minute = pick([0, 15, 30, 45]);
        const startAt = at(now, dayOffset, hour, minute);
        const past = dayOffset < 0;
        const status = past
          ? chance(0.86) ? "completed" : chance(0.55) ? "no_show" : "cancelled"
          : dayOffset === 0
            ? pick(["completed", "completed", "waiting", "waiting", "confirmed", "confirmed"])
            : chance(0.82) ? "confirmed" : "waiting";
        ins("hms_appointments", {
          id: `apt_${++apptSeq}`,
          patient_id: patient.id,
          doctor_id: doctor,
          department: deptFor(doctor),
          start_at: startAt,
          status,
          reason: pick(apptReasons),
          notes: null,
          created_at: at(now, dayOffset - int(1, 7), 10),
        });
      }
    }

    /* ------------------------------------------------------------ encounters */
    const encounters: { id: string; patient: (typeof patients)[number]; doctor: string; dx: string; icd: string }[] = [];
    const dxPool: [string, string][] = [
      ["Acute Upper Respiratory Infection", "J06.9"],
      ["Type 2 Diabetes Mellitus", "E11.9"],
      ["Essential Hypertension", "I10"],
      ["Acute Appendicitis", "K35.80"],
      ["Iron Deficiency Anaemia", "D50.9"],
      ["Cholelithiasis", "K80.20"],
      ["Community Acquired Pneumonia", "J18.9"],
      ["Gastro-oesophageal Reflux Disease", "K21.9"],
      ["Acute Gastroenteritis", "A09"],
      ["Migraine without Aura", "G43.0"],
      ["Post-operative Wound Infection", "T81.4"],
      ["Osteoarthritis of Knee", "M17.9"],
    ];
    for (let i = 0; i < 36; i++) {
      const patient = patients[int(0, 15)];
      const doctor = pick(["usr_admin", "usr_arash", "usr_evelyn", "usr_yusuf"]);
      const [dx, icd] = dxPool[i % dxPool.length];
      const id = `enc_${3001 + i}`;
      encounters.push({ id, patient, doctor, dx, icd });
      ins("hms_encounters", {
        id, patient_id: patient.id, doctor_id: doctor, department: deptFor(doctor),
        visit_type: i < 4 ? "follow_up" : "new",
        diagnosis: dx, icd10: icd,
        summary: pick([
          "Patient reports improvement after 5 days of treatment. Continue current plan and review in two weeks.",
          "Examination reveals localized tenderness. Ultrasound ordered; analgesia adjusted.",
          "Vitals stable. Advised hydration, rest and return if fever persists beyond 48 hours.",
          "Chronic condition well controlled on current dose. Medication continued, lifestyle counselling given.",
        ]),
        vitals: JSON.stringify({
          bp: `${int(105, 145)}/${int(65, 95)}`,
          pulse: int(62, 98),
          temp: (36 + rand() * 2.4).toFixed(1),
          spo2: int(95, 100),
          weight: int(48, 92),
          height: int(152, 186),
          resp: int(14, 22),
        }),
        status: "closed", created_at: at(now, -int(0, 12), int(8, 17)),
      });
    }

    /* ---------------------------------------------------------- prescriptions */
    const rxSets: [string, string, string, string, string, string][][] = [
      [["Amoxicillin", "500 mg", "Capsule", "1 capsule", "Three times daily", "7 days"],
       ["Paracetamol", "500 mg", "Tablet", "1 tablet", "Every 6 hours as needed", "5 days"],
       ["Cetirizine", "10 mg", "Tablet", "1 tablet", "Once daily at night", "10 days"]],
      [["Metformin", "500 mg", "Tablet", "1 tablet", "Twice daily with meals", "30 days"],
       ["Atorvastatin", "20 mg", "Tablet", "1 tablet", "Once daily at bedtime", "30 days"],
       ["Lisinopril", "10 mg", "Tablet", "1 tablet", "Once daily in the morning", "30 days"],
       ["Aspirin", "80 mg", "Tablet", "1 tablet", "Once daily with food", "30 days"],
       ["Glimepiride", "1 mg", "Tablet", "1 tablet", "Once daily before breakfast", "30 days"]],
      [["Ceftriaxone", "1 g", "Vial", "1 vial IV", "Once daily after dilution", "5 days"],
       ["Metronidazole", "500 mg", "IV bag", "1 bag", "Every 8 hours", "5 days"],
       ["Ondansetron", "4 mg", "Tablet", "1 tablet", "Every 8 hours as needed", "3 days"]],
      [["Omeprazole", "20 mg", "Capsule", "1 capsule", "Once daily before breakfast", "14 days"],
       ["Ibuprofen", "400 mg", "Tablet", "1 tablet", "Twice daily after meals", "5 days"],
       ["Vitamin C", "1000 mg", "Effervescent", "1 tablet", "Once daily in water", "10 days"]],
      [["Ferrous Sulfate", "200 mg", "Tablet", "1 tablet", "Twice daily", "60 days"],
       ["Folic Acid", "5 mg", "Tablet", "1 tablet", "Once daily", "60 days"],
       ["Probiotic", "10 Billion CFU", "Sachet", "1 sachet", "Once daily before bed", "10 days"]],
      [["Tramadol", "50 mg", "Capsule", "1 capsule", "Every 8 hours if pain", "4 days"],
       ["Diclofenac", "50 mg", "Tablet", "1 tablet", "Twice daily after food", "5 days"],
       ["Enoxaparin", "40 mg", "Pre-filled syringe", "1 syringe SC", "Once daily", "7 days"]],
      [["Salbutamol Inhaler", "100 mcg", "Inhaler", "2 puffs", "Every 4-6 hours as needed", "1 month"],
       ["Dexamethasone", "4 mg/ml", "Injection", "1 ampoule IM", "Single dose", "1 day"],
       ["Cetirizine", "10 mg", "Tablet", "1 tablet", "Once daily", "7 days"]],
      [["Azithromycin", "250 mg", "Tablet", "1 tablet", "Once daily", "5 days"],
       ["Paracetamol", "500 mg", "Tablet", "1 tablet", "Every 6 hours as needed", "5 days"]],
      [["Insulin Glargine", "100 IU/ml", "Pen", "12 units SC", "Once daily at bedtime", "30 days"],
       ["Metformin", "500 mg", "Tablet", "1 tablet", "Twice daily with meals", "30 days"]],
      [["Amoxicillin-Clavulanate", "625 mg", "Tablet", "1 tablet", "Twice daily with food", "7 days"],
       ["Paracetamol", "500 mg", "Tablet", "1 tablet", "Every 6 hours as needed", "5 days"],
       ["Probiotic", "10 Billion CFU", "Sachet", "1 sachet", "Once daily", "7 days"],
       ["Vitamin C", "1000 mg", "Effervescent", "1 tablet", "Once daily", "10 days"]],
    ];
    const rxNotes = [
      "Take all medication after meals. Drink plenty of fluids. Rest for 3 days.",
      "Monitor blood pressure every morning and record it. Low-salt diet strictly advised.",
      "Complete the full antibiotic course even if you feel better. Return if fever rises above 38.5°C.",
      "Keep the wound dry for 48 hours. Change dressing every second day at the clinic.",
      "Avoid driving or operating machinery while taking this medication.",
      "Report immediately if you notice rash, swelling of the face, or difficulty breathing.",
    ];
    for (let i = 0; i < 10; i++) {
      const enc = encounters[i];
      const status = i < 4 ? "dispensed" : i < 7 ? "pending" : i < 9 ? "pending" : "dispensed";
      const rxId = `rx_${5001 + i}`;
      ins("hms_prescriptions", {
        id: rxId,
        rx_no: `RX-2026-${String(1200 + i)}`,
        encounter_id: enc.id,
        patient_id: enc.patient.id,
        doctor_id: enc.doctor,
        diagnosis: enc.dx,
        icd10: enc.icd,
        notes: pick(rxNotes),
        follow_up: `Review in ${pick([7, 10, 14, 21])} days or earlier if symptoms worsen.`,
        template: i + 1,
        status,
        signed_by: enc.doctor,
        signed_at: status === "pending" ? null : at(now, -int(0, 3), int(9, 16)),
        dispensed_at: status === "dispensed" ? at(now, -int(0, 2), int(10, 17)) : null,
        pharmacist_id: status === "dispensed" ? "usr_zahra" : null,
        created_at: at(now, -int(0, 4), int(8, 17)),
      });
      rxSets[i].forEach(([drug, strength, form, dosage, freq, dur], idx) => {
        const med = meds.find((m) => m[0] === drug);
        ins("hms_rx_items", {
          id: `rxi_${5001 + i}_${idx}`, prescription_id: rxId, drug, strength, form, dosage, frequency: freq,
          duration: dur, instructions: pick(["Take after meals", "Take on an empty stomach", "Dissolve in water", "With plenty of water", "Do not crush"]),
          qty: int(1, 3) * 10, unit_price: med ? med[4] : 0.2, sort: idx,
        });
      });
      if (status === "dispensed") {
        ins("hms_dispenses", {
          id: `dsp_${5001 + i}`, prescription_id: rxId, patient_id: enc.patient.id, pharmacist_id: "usr_zahra",
          items: JSON.stringify(rxSets[i].map(([drug]) => ({ drug, qty: 30 }))), total: int(6, 48),
          note: null, created_at: at(now, -int(0, 2), int(10, 17)),
        });
      }
    }

    /* ------------------------------------------------------------ lab orders */
    const labTests: [string, string, string][] = [
      ["Haematology", "Complete Blood Count (CBC)", "EDTA whole blood"],
      ["Biochemistry", "Liver Function Test (LFT)", "Serum"],
      ["Biochemistry", "Renal Function Test (RFT)", "Serum"],
      ["Endocrinology", "HbA1c", "EDTA whole blood"],
      ["Endocrinology", "Thyroid Stimulating Hormone (TSH)", "Serum"],
      ["Biochemistry", "Lipid Profile", "Serum"],
      ["Microbiology", "Urine Culture & Sensitivity", "Midstream urine"],
      ["Haematology", "Erythrocyte Sedimentation Rate (ESR)", "EDTA whole blood"],
      ["Serology", "C-Reactive Protein (CRP)", "Serum"],
      ["Coagulation", "Prothrombin Time / INR", "Citrated plasma"],
      ["Biochemistry", "Serum Electrolytes", "Serum"],
      ["Microbiology", "Blood Culture", "Blood culture bottle"],
      ["Haematology", "Malaria Rapid Test", "Whole blood"],
      ["Biochemistry", "Serum Amylase", "Serum"],
    ];
    const labResults = [
      "WBC 11.2 ↑ (4.0–11.0), Hb 12.8, PLT 240 — neutrophilia consistent with bacterial infection.",
      "ALT 68 ↑ (7–45), AST 54 ↑ (8–40), ALP 96, Bilirubin 0.8 — mild hepatocellular pattern.",
      "Urea 42 ↑ (15–40), Creatinine 1.3 ↑ (0.6–1.2), eGFR 62 — early renal impairment.",
      "HbA1c 8.4% ↑ (4.0–5.6%) — suboptimal glycaemic control, review therapy.",
      "TSH 2.1 mIU/L (0.4–4.0) — euthyroid.",
      "Total cholesterol 232 ↑ (<200), LDL 148 ↑ (<100), HDL 42, TG 190 ↑ — dyslipidaemia.",
      "No growth after 48 hours of incubation.",
      "ESR 38 mm/hr ↑ (0–20) — non-specific inflammation.",
      "CRP 42 mg/L ↑ (<5) — active inflammation.",
      "INR 2.4 ↑ (0.8–1.2) — reduce anticoagulant dose.",
      "Na 138, K 4.2, Cl 101, HCO3 24 — within reference range.",
    ];
    for (let i = 0; i < 14; i++) {
      const [panel, test, sample] = labTests[i];
      const patient = patients[int(0, patients.length - 1)];
      const status = i < 6 ? "verified" : i < 10 ? "in_progress" : i < 12 ? "collected" : "ordered";
      ins("hms_lab_orders", {
        id: `lab_${6001 + i}`,
        patient_id: patient.id,
        encounter_id: i < 6 ? encounters[i].id : null,
        ordered_by: pick(["usr_admin", "usr_arash", "usr_evelyn"]),
        panel, test_name: test, priority: i < 2 ? "urgent" : "routine", status, sample_type: sample,
        result: status === "verified" || status === "in_progress" ? labResults[i % labResults.length] : null,
        reference: "See attached reference range sheet",
        technician: status === "verified" ? "Samir Hadi" : null,
        verified_by: status === "verified" ? "usr_samir" : null,
        created_at: at(now, -int(0, 5), int(8, 16)),
        completed_at: status === "verified" ? at(now, -int(0, 2), int(11, 18)) : null,
        price: pick([8, 12, 15, 18, 22, 35]),
      });
    }

    /* --------------------------------------------------------- imaging orders */
    const imaging: [string, string][] = [
      ["X-Ray", "Chest PA erect"], ["X-Ray", "Right knee lateral"], ["Ultrasound", "Whole abdomen"],
      ["CT", "Brain non-contrast"], ["CT", "Chest with contrast"], ["X-Ray", "Left shoulder AP"],
      ["Ultrasound", "Pelvis"], ["X-Ray", "KUB"], ["MRI", "Lumbar spine"], ["Ultrasound", "Obstetric — 2nd trimester"],
    ];
    const findings = [
      "Bilateral lung fields clear. No focal consolidation, pleural effusion or pneumothorax. Cardiothoracic ratio within normal limits.",
      "Marginal osteophyte formation at the patellofemoral joint. No fracture or joint effusion.",
      "Gallbladder contains two echogenic foci with posterior acoustic shadowing; wall thickness 3 mm. No pericholecystic fluid.",
      "No acute intracranial haemorrhage, mass effect or midline shift. Ventricles normal for age.",
      "No pulmonary embolism. Mild bibasal atelectasis. No mediastinal lymphadenopathy.",
      "Acute fracture of the greater tuberosity with 4 mm displacement. Rotator cuff intact.",
      "Uterus anteverted, normal endometrial thickness. Both ovaries normal. No free fluid.",
      "Multiple small calculi in the right renal pelvis. No hydronephrosis.",
    ];
    for (let i = 0; i < 10; i++) {
      const [modality, body] = imaging[i];
      const patient = patients[int(0, 20)];
      const status = i < 4 ? "reported" : i < 7 ? "in_progress" : "requested";
      ins("hms_imaging_orders", {
        id: `img_${7001 + i}`, patient_id: patient.id, encounter_id: i < 4 ? encounters[i].id : null,
        ordered_by: pick(["usr_admin", "usr_arash", "usr_evelyn"]), modality, body_part: body,
        priority: i < 2 ? "urgent" : "routine", status,
        findings: status === "reported" ? findings[i % findings.length] : null,
        impression: status === "reported" ? pick(["Findings consistent with acute infection.", "No acute abnormality detected.", "Recommend clinical correlation and follow-up imaging in 6 weeks.", "Surgical review advised."]) : null,
        radiologist: status === "reported" ? "Dr. Laila Noor" : null,
        created_at: at(now, -int(0, 6), int(8, 16)),
        reported_at: status === "reported" ? at(now, -int(0, 2), int(12, 19)) : null,
        price: modality === "CT" ? 120 : modality === "MRI" ? 180 : modality === "Ultrasound" ? 45 : 30,
      });
    }

    /* -------------------------------------------------------------- surgeries */
    const surgeries: [string, string, string, number][] = [
      ["Laparoscopic cholecystectomy", "usr_yusuf", "Theatre A", 90],
      ["Open inguinal hernia repair (Lichtenstein)", "usr_admin", "Theatre A", 75],
      ["Appendectomy", "usr_yusuf", "Theatre B", 60],
      ["Caesarean section", "usr_admin", "Theatre A", 70],
      ["ORIF distal radius fracture", "usr_yusuf", "Theatre B", 110],
      ["Wound debridement & secondary closure", "usr_admin", "Theatre B", 45],
      ["Thyroidectomy (subtotal)", "usr_yusuf", "Theatre A", 150],
      ["Haemorrhoidectomy", "usr_admin", "Theatre B", 50],
    ];
    surgeries.forEach(([proc, surgeon, theatre, dur], i) => {
      const status = i < 2 ? "completed" : i === 2 ? "in_progress" : "scheduled";
      ins("hms_surgeries", {
        id: `srg_${8001 + i}`, patient_id: patients[i + 2].id, surgeon, procedure_name: proc, theatre,
        scheduled_at: at(now, i < 2 ? -1 : i === 2 ? 0 : int(1, 10), 8 + (i % 5), 30),
        duration_min: dur, status,
        anesthesia: pick(["General anaesthesia", "Spinal anaesthesia", "Local + sedation"]),
        assistant: pick(["Dr. Arash Shirazi", "Dr. Evelyn Reed", "Nurse Nadia Sultani"]),
        anesthetist: "Dr. Samir Hadi",
        notes: i === 0 ? "Laparoscopic approach, four ports. No conversion required." : null,
        created_at: at(now, -int(3, 20), 9),
      });
    });

    /* ------------------------------------------------------------ admissions */
    const occupied = [
      { bed: "bed_B03", patient: 2, consultant: "usr_yusuf", dx: "Acute appendicitis — post-operative day 1", type: "emergency", days: 1 },
      { bed: "bed_B05", patient: 11, consultant: "usr_admin", dx: "Laparoscopic cholecystectomy — post-operative", type: "elective", days: 0 },
      { bed: "bed_B07", patient: 9, consultant: "usr_admin", dx: "Diabetic foot infection — IV antibiotics", type: "emergency", days: 3 },
      { bed: "bed_B08", patient: 15, consultant: "usr_yusuf", dx: "Inguinal hernia repair — post-operative", type: "elective", days: 1 },
      { bed: "bed_B10", patient: 18, consultant: "usr_admin", dx: "Post-operative monitoring — high dependency", type: "emergency", days: 0 },
    ];
    const setBed = (bedId: string, patientId: string, when: string) =>
      db.prepare("UPDATE hms_beds SET status = 'occupied', patient_id = ?, admitted_at = ? WHERE id = ?").run(patientId, when, bedId);

    for (const o of occupied) {
      const patient = patients[o.patient];
      const id = `adm_${o.bed.slice(-3)}`;
      ins("hms_admissions", {
        id, patient_id: patient.id, bed_id: o.bed, consultant: o.consultant, diagnosis: o.dx,
        admission_type: o.type, admitted_at: at(now, -o.days, int(9, 18)), discharged_at: null,
        status: "admitted", notes: null, created_at: at(now, -o.days, int(9, 18)),
      });
      setBed(o.bed, patient.id, at(now, -o.days, int(9, 18)));
    }
    // one bed awaiting cleaning, one blocked for maintenance
    db.prepare("UPDATE hms_beds SET status = 'cleaning' WHERE id = 'bed_B02'").run();
    db.prepare("UPDATE hms_beds SET status = 'blocked', notes = 'Infusion pump servicing — due back Thursday' WHERE id = 'bed_B09'").run();

    /* --------------------------------------------------------------- invoices */
    for (let i = 0; i < 64; i++) {
      const patient = patients[int(0, patients.length - 1)];
      const items = [
        { label: pick(["Consultation", "Follow-up consultation", "Surgical consultation"]), qty: 1, price: pick([10, 15, 25]) },
        ...(chance(0.55) ? [{ label: pick(["CBC", "LFT", "Renal function", "Ultrasound abdomen", "Chest X-ray", "HbA1c"]), qty: 1, price: pick([12, 18, 30, 45]) }] : []),
        ...(chance(0.45) ? [{ label: "Medication dispensed", qty: 1, price: pick([8, 15, 22, 34, 48]) }] : []),
        ...(chance(0.18) ? [{ label: "Bed charge (1 night)", qty: 1, price: pick([45, 55, 85]) }] : []),
        ...(chance(0.1) ? [{ label: pick(["Dressing change", "Suture removal", "IV fluids"]), qty: 1, price: pick([6, 12, 20]) }] : []),
      ];
      const subtotal = items.reduce((a, b) => a + b.price * b.qty, 0);
      const roll = rand();
      const paid = roll < 0.74 ? subtotal : roll < 0.86 ? Math.round(subtotal * 0.5) : 0;
      ins("hms_invoices", {
        id: `inv_${9001 + i}`, invoice_no: `AYB-2026-${String(3100 + i)}`, patient_id: patient.id,
        encounter_id: i < 8 ? encounters[i % encounters.length].id : null, items: JSON.stringify(items),
        subtotal, discount: 0, tax: 0, total: subtotal, paid,
        status: paid >= subtotal ? "paid" : paid > 0 ? "partial" : "unpaid",
        created_at: i < 3 ? at(now, 0, 9 + i, 15) : at(now, -int(0, 34), int(9, 17)),
      });
    }

    /* ----------------------------------------------------------------- alerts */
    const alerts: [string, string, string, string, string, number][] = [
      ["low-stock", "warning", "Pharmacy", "Cefazolin 1 g is below reorder level", "Only 4 vials remain against a reorder level of 20. Surgical prophylaxis stock may run out within 48 hours.", 0],
      ["expired-batch", "critical", "Pharmacy", "Expired batch detected: Amoxicillin 500 mg", "Batch BT-2026-1000 expired last month and is still in active inventory. Quarantine immediately.", 1],
      ["unsigned-rx", "warning", "OPD", "3 prescriptions are unsigned for more than 24 hours", "Unsigned prescriptions cannot be dispensed. Open the prescription list and sign or void them.", 0],
    ];
    alerts.forEach(([code, severity, category, title, detail, fix], i) => {
      ins("hms_alerts", {
        id: `alt_${1001 + i}`, code, severity, category, title, detail,
        link: code === "low-stock" ? "/hms/pharmacy" : code === "unsigned-rx" ? "/hms/prescriptions" : "/hms/pharmacy",
        auto_fixable: fix, status: "open", first_seen: at(now, 0, 7), last_seen: nowIso,
        due_at: new Date(now.getTime() + 48 * 36e5).toISOString(), occurrences: 3,
      });
    });

    /* ------------------------------------------------------------------ audit */
    audit("usr_admin", "seeded", "system", "Aybek HMS demo workspace initialised with 26 patients and 10 beds");
    audit("usr_admin", "created", "patient", "Registered new patient MRN-1026 (Yusuf Karimi Jr.)");
    audit("usr_zahra", "dispensed", "prescription", "Dispensed RX-2026-1200 — 3 items issued");
    audit("usr_samir", "verified", "lab", "Verified CBC result for MRN-1004");
    audit("usr_laila", "reported", "imaging", "Reported chest X-ray for MRN-1007");
    audit("usr_yusuf", "scheduled", "surgery", "Scheduled laparoscopic cholecystectomy in Theatre A");
    audit("usr_nadia", "admitted", "inpatient", "Admitted MRN-1012 to bed B-03");
    audit("usr_reza", "created", "invoice", "Issued invoice AYB-2026-3108");
    audit("usr_admin", "updated", "settings", "Reviewed clinical defaults and prescription template");
    audit("usr_evelyn", "signed", "prescription", "Signed RX-2026-1202 with electronic signature");

    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/* Keep the pad helper referenced for future formatting needs. */
export const _pad = pad;
