# Working in the hospital — a shift-by-shift guide

Written for the person at the keyboard. Every instruction names the exact
screen and the exact button.

---

## 1. The five department dashboards

Each department dashboard contains the *whole* toolkit — registering patients,
prescribing, ordering tests, printing — scoped to what that department needs.
The difference between them is what is on the screen first, not what is possible.

### OPD — examinations (`/hms/opd`)

| Step | Action |
|------|--------|
| 1 | Open **OPD & consults**. The left column is today's queue in time order. |
| 2 | Press the **phone icon** next to a patient to call them in (status becomes *waiting*). |
| 3 | In **Consult room**, search the patient, or pick the linked appointment. |
| 4 | Type the six vitals. Triage (NEWS) appears as you type — red means escalate now. |
| 5 | Type the working diagnosis. Press **AI draft** to start the note, choose the print design and pre-fill doses. |
| 6 | Add each medicine: name, strength, dose, frequency, duration, quantity. |
| 7 | Read the **Safety screen** panel. Green = clear, amber = caution, red = stop. |
| 8 | Press **Save draft** if the patient is still with you, **Sign & issue** when finished. |
| 9 | Press **Open print sheet**, then **Print / save PDF**. Give it to the patient. |

The safety screen checks 15 interaction rules, allergies (with aliases such as
*penicillin → amoxicillin*), duplicate therapy and maximum doses. A red verdict
blocks issuing until a physician signs with the warning in front of them; the
override is recorded in the audit trail.

### Pharmacy (`/hms/pharmacy`)

**Dispensing tab** — every signed prescription, newest first. Press **Dispense**:
stock is reduced, the charge is added to the patient account and the prescription
is stamped with your name and time.

**Stock tab** — quantity, reorder level, batch, expiry, price. Red quantity =
at or below reorder level. **Receive** adds stock and records the batch and
expiry (always fill them; expiry alarms depend on them).

**Expiry tab** — everything expiring within 60 days, most urgent first. Overdue
batches must be quarantined and reported to the owner.

### Laboratory (`/hms/lab`)

Worklist in four lanes: *ordered → collected → in progress → verified*.
Press **Collect** when the sample is drawn. Press **Enter result** and type the
values exactly as the analyser prints them — one per line:

```
WBC 13.4 10^9/L
Hb 9.1 g/dL
PLT 180 10^9/L
CRP 82 mg/L
```

The assistant recognises WBC, Hb, PLT, creatinine, urea, ALT, AST, HbA1c, INR,
CRP and potassium, shows low/normal/high/critical with reference ranges, and
raises a critical alarm for the ordering physician. Press **Verify** to release.

### Radiology (`/hms/radiology`)

Card board of requests. **Accept** when the patient arrives, **Report** to open
a structured template (chest X-ray, abdominal ultrasound, CT abdomen), then
**Sign & release**. The impression is what the surgeon reads first.

### Inpatients & theatre (`/hms/inpatients`, `/hms/surgery`)

Ten beds: green *ready*, red *occupied*, amber *cleaning*, grey *out of service*.

* **Admit** — tap a green bed, choose the patient, write the working diagnosis.
* **Transfer** — tap the occupied bed, choose the destination; the old bed goes
  to cleaning automatically.
* **Discharge** — press *Discharge* on the bed card; the bed is released.
* **Clean** — tap an amber bed when housekeeping is finished; it turns green.

Theatre: **Book a case** (patient, procedure, theatre, start, duration,
anaesthesia, pre-op note) → **Start** when the patient is on the table →
**Complete** when they leave.

---

## 2. The command centre (`/hms`)

Top row: patients, clinic today, prescriptions to sign, laboratory and imaging
open, beds occupied, money collected today.

Below: collections and demand (14 days), today's clinic, health monitor,
department load, forecast, assistant insights, bed board, theatre list, money
and paperwork, outreach drafts, attendance risk and the audit trail.

Everything is a link. If a number looks wrong, click it and you are in the
department that owns it.

---

## 3. The health monitor (`/hms/alerts`)

The bell in the header shows open alarms; the badge on the sidebar shows the same
count. Critical alarms play a three-note chime (mute it with the bell icon).

What the monitor checks every 30 minutes:

| Code | What it means |
|------|---------------|
| orphan-prescription | a prescription whose patient no longer exists |
| duplicate-mrn | two patients share a medical record number |
| bed-conflict | two admissions claim the same bed |
| expired-stock | a batch past its expiry date is still in active stock |
| low-stock | quantity at or below the reorder level |
| unsigned-rx | a prescription unsigned for more than 24 hours |
| lab-overdue | a laboratory order open for more than 48 hours |
| imaging-overdue | an imaging request without a report after 36 hours |
| occupancy-high | more than 80 % of beds occupied (plan a discharge) |
| surgery-past-due | a scheduled case whose start time has passed |
| admission-no-bed | an admitted patient without a bed |
| monitoring-off | the monitor itself was switched off |
| stale-session | a session open for longer than the configured limit |

