# Enterprise development foundation — 0.5.0-dev.1 / phase 1

PostgreSQL is now an **optional** backend for the existing FastAPI application; SQLite/offline remains supported. Start with [the phase-1 Persian/Dari guide](docs/ENTERPRISE_PHASE1_FA.md). See [executed verification and untested limits](docs/ENTERPRISE_PHASE1_VERIFICATION.md).

- Explicit URL/secret-file configuration, no silent fallback or startup schema creation.
- Atomic import from a stopped schema-2 SQLite snapshot into an **empty dedicated PostgreSQL database**, with row counts/hashes, preserved IDs/snapshots, revoked sessions and reset sequences. No merge, source edits or automatic cutover.
- Protected same-major `pg_dump`/`pg_restore` operational tools; the UI SQLite-download endpoint explicitly refuses PostgreSQL instead of exporting a fake SQLite file.
- Non-root/read-only app Compose service, private DB network, separate bootstrap/owner/runtime roles, generated local secrets, explicit initialization.
- Liveness `/healthz`, readiness `/readyz`, admin-only `/api/ops/status` and `/api/ops/metrics`, PHI-free structured **HTTP** logs and request IDs. Metrics/scheduling remain single-process development infrastructure.
- CI definitions cover SQLite, frontend, PostgreSQL and Compose build/init/readiness/backup/restore. GitHub CI and actual Docker execution have **not** been run here; local live PostgreSQL tests have.
- FHIR R4, SMART/OIDC, Kubernetes, multi-tenancy, pgvector/RAG and validated AI/CDS are **not implemented** by this phase. This is not production/clinical certification.

This phase is in source and `releases/v0.5.0-dev.1/`; earlier release ZIPs remain historical and unchanged. The new ZIP includes the existing SQLite/offline installer and enterprise source, NOT offline Docker images or PostgreSQL driver wheels. Docker initial builds need internet; existing offline SQLite deployment does not acquire a PostgreSQL dependency.

---

# Tailwind dashboard update — 0.4.1

The main dashboard and five departmental guide/card views now use **Tailwind CSS 4.3.3**, pinned with its CLI. Read [the Tailwind guide](docs/TAILWIND_FA.md).

- Prebuilt `frontend/tailwind.css` is shipped locally: no CDN, Node.js or npm needed at hospital runtime.
- `tw:` prefix; no Preflight reset. Existing forms, app shell and A4 CSS remain intentionally intact (incremental migration).
- Developer build: `npm ci --ignore-scripts`, `npm run build:css`, `npm run check:css`, `npm run check`, `npm test`.
- CSS input and dashboard source are included in the allowlisted ZIP. Do not edit the generated CSS directly.
- Tailwind requires a modern browser; tested with Chromium 141. Native Windows/printer and production/clinical validation remain outstanding.
- Historical Tailwind-only ZIP: `releases/v0.4.1/`; prior 0.4.0 ZIP remains unchanged.
- Verified: 82 Python tests, 26 DOM tests, real computed responsive/dark-theme styles, no external requests, full workflow and all 200 short A4 PDFs.

---

# Historical delivery: ASH Nexus 0.4 — unified professional package

**Facility:** Aybek Ten-Bed Specialy Surgical Hospital / شفاخانه ده بستر جراحی ایبک.

Start with **[the offline Persian/Dari guide](docs/UPGRADE_V04_FA.html)** (or [Markdown](docs/UPGRADE_V04_FA.md)).
The [review report](docs/REVIEW_V04_FA.md) separates completed changes from missing production/clinical modules.
The new single ZIP is in `releases/v0.4.0/`; older releases below are historical, not this source build.

- Five permission-filtered departmental dashboards and guided three-step workflows.
- Explicit physician-owner administrator, ten editable structural print families, all 200 existing design IDs, immutable confirmed snapshots, ten personal workspace palettes.
- Isolated, exclusively-created demo database; no default password or real patient records in the package.
- Bounded integrity/backup/disk checks every 30 minutes, opt-in audio, manual 48-hour escalation; **no autonomous code or medical-record repair**.
- Ten numbered scripts in `powershell/`, plus shared module. Existing legacy helpers are preserved.
- One installer defaults to offline wheels; `02-Install-Hospital.ps1 -Online` explicitly selects network dependency downloads. Application capabilities and sample-data generation are identical.
- Requires **preinstalled Windows CPython 3.11 x64**. No Python installer, standalone EXE, cloud hosting, automatic synchronization, recorded tutorial or issuer private key is bundled.
- Native Windows/PowerShell/physical printers remain untested here. This remains an unvalidated clinical foundation, not an autonomous physician, diagnosis/dosing engine or production-certified HMS.

Latest evidence and reproduction: [VERIFICATION_V04.md](docs/VERIFICATION_V04.md).

---

## Historical foundation and 0.3 documentation

# ASH Nexus HMS — Aibak Hospital

پایهٔ واقعی سیستم مدیریت **شفاخانه ده بستر جراحی ایبک**، نسخهٔ ۰.۳.

A local-first, Dari/RTL hospital foundation with a FastAPI API, SQLite persistence,
role-scoped workflows, a dependency-free browser UI and 200 structured A4 print configurations.
**Not clinically validated or approved for production patient records.**

## Separate setup packages

