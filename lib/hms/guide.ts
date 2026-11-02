export type GuideStep = {
  n: number;
  title: string;
  where: string;
  action: string;
  tip?: string;
  href?: string;
};

export type GuideChapter = {
  id: string;
  icon: string;
  title: string;
  audience: string;
  summary: string;
  minutes: number;
  steps: GuideStep[];
  faq?: { q: string; a: string }[];
};

/**
 * The step-by-step playbook. Every page links into the relevant chapter, and
 * the Guide page renders them with a progress tracker stored per browser.
 */
export const GUIDE: GuideChapter[] = [
  {
    id: "start",
    icon: "compass",
    title: "First hour: the eight steps, in order",
    audience: "Everyone on day one",
    summary: "Sign in, put your name on the hospital, create real logins, walk one test patient end to end, print, back up. Nothing here needs training.",
    minutes: 30,
    steps: [
      { n: 1, title: "Change the starter code", where: "/hms/team → your own row → key icon", action: "Press Generate, then Set code. Print the access card it shows and keep it in a drawer — the code is never shown again.", tip: "A long sentence beats a short code: “Kabul-surgery-2026-ward” is strong and memorable.", href: "/hms/team" },
      { n: 2, title: "Name the hospital", where: "/hms/settings?section=identity", action: "Hospital name, phone, emergency number, address, city, then Save. Every printed document reads from this one screen.", href: "/hms/settings?section=identity" },
      { n: 3, title: "Create one login per person", where: "/hms/team → Add staff", action: "Name, email, role, then Generate for the initial code. Give the printed card to that person once.", tip: "Never share one login: the audit trail has to name the clinician who signed.", href: "/hms/team" },
      { n: 4, title: "Walk one test patient", where: "/hms/patients → chart → New encounter", action: "Register a patient, document an encounter, write and sign a prescription, dispense it in Pharmacy, then invoice and take payment in Billing.", href: "/hms/patients" },
      { n: 5, title: "Visit each department once", where: "/hms/lab · /hms/radiology · /hms/inpatients · /hms/surgery", action: "Collect → result → verify in the lab; accept → report in radiology; admit → discharge → clean in the ward; book → start → complete in theatre.", href: "/hms/lab" },
      { n: 6, title: "Print one prescription", where: "/hms/prescriptions → open → Print", action: "A4, default margins. Switch the language to Dari and print once more to see the right-to-left sheet.", href: "/hms/prescriptions" },
      { n: 7, title: "Take the first backup and practise a restore", where: "/hms/settings?section=data", action: "Download the JSON onto a USB stick, then type RESET and rebuild the demo hospital once, on purpose, so a real restore never surprises you.", href: "/hms/settings?section=data" },
      { n: 8, title: "Learn the two shortcuts", where: "Anywhere · /hms/ask", action: "Ctrl+K opens universal search; Ask Aybek answers “summary”, “low stock”, “who has not paid?” in one sentence.", href: "/hms/ask" },
    ],
    faq: [
      { q: "Who can see the owner-only steps?", a: "Only an administrator. Everyone else sees the six steps that apply to their role, so a new nurse is not asked to edit hospital identity." },
      { q: "The ticks disappeared", a: "Progress is stored per browser. Signing in on a different computer starts the checklist fresh — the work itself is in the database, not the checklist." },
    ],
  },
  {
    id: "install",
    icon: "download",
    title: "Install the hospital on a new computer",
    audience: "Owner / IT",
    summary: "From an empty machine to a signed-in dashboard in about ten minutes, online or fully offline.",
    minutes: 10,
    steps: [
      { n: 1, title: "Install Node.js 22 LTS", where: "nodejs.org → Windows Installer (.msi)", action: "Run the installer, keep the default options and tick “Automatically install the necessary tools”. Reboot if Windows asks.", tip: "Offline machine? Copy node-v22.x.x-x64.msi from your installer USB and double-click it — no internet needed.", href: "/hms/guide?chapter=install" },
      { n: 2, title: "Copy the project folder", where: "E:\\Mamonaminyar-HMS-Print-Design-v4", action: "Copy the whole folder (including the installer scripts) to the same path on the new computer, or any path you prefer.", tip: "Never run the app from a USB stick — the database file lives in data\\." },
      { n: 3, title: "Open PowerShell as Administrator", where: "Start menu → type PowerShell → right-click → Run as administrator", action: "cd into the project folder, e.g. cd E:\\Mamonaminyar-HMS-Print-Design-v4.", href: "" },
      { n: 4, title: "Run the one-shot setup", where: "PowerShell in the project folder", action: "Run aybek-hms\\scripts\\install\\01-setup.ps1, then 02-install.ps1. The first checks the machine, the second installs the packages.", tip: "If Windows blocks the script, run: Set-ExecutionPolicy -Scope Process Bypass" },
      { n: 5, title: "Seed the demo hospital", where: "Same window", action: "Run aybek-hms\\scripts\\install\\03-seed.ps1 — it creates 26 patients, 10 beds, 9 staff logins and 10 prescription templates." },
      { n: 6, title: "Start the app", where: "Same window", action: "Run aybek-hms\\scripts\\install\\04-start.ps1. When it prints the local address, open http://localhost:3000/hms/login in Chrome or Edge.", href: "/hms/login" },
      { n: 7, title: "Sign in as the Medical Director", where: "/hms/login", action: "Email doctor@aybek.hospital, password mamonaminyar. Change the password in Settings before real data is entered.", href: "/hms/login" },
      { n: 8, title: "Activate your licence", where: "/hms/activate", action: "Paste the serial the owner issued, or press Generate inside the owner console. Activation works offline.", href: "/hms/activate" },
      { n: 9, title: "Name your hospital", where: "/hms/settings?section=identity", action: "Set the hospital name, phone, address and logo mark. Everything downstream (prescriptions, invoices, letters) updates instantly.", href: "/hms/settings?section=identity" },
      { n: 10, title: "Verify the print design", where: "/hms/print", action: "Open the print designer, pick a prescription template and press Print preview. A4 must be selected with margins set to Default.", href: "/hms/print" },
    ],
    faq: [
      { q: "Can the offline copy differ from the online one?", a: "No. Both run the same files against the same local SQLite database; the only difference is that the online copy can be reached over your LAN. Feature parity is guaranteed because nothing calls an external service." },
      { q: "Where is my data?", a: "data\\slotly.db next to the app. Copy that single file for a full backup, or use Settings → Data → Download backup for a JSON export." },
    ],
  },
  {
    id: "first-shift",
    icon: "play",
    title: "Your first shift on the system",
    audience: "Everyone",
    summary: "A ten-minute tour that gets a busy clinician from login to signed prescription.",
    minutes: 10,
    steps: [
      { n: 1, title: "Open the command centre", where: "/hms", action: "The dashboard shows today's load per department. Red tiles need action before your first patient." },
      { n: 2, title: "Check the alarm banner", where: "Top bar → bell icon", action: "Critical alarms sit at the top. Acknowledge the ones you are handling so the team knows." },
      { n: 3, title: "Find your patient", where: "/hms/patients", action: "Search by name, MRN or phone. The patient drawer shows allergy and chronic-disease flags before you prescribe." },
      { n: 4, title: "Open the consultation", where: "/hms/opd", action: "Press “Start consult” on the appointment. Vitals, notes and the prescription pad open in one screen." },
      { n: 5, title: "Enter vitals", where: "Consult page → Observations card", action: "Blood pressure, pulse, temperature, SpO₂ and respiratory rate. The triage score updates live — amber means review in 30 minutes." },
      { n: 6, title: "Write the prescription", where: "Consult page → Prescription tab", action: "Search a medicine, pick a frequency and duration. Add up to eight items; the safety panel checks interactions and allergies as you type." },
      { n: 7, title: "Read the safety panel", where: "Right-hand column", action: "Red means stop and change the drug. Amber means document why you accept the risk." },
      { n: 8, title: "Sign", where: "Prescription footer → Sign & issue", action: "Your signature block is applied and the prescription moves to the pharmacy queue instantly." },
      { n: 9, title: "Print or share", where: "Prescription → Print", action: "Choose one of the ten templates. A4 portrait at 100% is the print-safe default." },
      { n: 10, title: "Book the follow-up", where: "Encounter → Follow-up", action: "The suggested interval comes from the diagnosis. Press Book to place it on the clinic calendar." },
    ],
    faq: [
      { q: "What if the internet drops?", a: "Nothing changes. The app and database are local, so the pharmacy still sees the prescription immediately." },
      { q: "Can a nurse sign?", a: "No. Only the Medical Director and physicians can sign clinical documents; nurses can draft and save." },
    ],
  },
  {
    id: "pharmacy",
    icon: "pill",
    title: "Pharmacy workflow",
    audience: "Pharmacist",
    summary: "From the incoming prescription queue to stock accuracy and expiry control.",
    minutes: 8,
    steps: [
      { n: 1, title: "Open the pharmacy dashboard", where: "/hms/pharmacy", action: "The queue tile shows prescriptions waiting. Red badges are urgent." },
      { n: 2, title: "Open a prescription", where: "Queue list", action: "Confirm the patient's name and MRN against the paper slip, then read each item's dose, frequency and duration." },
      { n: 3, title: "Check stock", where: "Prescription drawer → Stock panel", action: "Green means enough on hand. Amber means partial. Red means dispense a substitute and note it." },
      { n: 4, title: "Dispense", where: "Dispense button", action: "Stock decrements automatically and a dispense record is written for the audit trail." },
      { n: 5, title: "Handle an out-of-stock item", where: "Stock tab → item row", action: "Press Restock, enter the quantity received and the batch number. Expiry is mandatory." },
      { n: 6, title: "Rotate near-expiry stock", where: "/hms/pharmacy?tab=stock", action: "Anything expiring in 30 days is amber; expired items are quarantined automatically by the health engine." },
      { n: 7, title: "Print the label", where: "Dispense → Print", action: "The pharmacy label template prints drug, dose, frequency and the patient's name." },
      { n: 8, title: "Close the day", where: "Pharmacy → Reports", action: "Check the dispensed value and low-stock list. The purchase suggestion is generated for you." },
    ],
    faq: [{ q: "Who can edit stock?", a: "Pharmacists and the Medical Director. Every change is written to the audit log with your name." }],
  },
  {
    id: "lab",
    icon: "flask",
    title: "Laboratory workflow",
    audience: "Lab technologist",
    summary: "Receive an order, collect a sample, enter results, flag criticals and verify.",
    minutes: 7,
    steps: [
      { n: 1, title: "Open the worklist", where: "/hms/lab", action: "Orders arrive from OPD and the wards. Urgent requests sit at the top." },
      { n: 2, title: "Mark collected", where: "Order row → Collect", action: "Record the sample type and the collection time. The ordering physician sees the status change immediately." },
      { n: 3, title: "Run the test", where: "Order drawer → Result", action: "Type or paste the values. The engine parses numbers and flags them against the reference range." },
      { n: 4, title: "Watch for critical values", where: "Result panel", action: "A red flag raises an alarm to the ordering doctor within 30 minutes — a hard patient-safety requirement." },
      { n: 5, title: "Verify", where: "Verify button", action: "Only a senior technologist should verify. Verification locks the result into the patient's chart." },
      { n: 6, title: "Print or re-send", where: "Verified order → Print", action: "The lab report template includes the reference ranges and your name." },
      { n: 7, title: "Review turnaround", where: "Lab → Turnaround", action: "Anything older than 48 hours is escalated automatically; check the reason before it escalates." },
    ],
  },
  {
    id: "radiology",
    icon: "scan",
    title: "Radiology workflow",
    audience: "Radiologist",
    summary: "Request, acquire, report and release an imaging study with a structured impression.",
    minutes: 7,
    steps: [
      { n: 1, title: "Open the modality board", where: "/hms/radiology", action: "Studies are grouped by X-ray, ultrasound, CT and MRI. Urgent requests are highlighted." },
      { n: 2, title: "Accept the request", where: "Study row → Accept", action: "Status moves to in-progress so the ward knows the patient is in the department." },
      { n: 3, title: "Write findings", where: "Study drawer → Findings", action: "Describe the study systematically. The engine offers a starter phrase for the selected body part." },
      { n: 4, title: "Write the impression", where: "Impression field", action: "One or two sentences a surgeon can act on. This is what appears on the printed report." },
      { n: 5, title: "Release the report", where: "Report button", action: "The report becomes visible in the patient chart; unreported studies older than 36 hours raise an alarm." },
      { n: 6, title: "Print the report", where: "Study → Print", action: "The formal report template includes your name and licence number." },
    ],
  },
  {
    id: "inpatient",
    icon: "bed",
    title: "Inpatient board (ten beds)",
    audience: "Ward nurse",
    summary: "Admit, transfer, round and discharge across the ten surgical beds.",
    minutes: 8,
    steps: [
      { n: 1, title: "Look at the board", where: "/hms/inpatients", action: "Green beds are free, blue are occupied, amber need cleaning, grey are blocked for maintenance." },
      { n: 2, title: "Admit a patient", where: "Free bed → Admit", action: "Pick the patient, consultant, diagnosis and admission type. Bed charges start immediately." },
      { n: 3, title: "Transfer", where: "Occupied bed → Transfer", action: "Choose the destination bed. The board and billing update in the same transaction." },
      { n: 4, title: "Record observations", where: "Bed drawer → Observations", action: "Enter a full set at least every four hours. The triage score is stored with the observation." },
      { n: 5, title: "Discharge", where: "Occupied bed → Discharge", action: "Write the discharge summary. The bed becomes “cleaning” and the invoice is generated." },
      { n: 6, title: "Keep the high-dependency bed free", where: "Bed B-10", action: "The engine warns when occupancy passes 80% so B-10 stays available for emergencies." },
    ],
  },
  {
    id: "surgery",
    icon: "scissors",
    title: "Theatre scheduling",
    audience: "Surgeon / theatre nurse",
    summary: "Plan the list, book a theatre slot and record the operation note.",
    minutes: 6,
    steps: [
      { n: 1, title: "Open the theatre board", where: "/hms/surgery", action: "See today's list per theatre with start time and expected duration." },
      { n: 2, title: "Book a case", where: "New case", action: "Patient, procedure, surgeon, theatre, date and duration. Conflicts are blocked automatically." },
      { n: 3, title: "Prepare", where: "Case → Prep", action: "Confirm consent, anaesthesia plan, assistant and any implants required." },
      { n: 4, title: "Start and finish", where: "Case → Start / Complete", action: "Timestamps feed the theatre utilisation report." },
      { n: 5, title: "Write the operation note", where: "Case → Operation note", action: "Findings, procedure performed, complications and specimen. Print on the discharge template." },
    ],
  },
  {
    id: "ask",
    icon: "sparkles",
    title: "Ask Aybek — questions answered from your own records",
    audience: "Doctor / Owner / Reception",
    summary: "The fastest way to get a number without opening six screens: type a question in English or Dari and read the answer, the table and the next question.",
    minutes: 4,
    steps: [
      { n: 1, title: "Open Ask Aybek", where: "/hms/ask (or press ⌘K and choose “Ask Aybek”)", action: "Type a question the way you would say it out loud: “how much came in today?”, “what is low on stock?”, “who has not paid?”.", href: "/hms/ask" },
      { n: 2, title: "Read the headline, not the table", where: "The answer card", action: "The big number is the answer; the paragraph explains it; the table is the evidence. The button on the right opens the screen where you can act on it.", href: "/hms/ask" },
      { n: 3, title: "Follow the suggested next question", where: "Bottom of each answer", action: "Each answer offers the one or two questions that naturally follow — “who has not paid?” after revenue, “what is expiring?” after stock.", href: "/hms/ask" },
      { n: 4, title: "Use it at the morning huddle", where: "Any device on the hospital network", action: "Ask “summary” first: it gives today's money, appointments, beds, lab backlog, stock warnings and system health in one line.", href: "/hms/ask" },
    ],
    faq: [
      { q: "Does it need the internet?", a: "No. The question is read by a fixed rule set on this computer and answered from data\\slotly.db. Nothing leaves the building and the answer is the same every time." },
      { q: "Can it invent a number?", a: "No. Every answer is a database query with a stated intent. If the question matches nothing, it returns the hospital summary rather than a guess." },
      { q: "Does it understand Dari?", a: "Yes — every intent is matched against English and Dari keywords, and the answer is written in the language of the interface." },
    ],
  },
  {
    id: "intelligence",
    icon: "brain",
    title: "Clinical toolkit — scoring, interactions, dosing, lab values",
    audience: "Doctor / Nurse / Pharmacist",
    summary: "Five instruments that normally live in a pocket card, a formulary and a calculator, all offline and in both languages.",
    minutes: 8,
    steps: [
      { n: 1, title: "Score a deteriorating patient", where: "/hms/intelligence → Early warning", action: "Enter the observations the nurse just recorded. NEWS2 appears with the escalation instruction the ward must follow.", href: "/hms/intelligence" },
      { n: 2, title: "Screen for sepsis", where: "Same tab, below the score", action: "qSOFA runs automatically from the same numbers: respiratory rate, systolic pressure and mental state. Two or more is a positive screen.", href: "/hms/intelligence" },
      { n: 3, title: "Check a pair of medicines", where: "Medicines → Interaction checker", action: "Type two drug names; the library returns severity, mechanism, what to do and a safer alternative where one exists. The consultation room runs the same library automatically before a prescription can be signed.", href: "/hms/intelligence" },
      { n: 4, title: "Dose a child by weight", where: "Medicines → Paediatric dose", action: "Pick the medicine and enter kilograms. The result shows mg/kg, the frequency, the route and the adult ceiling it was capped at.", href: "/hms/intelligence" },
      { n: 5, title: "Adjust for renal function", where: "Medicines → Renal adjustment", action: "Enter creatinine clearance (Body & scores computes it from age, weight and creatinine) and read the dose band.", href: "/hms/intelligence" },
      { n: 6, title: "Interpret a result", where: "Laboratory → Interpret a value", action: "Choose the test and type the measured value. The flag tells you whether it is low, high or critical against the printed range.", href: "/hms/intelligence" },
    ],
    faq: [
      { q: "Can I trust these numbers?", a: "They follow published adult values — NEWS2 (Royal College of Physicians), qSOFA (Sepsis-3), Cockcroft–Gault, Mosteller, Devine and standard reference ranges. They are prompts for a clinician, not a diagnosis, and every screen says which rule it used." },
      { q: "What if a drug is not in the table?", a: "The tool says so explicitly rather than staying silent: absence of a warning is not proof of safety. Check your printed formulary." },
    ],
  },
  {
    id: "audit",
    icon: "history",
    title: "Prove what happened — the audit trail",
    audience: "Owner / Medical Director",
    summary: "Every registration, signature, dispense, result, admission, payment and settings change is written once and cannot be edited from the interface.",
    minutes: 4,
    steps: [
      { n: 1, title: "Open the trail", where: "/hms/audit", action: "The newest four hundred entries load first, with the person, the action, the record type and the detail.", href: "/hms/audit" },
      { n: 2, title: "Filter to one story", where: "Search box and record-type selector", action: "Type a patient name to see every action on that chart, or pick “Prescription” to see only dispensing history.", href: "/hms/audit" },
      { n: 3, title: "Take it with you", where: "Export CSV", action: "The export contains exactly the rows currently filtered — useful for a ministry inspection or an insurance query.", href: "/hms/audit" },
    ],
    faq: [
      { q: "Can an entry be deleted?", a: "Not from the application. That is deliberate: a trail you can edit is not evidence. Archive a copy with the backup routine instead." },
    ],
  },
  {
    id: "settings",
    icon: "sliders",
    title: "Smart settings and personalisation",
    audience: "Owner",
    summary: "Change the hospital identity, colours, templates, clinical defaults and alarms without touching code.",
    minutes: 9,
    steps: [
      { n: 1, title: "Identity", where: "/hms/settings?section=identity", action: "Hospital name in English and Dari, licence number, phones and address. Used on every printed document." },
      { n: 2, title: "Clinical defaults", where: "/hms/settings?section=clinical", action: "Default prescription template, follow-up interval, whether ICD-10 is shown and whether allergy checks are enforced." },
      { n: 3, title: "Look and feel", where: "/hms/settings?section=theme", action: "Pick one of ten interface themes, adjust the accent colour and choose a prescription template." },
      { n: 4, title: "Alarms", where: "/hms/settings?section=alerts", action: "Turn the monitor on, set the interval (default 30 minutes), the sound and the 48-hour escalation window." },
      { n: 5, title: "Team access", where: "/hms/settings?section=team", action: "Add staff, set their role and department. Roles decide which dashboards they can open." },
      { n: 6, title: "Backup and reset", where: "/hms/settings?section=data", action: "Download a JSON backup before any major change. Demo reset restores the sample hospital." },
    ],
    faq: [{ q: "Can I edit the printed prescription layout?", a: "Yes — the print designer at /hms/print edits paper colour, ink, accent, font, ornaments and table style per template, with a live A4 preview." }],
  },
  {
    id: "licence",
    icon: "key",
    title: "Licensing and activation",
    audience: "Owner",
    summary: "How serials work, how to issue one to a client, and how activation behaves offline.",
    minutes: 5,
    steps: [
      { n: 1, title: "Understand the model", where: "This page", action: "Every serial is self-verifying: four groups, the last computed from the first three with the owner's private key. No internet is required to validate." },
      { n: 2, title: "Issue a serial", where: "/hms/activate → Owner console", action: "Choose an edition and press Generate. The serial is stored with its plan, seats and issue date." },
      { n: 3, title: "Hand it to the client", where: "Outside the app", action: "Send only the serial. Never send the project folder plus a pre-activated database." },
      { n: 4, title: "Client activates", where: "/hms/activate", action: "They paste the serial and confirm the hospital name. The machine name is recorded for support." },
      { n: 5, title: "Trial behaviour", where: "/hms", action: "Without a serial the app runs a 14-day trial and shows a persistent banner. After expiry, clinical writes are blocked until activation." },
    ],
  },
  {
    id: "alerts",
    icon: "bell",
    title: "Health monitor and auto-repair",
    audience: "Everyone",
    summary: "What the alarms mean, how to answer one, and what happens if nobody answers within 48 hours.",
    minutes: 6,
    steps: [
      { n: 1, title: "Understand the scan", where: "/hms/alerts", action: "Every 30 minutes the engine checks stock, expiry, orphan records, bed conflicts, unsigned prescriptions and overdue results." },
      { n: 2, title: "Read the severity", where: "Alarm list", action: "Critical means patient safety or data integrity. Warning means workflow risk. Info is housekeeping." },
      { n: 3, title: "Acknowledge", where: "Alarm row → Acknowledge", action: "Tells the team you are handling it; the timer keeps running." },
      { n: 4, title: "Apply the suggested fix", where: "Alarm drawer → Steps", action: "Each alarm carries the exact page to open and what to change. Follow the numbered steps." },
      { n: 5, title: "Auto-repair", where: "Alarm drawer → Repair now", action: "Only shown when a safe automatic repair exists (quarantine expired stock, relink orphan records, reassign duplicate beds)." },
      { n: 6, title: "The 48-hour rule", where: "Automatic", action: "If an alarm is still open after 48 hours the engine attempts the safest repair itself, and escalates severity if it cannot." },
    ],
  },
];

