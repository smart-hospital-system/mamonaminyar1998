# Aybek Ten-Bed Specialy Surgical Hospital

**شفاخانه ده بستر جراحی ایبک**

A complete, offline-capable hospital information system for a ten-bed surgical
hospital: OPD, pharmacy, laboratory, radiology, inpatients, theatre, billing,
licensing, a 30-minute health monitor and ten printable prescription designs.

Everything runs on one ordinary Windows computer. There is no subscription, no
cloud account and no internet requirement — the same installation works online
and offline, with nothing missing.

---

## 1. What is in this folder

```
aybek-hms/
├─ README.md                  ← you are here
├─ START-HERE.bat             ← double-click: install everything, then start
├─ ONE-CLICK-START.bat        ← double-click: start the hospital
├─ SERIALS.txt                ← created when you generate activation serials
├─ docs/
│  ├─ INSTALL-WINDOWS.md      step-by-step first installation
│  ├─ INSTALL-OFFLINE.md      install on a computer with no internet
│  ├─ USER-GUIDE.md           what each department does, shift by shift
│  ├─ TROUBLESHOOTING.md      every problem we have seen, and its fix
│  ├─ LICENSING.md            serial numbers, seats, revoking
│  ├─ DESIGN-SYSTEM.md        the ten prescription papers explained
│  └─ راهنمای-فارسی.md       Persian / Dari guide
└─ scripts/
   ├─ install/                the ten installer scripts (01 … 10)
   └─ wizards/                one wizard per department (admin, OPD, pharmacy,
                              laboratory, radiology, ward, theatre, reception)
```