The new setup release provides **separate online and offline ZIPs**, each started
by double-clicking `Setup.cmd`. A loopback-only browser wizard guides location,
hospital profile, administrator creation, activation and launch. **These are not
standalone compiled EXE installers: Windows x64 CPython 3.11 x64 must already exist.**
Online means dependency download, not cloud hosting.

- [راهنمای نصب‌کننده‌ها و فعال‌سازی](docs/INSTALLERS_FA.md)
- **Current 0.3 ZIPs/checksums: `releases/v0.3.0/`.** Root `releases/` ZIPs are the previous installer edition.
- [امکانات تازه و ارتقای امن دیتابیس](docs/WORKSPACE_V03_FA.md). Schema 1 must be upgraded to a NEW file; never just change its version setting.
- Optional Ed25519 signed activation requires an issuer-owned public key; the
  ordinary bundles use local initialization, not a fake commercial serial.

## Start here

- [راهنمای کامل فارسی: نصب، استفاده، چاپ، بکاپ و محدودیت‌ها](docs/SETUP_FA.md)
- [ممیزی تاریخی کد ارسالی و خطاهای بازتولیدشده](docs/TECHNICAL_AUDIT_FA.md)

The previously described application was absent at the start of the audit. This
implementation was built here from scratch; it is not an export of that environment.
The historical audit remains as evidence, not as a description of today's file tree.

## Run locally

Python 3.11+ (the prepared offline bundle targets Windows x64 / CPython 3.11):

```bash
python -m venv .venv
# Windows: use .venv/Scripts/python.exe in place of .venv/bin/python
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m scripts.manage init
.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

Open `http://127.0.0.1:8000`. Initialization prompts privately for a unique
administrator password. No default passwords or sample patient records are shipped. Windows scripts are in `scripts/`; offline installation uses the bundled
`wheelhouse` and `Install-Windows.ps1 -Offline`. Node is not needed to run the product.

## Implemented scope

- Hash-based password storage, revocable server sessions, CSRF and six roles.
- Persistent patient records, unique MRNs, explicit allergies/history and search.
- Doctor-owned draft/edit/confirm prescription workflow with optimistic revisions.
- Archived patient/hospital information on confirmation and shared print renderer.
- 200 structural layout configurations in 10 collections; search, favorites, pagination and shared A4 renderer.
- Half-hour Kabul-time appointments, check-in, controlled completion and collision protection.
- Doctor-entered SOAP/vitals, attributable append-only amendments and a bounded patient timeline.
- Per-user tasks, four screen themes, density/font settings, command palette and real seven-day counts.
- Basic stock management with atomic non-negative withdrawals.
- Doctor-requested laboratory/radiology orders and department-restricted results.
- Ten-bed allocation, single active admission per patient and doctor discharge.
- Audit events, consistent database snapshots and validated restore to a new path.
- 160 explicit symptom vocabulary entries, labeled fuzzy suggestions, local inventory autocomplete and incomplete safety reminders.
- Explicit additive schema 1→2 upgrade into a new file; source is preserved and sessions are revoked.

**Not implemented:** validated clinical AI/RAG, automatic diagnosis/dosing, comprehensive
drug interactions, surgery/anesthesia, billing, expiry/batch tracking, attachments,
FHIR, legal digital signatures, automatic backups, or a standalone Python installer.
No mandatory serum/injection or hidden drug-name correction is performed.

## Architecture

```text
backend/app/
  database.py       # independent connection/session factory, FK enforcement
  models.py         # single model module, correct Doctor/Prescription relationships
  security.py       # scrypt, sessions, CSRF, role dependencies, audit helper
  schemas.py        # bounded request validation
  routers/          # auth/users, clinical workflows, settings/backup/limited support
  templates.py      # 200 shared layout configurations
  knowledge.py      # explicitly incomplete vocabulary/rules, no treatment engine
  backups.py        # SQLite backup API and new-file-only restore
  main.py           # app factory, lifespan schema check, same-origin static UI
frontend/           # local HTML/CSS/JS; no external asset dependency
scripts/            # interactive setup, backup/restore and offline packaging
```

Runtime settings: `ASH_DB_PATH` (default `.data/ash.sqlite3`),
`ASH_SECURE_COOKIE=1` behind HTTPS, and optional `ASH_FRAME_ANCESTORS` for explicitly
trusted embedding origins. No `.env` loader is assumed. Do not expose a development
server directly to the internet or record query strings containing patient searches.
The bundled UI uses relative `/api` URLs; it never calls the user's localhost from a
hosted preview.

## Verification

```bash
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest tests/integration tests/audit tests/setup -q
npm ci
npm test
npm run check
```

Current verification: **75 Python checks** (54 application/workspace, 7 historical
isolated audit checks, 14 installer/signature) and **20 DOM checks** (15 app, 5 wizard).
A real Chromium workflow covered patient/Rx persistence, SOAP/vitals, appointment
check-in/completion, private tasks, fuzzy vocabulary, theme persistence, command
palette and desktop/mobile navigation with no page errors. All **200** short test
PDFs were one-page A4; the long synthetic document retained its final item across
six pages. Additive upgrade/source preservation/failure cleanup and schema-2 backup
restore are tested. These are not Windows execution, physical-print, independent
security or clinical validation. One upstream AnyIO deprecation warning remains.
See [verification details](docs/VERIFICATION.md).

A generated offline package intentionally excludes `.data`, backups, `.env`, passwords,
virtual environments and patient records. See the Persian guide for installation,
secure handling, restore drills and the release gate before any real clinical use.
