> **Two independent applications are preserved in this repository.** The existing Next.js application runs on port 3000; the ASH FastAPI application runs on port 8000. They have separate databases, authentication, and deployment paths; they are not integrated or synchronized. See [coexistence and command guide](docs/APPLICATION_COEXISTENCE.md). Neither application is clinically certified by this merge.

# Aybek Ten-Bed Specialy Surgical Hospital

**شفاخانه ده بستر جراحی ایبک** — a complete, bilingual (English / دری) hospital information
system that runs on one ordinary computer, with no internet connection required.

Owner: **Dr. Mamon Aminyar** · Built with **Next.js 15 (App Router) · React 19 · TypeScript ·
Tailwind CSS v4 · SQLite (`node:sqlite`)**

Twenty-one screens cover the whole hospital: OPD consultations and prescriptions, pharmacy
dispensing and stock, laboratory and radiology workflows, ten beds and theatre, billing and
receipts, staff and roles, licences and serials, a health monitor that scans every 30 minutes,
an audit trail, ten prescription papers and twelve interface themes.

Around that sit four things that make it usable in a real ten-bed hospital:

- **Ask Aybek** — ask a question in English or Dari ("how much came in today?", "what is low on
  stock?") and get an answer computed from this hospital's own records. Deterministic, offline.
- **Clinical toolkit** — NEWS2 early warning, qSOFA sepsis screen, 24-rule interaction library,
  paediatric weight dosing, renal dose bands, laboratory reference ranges, BMI/BSA/IBW/CrCl.
- **Universal search (⌘K)** — patients, prescriptions, invoices, medicines, orders and staff.
- **Start here** — eight guided steps from an empty screen to a working hospital, in-app.

Everything is bilingual: the interface, the printed prescription a patient carries home, and the
documentation. Dari renders right-to-left throughout.

---

## Quick start

```bash
git clone https://github.com/smart-hospital-system/mamonaminyar1998.git aybek-hospital
cd aybek-hospital
npm install
npm run deploy
```

`npm run deploy` checks the Node version, installs the demonstration hospital if no database
exists yet, builds the app when the build is missing, and serves it on `0.0.0.0:3000` so a ward
phone or tablet can reach it.

Open <http://localhost:3000/hms/login> and sign in with `doctor@aybek.hospital` / `mamonaminyar`,
then open **Start here** in the sidebar and change the code before real patients are entered.

| Command | What it does |
|---|---|
| `npm run deploy` | one-shot: check Node, seed if empty, build if needed, serve on port 3000 |
| `npm run dev` | development server with hot reload |
| `npm run build` / `npm start` | production build, then serve an existing build |
| `PORT=3100 npm run deploy` | the same, on another port |
| `npm run hms:verify` | health report across all 19 hospital tables |
| `npm run hms:reset` | drop and rebuild the demonstration hospital (destructive) |
| `npm run hms:demo-db` | refresh `data/demo-hospital.db`, the copy that ships on the disc |

**On Windows, without a terminal:** copy the disc (or the zip) and double-click `START-HERE.bat`.
The step-by-step Persian guide is `aybek-hms/docs/شروع-از-صفر.md` (English: `DOCS/START-FROM-ZERO-FA.md`
on the disc, `USER-GUIDE.md` for the English user guide).

### Demonstration accounts

Password for every account below: `mamonaminyar`. Change them in **Team** before going live.

| Role | Email |
|---|---|
| Medical Director (owner, everything) | `doctor@aybek.hospital` |
| Surgeon | `arash@aybek.hospital` |
| Physician | `evelyn@aybek.hospital` |
| Physician | `yusuf@aybek.hospital` |
| Pharmacist | `pharmacy@aybek.hospital` |
| Laboratory | `lab@aybek.hospital` |
| Nurse (ward) | `nurse@aybek.hospital` |
| Nurse | `laila@aybek.hospital` |
| Reception | `reception@aybek.hospital` |

Try it without any risk: **Settings → Data & backup** can rebuild the demo hospital at any time
(type `RESET`), and downloads a full JSON backup before you do.

### Delivered media

| File | Size | For |
|---|---|---|
| `Aybek-Hospital-HMS-v7.iso` | 35 MB | burn to CD/DVD |
| `Aybek-Hospital-HMS-v7.iso.sha256` | 92 B | verify the burn |
| `Aybek-Hospital-HMS-v7.zip` | 32 MB | USB stick |
| `Aybek-DISC-v7/` | 34 MB | same content, no burning |

---

## The original booking demo (still in this repository)

The repository began life as **Slotly**, a booking platform for small service businesses. That
half is still here and still builds — `/book` for customers, `/dashboard` for the front desk —
sharing the same SQLite file but with its own tables and its own seed (`npm run seed`,
owner `mamon.aminyar650432@gmail.com` / `mamonaminyar`). The hospital lives under `/hms` and is
seeded independently (`npm run hms:verify`). You can ignore the booking half entirely; nothing in
the hospital depends on it.

The sections below document that original platform.

---

## Appendix — Slotly feature reference

### Authentication & security
- Email + password sign-in with **bcrypt** hashed passwords
- "Continue with Google" (demo-mode account link) and per-role demo sign-in
- **httpOnly, SameSite session cookies** — sessions stored hashed (SHA-256) in SQLite with expiry
- **Role-based access control** across three roles: Owner, Manager, Staff
- Server-side page guards and per-endpoint permission checks (`requireUser([...roles])`)
- Security headers via middleware, full **audit trail** of every mutation

### Booking management
- Day / week / agenda **calendar** with a live resource timeline per specialist
- Real-time availability engine: staff schedules, service duration + buffer, approved time off,
  existing bookings and configurable slot intervals
- Create, edit, reschedule, cancel, complete, no-show and duplicate bookings
- **Recurring bookings** (weekly / fortnightly / monthly) with conflict checking across every
  occurrence before anything is written
- **Approval workflow** — pending requests can be confirmed or declined in one click
- **Waitlist management** with "offer slot" notifications and conversion into a booking
- Conflict detection with 409 responses and human-readable errors

### Customers
- Profiles with contact details, birthday, tags, VIP flag and marketing opt-in
- Full booking history, payment history, lifetime spend, visit count, average ticket
- Preferences and internal notes, loyalty points accrued automatically (1 point per S$10)
- Search, filtering (VIP / Loyal / New / At-risk) and sorting
- At-risk detection based on last visit date

### Staff
- Profiles with specialties, bio, pay rate, ratings and performance stats
- Weekly schedule editor (per-day working hours) feeding straight into availability
- **Time-off requests** with approve / decline workflow
- Service assignment per staff member
- Revenue leaderboard, utilisation, review averages and today's load

### Services & pricing
- Catalog grouped by category with duration, price, deposit, buffer and calendar colour
- **Add-ons / extras** with their own price and duration (upsell at booking time)
- Publish / hide, mark as popular, per-service staff assignment
- Safe delete (services with upcoming bookings are archived to protect history)

### Payments
- Record payments (card, PayNow, cash, Apple Pay) with tips and 9% GST breakdown
- Auto-generated invoices, transaction history and CSV export
- **Refund management** with partial refunds and automatic booking payment status updates
- Revenue totals: gross, refunded, net, tips, average transaction
- Completed bookings update customer lifetime value and loyalty points

### Dashboard & analytics
- Revenue, bookings, new customers, utilisation, average ticket, rating and no-show KPIs with
  period-over-period deltas
- Revenue / booking trends, monthly revenue, category mix, status split
- **Demand heatmap** (weekday × hour), staff and service performance tables
- Customer growth (new vs active), cancellation and no-show rates, outstanding balances
- CSV report export

### Notifications & marketing
- In-app notification inbox with read state, plus channel preferences
- Email/SMS reminders, confirmations, cancellation and staff alerts (settings-driven)
- **Campaigns** (email or SMS) with audience targeting, scheduling and open/click reporting
- **Coupons and promo codes** with usage limits, minimum spend and expiry
- **Referral programme** with unique codes and reward tracking

### AI features (Premium)
- **AI scheduling assistant** — plain-language chat that answers from live data: availability
  ("when is Ava free for a balayage on Saturday?"), today's agenda, revenue, top services, staff
  performance, lapsed clients. Replies render as rich blocks (slot pickers, metrics, bars).
- **Demand forecasting** — seasonal-naive model over 12 weeks of history, 14-day projection with
  capacity %, staffing suggestions and low/high-demand recommendations
- **Smart staff assignment** — scores every eligible specialist on availability, rating, current
  load and shift fit, with an explainable rationale
- **Automated follow-ups** — generated win-back, review-request and reminder messages per client
- **Business insights** — ranked opportunities (quiet days, upsell bundles, no-shows, lapsed
  clients, capacity) with impact estimates and one-click actions
- **No-show risk scoring** for upcoming appointments

### UX
- Sidebar navigation with role filtering, badges and collapse
- **Command palette** (⌘K / Ctrl-K) searching pages, customers and bookings
- **Dark / light mode** with no flash on load (theme script + CSS variables)
- Mobile-first responsive layouts: drawer nav, card lists on small screens, scrollable timelines
- **Empty states** everywhere, **skeleton loading states** (route-level + inline), optimistic
  updates with rollback on failure, toast notifications
- Public booking page (`/book`) for clients — service picker → live slots → details → confirmation

### v7 — intelligence layer
- **Ask Aybek** (`/hms/ask`, `GET /api/hms/ask`): deterministic natural-language analytics over
  the hospital's own records, bilingual, offline, 14 intents with tables and follow-up questions
- **Clinical toolkit** (`/hms/intelligence`): NEWS2 early warning, qSOFA sepsis screen, 24-rule
  interaction library with alternatives, paediatric weight dosing, renal dose bands, 15 laboratory
  reference ranges with critical flags, BMI/BSA/IBW/Cockcroft–Gault
- **Universal search** (`GET /api/hms/search`): patients, prescriptions, invoices, medicines,
  lab/imaging orders, staff — powering a keyboard-driven ⌘K palette with recents and quick actions
- **Unified patient timeline** + safety strip on every chart; **audit trail** viewer with CSV export
- **Bilingual printed prescriptions** (labels and RTL), two new premium themes (Obsidian Gold,
  Ivory Atelier), toast notifications, and a refined design layer (hairline borders, elevation,
  tabular numerals, staggered motion)

### Data & system
- Persistent **SQLite** database (`node:sqlite`, WAL journaling) with 19 tables
- Deterministic seed: 6 staff, 14 services, 62 customers, ~2,300 bookings, ~1,500 payments,
  ~900 reviews, coupons, campaigns, referrals, waitlist, time-off, notifications and audit logs
- Full CRUD API for every resource, validated and permission-checked
- JSON **backup download** (Settings → Data & backup, `GET /api/hms/backup`) and a guarded demo reset (`POST /api/hms/backup`, needs the word `RESET`)
- Every mutation writes to `activity_logs` with actor, entity and timestamp

---

## Architecture

```
app/
  (app)/dashboard/…        protected workspace (server components + client islands)
  api/…                    REST endpoints (route handlers)
  login/                   auth screen
  book/                    public booking page
components/
  ui/                      design system primitives, modal, toast, skeletons
  dashboard/               feature clients (bookings, calendar, staff, payments, AI…)
  shell/                   sidebar, topbar, command palette, app shell
  charts.tsx               recharts wrappers
lib/
  db.ts                    SQLite connection, schema, migrations-on-boot, seeding
  seed.ts                  deterministic demo data generator
  auth.ts                  sessions, bcrypt, RBAC helpers, activity logging
  bookings.ts              availability engine, conflict detection, recurring creation
  analytics.ts             KPI, trend, heatmap and forecast queries
  ai.ts                    assistant, insights, follow-ups, no-show risk, forecasts
  queries.ts               shared read models
  utils.ts                 money / date formatting in Asia/Singapore timezone
```

**Rendering strategy:** pages are server components that compute their initial data directly from
SQLite (instant first paint, no loading flash). Interactive islands hydrate on top with SWR for
revalidation and optimistic mutations; route-level `loading.tsx` files provide skeletons during
navigation.

**Timezone:** all business logic and formatting is pinned to `Asia/Singapore` (`+08:00`), regardless
of where the server runs.

---

## API surface (selected)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | credentials or Google (demo) sign-in |
| `POST` | `/api/auth/demo` | one-click role sign-in |
| `GET/POST` | `/api/bookings` | list with filters / create (supports recurring) |
| `PATCH/DELETE` | `/api/bookings/:id` | edit, status transitions, delete |
| `GET` | `/api/availability` | computed slots for a service and date |
| `GET/POST` | `/api/customers` | search, list, create |
| `GET/PATCH/DELETE` | `/api/customers/:id` | profile with history |
| `GET/POST` | `/api/services`, `/api/staff`, `/api/coupons`, `/api/campaigns`, `/api/waitlist` | CRUD |
| `PUT` | `/api/staff/:id/schedule` | weekly working hours |
| `GET/POST` | `/api/payments` | transactions and manual payments |
| `PATCH` | `/api/payments/:id` | refunds |
| `POST` | `/api/ai/assistant` | natural-language assistant |
| `POST` | `/api/ai/assignment` | smart staff matching |
| `GET` | `/api/ai/forecast` · `/api/ai/insights` · `/api/ai/followups` | premium intelligence |
| `GET/POST` | `/api/public/booking` | public availability + booking creation |
| `GET` | `/api/demo/backup` | JSON export of every table |
| `GET` | `/api/hms/backup` | Admin-only JSON backup of all 19 hospital tables + settings + licence |
| `POST` | `/api/hms/backup` | `{ action: "reset-demo", confirm: "RESET" }` rebuilds the demo hospital |

---

## No cloud dependency

The hospital is an on-premise application: it keeps its records in a local SQLite file
(`node:sqlite`), writes backups to disk, prints on the local network and must keep working with no
internet connection. **It needs no Cloudflare account, no Worker, no tunnel and no network at all at
runtime.** The install path — `npm install` → `npm run deploy` — touches nothing outside the hospital
computer.

An earlier pull request removed the status Worker this repository used to carry, and a later revert
put it back by accident. It is deleted again here, together with its Wrangler configuration and its
two `npm run worker:*` scripts, so no cloud build can attach itself to this repository.

| Question | Answer |
| --- | --- |
| Does the app read any cloud credential? | No. No `CLOUDFLARE_*`, `WRANGLER_*` or `CF_*` variable is read in `app/`, `lib/` or `scripts/`; the only match in the tree is the token *detector* in `scripts/check-secrets.mjs`. |
| Is a Cloudflare account needed to install or run? | No. |
| Does anything in CI call wrangler? | No — `.github/workflows/verify.yml` runs install, secret scan, `tsc`, build and `hms:verify`. |
| How do I reach the hospital from another room? | `npm run deploy` binds `0.0.0.0:3000`; use the computer's LAN address. |

---

## Where credentials belong

A token pasted into a chat, a screenshot or a commit is a spent token. The hospital needs **no cloud
credentials at all**, so there is exactly one rule: **nothing secret is ever written into this
repository**. Use the destination that matches what you are doing:

| You are… | Put the token here | Never here |
| --- | --- | --- |
| Running the hospital locally | nowhere — the app needs no token | `.env`, source files |
| Any cloud service you add later, on purpose | that provider's own secret store, or `.env.local` (git-ignored) | a tracked file, `package.json` |
| Scripting a one-off deploy | an environment variable on that machine (`setx` / `export`), or a password-manager entry | git history |

Guard rail: `npm run check:secrets` scans every tracked file and fails on Cloudflare/GitHub/AWS/
Stripe tokens, private-key blocks and long values assigned to `*_KEY` / `*_SECRET` /
`*_TOKEN` names. It is fast and dependency-free — run it before pushing:

```bash
npm run check:secrets     # → check:secrets — clean. Scanned 310 path(s)…
```

If a token is ever exposed (chat, screenshot, commit): **revoke it first**, then issue a new one. A
commit is not private just because the repository is — and history keeps what you delete later.

**Serial licences:** `lib/hms/license.ts` signs licence keys with `AYBEK_LICENSE_SECRET`, falling
back to a constant in that file, so licences work out of the box on a fresh clone. That fallback is
public by design (it is in the source); on a real commercial deployment set `AYBEK_LICENSE_SECRET`
in the hospital's own `.env.local` before issuing serials, and keep that value backed up — rotating
it invalidates every licence signed with the old one.

---

## Notes

- Prices are in SGD and GST defaults to 9% (configurable in Settings → Payments).
- Google sign-in is intentionally simulated for this demo build so the workspace can be explored
  without OAuth credentials; the session handling is the same as a real provider flow.
- The workspace reseeds itself only when the database is empty, so your changes persist across
  restarts. Use Settings → Data & backup → Rebuild demo data (type `RESET`) to start fresh.

## Bilingual by design — English / دری

The interface is fully bilingual. The `EN / دری` control sits in the header of every screen and on
the login form: choosing Dari mirrors the whole layout right-to-left, switches every label to Dari,
uses Persian digits and the Solar Hijri calendar. The choice is stored per browser (`aybek_lang`
cookie), so two people can work side by side in different languages on the same server. The
hospital-wide default is **Settings → Hospital identity → Default language for new sessions**
(`en` or `fa`). The prescription sheet a patient carries home is bilingual too: in Dari it prints
right-to-left with Dari labels, while medicine and doctor names stay exactly as entered.

Implementation: `lib/hms/i18n.ts` (dictionary + `t()` / `tx()` + `statusText()`),
`lib/hms/lang-server.ts` (cookie → settings → English), `components/hms/lang-provider.tsx`
(client context: `useTr()`, `useTx()`, `useLang()`), `components/hms/lang-switch.tsx`
(the two switchers), `lib/hms/format.ts` (language-aware money, dates, times, ages).

---

# ASH FastAPI application (separate deployment, port 8000)

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