The application itself lives in the folder **above** this one (the folder that
contains `package.json`, `app\` and `lib\`). By default that is:

```
E:\Mamonaminyar-HMS-Print-Design-v4
```

Every script accepts `-Path "D:\somewhere"` if you installed it elsewhere.

---

## 2. The ten installer scripts

Run them **in order**. Each one tells you what it did and which script to run
next; each is safe to re-run.

| # | Script | What it does | Time |
|---|--------|--------------|------|
| 01 | `install\01-setup.ps1` | Checks Windows, Node.js, npm, disk space and port 3000; creates `data\`, `logs\`, `backups\`; writes `.env.local`; confirms every core file is present | 1 min |
| 02 | `install\02-install.ps1` | Installs the packages (`npm ci`). Add `-OfflineFrom "E:\AybekOffline\npm-cache"` for a machine without internet | 2–6 min |
| 03 | `install\03-seed.ps1` | Builds the demonstration hospital (26 patients, 10 beds, 32 medicines, prescriptions, results, invoices) and verifies the record counts | 1 min |
| 04 | `install\04-start.ps1` | Starts the server on port 3000 for this machine **and** the tablets on the ward, then opens the sign-in page | 20 s |
| 05 | `install\05-build.ps1` | Type-checks, builds the production copy and (optionally) prepares the offline USB package with `-OfflineTarget "F:\AybekOffline"` | 2–4 min |
| 06 | `install\06-shortcut.ps1` | Desktop shortcut, plus `-AutoStart` to start the hospital with Windows | 10 s |
| 07 | `install\07-backup.ps1` | Timestamped backup of the database, settings, licence and uploads; prunes old copies | 10 s |
| 08 | `install\08-restore.ps1` | Restores any backup, saving the current state first | 30 s |
| 09 | `install\09-activate.ps1` | Activation wizard: checks a serial offline and activates it; `-Generate` issues new serials | 1 min |
| 10 | `install\10-doctor.ps1` | 14 diagnostics (Node, packages, database, identity, licence, port, permissions, disk, logs, templates, time zone) and `-Fix` for safe repairs | 1 min |

**Fastest path on a new computer**

```powershell
# open PowerShell as Administrator, then
cd E:\Mamonaminyar-HMS-Print-Design-v4
Set-ExecutionPolicy -Scope Process Bypass
.\aybek-hms\scripts\install\01-setup.ps1
.\aybek-hms\scripts\install\02-install.ps1
.\aybek-hms\scripts\install\03-seed.ps1
.\aybek-hms\scripts\install\04-start.ps1
```

Or simply double-click **`START-HERE.bat`** in this folder (it runs 01 → 04 in
the right order and pauses if anything fails).

---

## 3. Sign in

Open <http://localhost:3000/hms/login>

| Email | Person | Role | Sees |
|-------|--------|------|------|
| `doctor@aybek.hospital` | Dr. Mamon Aminyar | owner / administrator | everything, settings, licence |
| `arash@aybek.hospital` | Dr. Arash Shirazi | physician | OPD, prescribing, results, patients |
| `evelyn@aybek.hospital` | Dr. Evelyn Reed | physician | OPD, prescribing, results |
| `yusuf@aybek.hospital` | Dr. Yusuf Karimi | surgeon | OPD, theatre, inpatients |
| `zahra@aybek.hospital` | Zahra Noori | pharmacist | pharmacy, dispensing, stock |
| `samir@aybek.hospital` | Samir Popal | laboratory | laboratory worklist |
| `laila@aybek.hospital` | Dr. Laila Aziz | radiology | imaging worklist |
| `nadia@aybek.hospital` | Nadia Rahimi | nurse | inpatients, ward, dispensing |
| `reza@aybek.hospital` | Reza Amin | reception | registration, billing |

**Password for every demonstration account: `mamonaminyar`**

Change the owner password before entering real patient data.

The salon booking workspace from the earlier project is still available at
`/login` with `mamon.aminyar650432@gmail.com` / `mamonaminyar`.

---

## 4. What the system does

### Command centre (`/hms`)
One screen for the medical director: today's clinic, prescriptions to sign,
laboratory and imaging backlog, bed occupancy, money collected, department load,
14-day demand forecast, outreach drafts, attendance risk and the live health
score. Everything is clickable and leads to the department that owns it.

### Five department dashboards, each with the full toolkit
* **OPD** — queue, triage (NEWS), vitals, AI-drafted notes, safety-screened
  prescribing, follow-up booking, print.
* **Pharmacy** — dispensing queue, stock with batch/expiry, receiving, expiry
  watch, automatic stock deduction.
* **Laboratory** — worklist, sample collection, result entry with automatic
  analyte parsing and critical-value alarms, verification.
* **Radiology** — requests, structured reporting templates, impression,
  release to the patient chart.
* **Inpatients & theatre** — live ten-bed board, admit/transfer/discharge/clean,
  surgical list, pre-op notes, case status.

### Safety and intelligence (`/hms/opd`, `/hms/analytics`)
Drug-interaction screening (15 rules), allergy matching with aliases, duplicate
therapy detection, maximum-dose warnings, NEWS2 triage, dose suggestions for
adults and children, note drafting, ICD-10 hints, laboratory result parsing,
demand forecasting, no-show risk, follow-up message drafts and department load.

### Monitoring (`/hms/alerts`)
Every 30 minutes the monitor compares the database with the hospital's rules:
orphan records, duplicate MRNs, bed conflicts, expired and low stock, unsigned
prescriptions older than 24 h, laboratory results older than 48 h, imaging
older than 36 h, occupancy above 80 %, past-due surgery, admissions without a
bed, monitoring switched off and stale sessions. Critical alarms make a sound
in the workspace. If nobody acknowledges within **48 hours**, the monitor
applies the best repair it knows and writes the change to the audit trail.

### Print studio (`/hms/print`)
Ten prescription papers and four patient-document layouts, all rendered by the
same engine that prints the real document. See `docs/DESIGN-SYSTEM.md`.

### Team & access (`/hms/team`)
Add a member of staff, change a role, suspend access, reset a password, and read
the access history. The last active administrator can never be suspended or
demoted, and suspending a person ends their open sessions immediately.

### Settings (`/hms/settings`)
Hospital identity (rename, re-address, change the licence number, change the
logo mark), clinical rules, fees, monitor behaviour, department switches, ten
interface themes and the default prescription paper. Every section carries its
own short guide, and `/hms/guide` holds the full ten-chapter playbook.

### Licensing (`/hms/activate`)
A 14-day trial starts with the first sign-in. Serial numbers look like
`AYBK-XXXX-XXXX-XXXX-CCCC`, where the last group is a SHA-256 checksum — so a
mistyped or invented serial is rejected instantly, offline. See
`docs/LICENSING.md`.

---

## 5. Daily routine

| Time | Who | Action |
|------|-----|--------|
| 07:45 | Reception | Register walk-ins, check today's queue in OPD |
| 08:00 | Ward nurse | Open the bed board, confirm cleaning is finished, start the round list |
| 08:00 | Laboratory | Collect samples, enter results, verify |
| 08:30 | Physician | Work the OPD queue; sign prescriptions as you go |
| 12:00 | Pharmacy | Clear the dispensing queue, receive deliveries, check expiry |
| 16:00 | Radiology | Report every accepted study |
| 18:00 | Owner | Check the health monitor, acknowledge or repair alarms |
| 19:00 | Owner | Run `07-backup.ps1` |

---

## 6. Where the data lives

```
data\slotly.db            ← the whole hospital (SQLite, WAL mode)
data\slotly.db-wal        ← write-ahead log (must be copied with the .db)
backups\<timestamp>\      ← 07-backup.ps1 writes here
logs\                     ← optional server logs
public\uploads\           ← logos and patient documents
```

Copying `slotly.db` while the server runs is safe (SQLite handles it), but the
supported way is `07-backup.ps1`, which copies the WAL files too.

---

## 7. Support checklist

If something looks wrong, run:

```powershell
.\aybek-hms\scripts\install\10-doctor.ps1
```

It prints fourteen lines, each with the fix. With `-Fix` it reinstalls packages,
rebuilds an unreadable database and rebuilds the production bundle where that is
safe. Anything it cannot fix is described in `docs/TROUBLESHOOTING.md`.

---

*Aybek Ten-Bed Specialy Surgical Hospital · every action is audited · all data
stays on this computer.*