**What you do with an alarm**

1. Press **Auto-fix now** when the alarm offers it — the repair is written to the
   audit trail with the exact change.
2. Otherwise press **Acknowledge** and fix it in the department (the *Go to
   department* link takes you there).
3. Press **Resolve** when it is done, with a note.
4. If nobody touches an alarm for **48 hours**, the monitor applies the best
   repair it knows — reassign the record, quarantine the batch, void the
   duplicate — or escalates it to the medical director as critical.

**Repair all** on the alarm page fixes every auto-fixable alarm in one pass
(useful after a busy weekend).

---

## 4. Prescriptions and printing

* `/hms/prescriptions` — the register. Filter by status, open a print sheet, sign
  or dispense inline.
* `/hms/rx/<id>` — the A4 sheet. Choose any of the ten designs from the dropdown
  at the top; the choice is remembered for that prescription.
* `/hms/print` — the studio: all ten papers and four document layouts rendered
  with real data, plus a link to a genuine prescription.

Money documents follow the same rule: on `/hms/billing` press **Print** on an
invoice and the A4 ledger statement at `/hms/receipt/<invoice>` opens on the
hospital letterhead — no pop-up window, no cut-off lines.

A prescription cannot be dispensed until the physician has signed it. If the
pharmacy sees *"still unsigned"*, ask the prescriber to open `/hms/prescriptions`
and press **Sign**; the screen updates the moment they do.

Print settings: A4, margins **none**, background graphics **on**, scale 100 %.
Choose *Save as PDF* to email the document instead of printing it.

---

## 5. Settings (`/hms/settings`)

Six sections plus the look & print studio. Every section shows a short guide
under the form, with the same steps as `/hms/guide`.

* **Hospital identity** — the fastest way to swap the whole hospital: name,
  local name, tagline, licence number, phone, address, currency, footer. Every
  screen and every printed document follows on the next page load.
* **Clinical rules** — default design, prescription prefix, maximum items,
  follow-up interval, turnaround targets, whether a signature is required.
* **Fees & billing** — consultation, follow-up, bed night, tax, markups, prefix.
* **Monitor & alarms** — scan interval, escalation hours, sound, quiet hours.
* **Departments** — hide a module from the navigation for everyone.
* **Look & print** — ten interface themes, an accent colour and the ten papers.

---

## 6. Guide (`/hms/guide`)

Ten chapters, 62 minutes end to end, each step tickable (your ticks are kept in
this browser). Chapters: install, first shift, pharmacy, laboratory, radiology,
inpatients, surgery, settings, licence, alarms. Each has FAQs and a link to the
screen it describes.

---

## 6b. Team and passwords (`/hms/team`)

Administrators only. Add a member of staff (name, email, role, department,
initial password), change a role, suspend or restore access, reset somebody's
password, and change your own password. Suspending a person signs them out
everywhere; the last active administrator cannot be suspended or demoted.
Everything on this page lands in the access history underneath it.

## 7. Roles — who can do what

| Role | Can |
|------|-----|
| admin | everything, including settings and licence |
| doctor | OPD, patients, prescribing, signing, results, theatre, inpatients, analytics |
| surgeon | as doctor, with theatre |
| nurse | inpatients, bed board, dispensing, vitals, invoices |
| pharmacist | pharmacy, dispensing, stock, prescriptions |
| lab | laboratory worklist, results, verification |
| radiology | imaging worklist and reports |
| reception | registration, appointments, billing |

Menus hide what a role cannot use, and every API endpoint re-checks the role —
a hidden button is not a permission.

---

## 8. Keyboard

| Key | Action |
|-----|--------|
| `Ctrl/⌘ + K` | search patients, medicines and pages from anywhere |
| `Esc` | close the search or the alarm popover |
| `Tab` | move through a form in reading order |

---

## 9. The rules that protect the hospital

1. **Never delete.** Corrections are new records; the audit trail keeps the old
   one.
2. **Sign before dispensing.** The pharmacy cannot dispense an unsigned
   prescription, by design.
3. **One patient, one MRN.** If a duplicate appears, the monitor flags it.
4. **Print from the studio, not from a screenshot.** The studio produces a true
   A4 sheet with the hospital header, licence number and signature block.
5. **Back up every evening.** `07-backup.ps1`, then copy the folder to a second
   disk weekly.
6. **Do not share the owner password.** Give each person their own account so
   the audit trail names the right human.

---

## Language / ژبه — English and Dari

The whole interface is bilingual. The **EN / دری** switch sits in the header of every screen
and on the login form; picking Dari mirrors the layout right-to-left, uses Persian digits and
the Solar Hijri calendar, and keeps every label in Dari. The choice is per browser (cookie
`aybek_lang`), so a Dari-speaking pharmacist and an English-speaking surgeon can work on the
same machine at the same time. The hospital-wide default lives in **Settings → Hospital
identity → Default language for new sessions**. Printed papers (prescriptions, receipts,
discharge summaries) print in English with the local hospital name, so they can be read
anywhere.