export function chapterById(id: string) {
  return GUIDE.find((g) => g.id === id) ?? null;
}

export const QUICK_ANSWERS: { q: string; a: string; href?: string }[] = [
  { q: "How do I add a patient?", a: "Go to Patients → New patient. Name, gender and date of birth are the only mandatory fields; the MRN is generated automatically.", href: "/hms/patients" },
  { q: "How do I write and sign a prescription?", a: "Open the consult (OPD → Start consult), add medicines in the prescription tab, read the safety panel, then press Sign & issue.", href: "/hms/opd" },
  { q: "How do I change the hospital name?", a: "Settings → Identity. Every document updates immediately — no restart required.", href: "/hms/settings?section=identity" },
  { q: "How do I print on A4 without cutting off?", a: "Print → A4 portrait, scale 100%, margins Default. Turn off “Headers and footers” in the browser print dialog.", href: "/hms/print" },
  { q: "Why is a bed showing as occupied by two patients?", a: "That is a data conflict. The health engine detects it within 30 minutes and can reassign the later admission automatically.", href: "/hms/alerts" },
  { q: "Who can see the pharmacy dashboard?", a: "The Medical Director, pharmacists (full) and nurses (read-only dispensing view). Access follows the role matrix in Settings → Team.", href: "/hms/pharmacy" },
  { q: "Does the app work without internet?", a: "Yes — everything is local. Only installers and npm packages need the internet, and those can be copied from the offline bundle.", href: "/hms/guide?chapter=install" },
  { q: "How do I back up everything?", a: "Settings → Data → Download backup (JSON) or copy data\\slotly.db. Both contain patients, prescriptions, stock and the audit log.", href: "/hms/settings?section=data" },
];
