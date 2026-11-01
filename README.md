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

This repository used to carry a small status Worker (`wrangler.jsonc` + `workers/status.mjs`) so that a
linked Workers Builds project could not fall back to Wrangler's *automatic project configuration*
(detect Next.js → scaffold an OpenNext adapter inside the build container → fail in the first second
of every push). That pipeline is disconnected and those files are now deleted: the repository has no
`wrangler` file, no `main` entry point for an edge runtime and no `worker:*` scripts, so no cloud
build can attach itself to it again.

If you ever want the hospital reachable over the network, do not use an edge service — use the server
that is already there. `npm run deploy` binds `0.0.0.0:3000` and serves every page to the hospital LAN;
put it behind a reverse proxy on the same machine if you need TLS. Patient data never leaves the
computer, which is the whole point of the offline guarantee.

| Question | Answer |
| --- | --- |
| Does the app read any cloud credential? | No. No `CLOUDFLARE_*`, `WRANGLER_*` or `CF_*` variable is read anywhere in `app/`, `lib/` or `scripts/`; the only match in the tree is the token *detector* in `scripts/check-secrets.mjs`. |
| Is a Cloudflare account needed to install or run? | No. |
| Does anything in CI call wrangler? | No — `.github/workflows/verify.yml` only runs install, secret scan, `tsc`, build and `hms:verify`. |

---

## Where credentials belong

A token pasted into a chat, a screenshot or a commit is a spent token. The hospital needs **no cloud
credentials at all**, so there is exactly one rule: **nothing secret is ever written into this
repository**. Use the destination that matches what you are doing:

| You are… | Put the token here | Never here |
| --- | --- | --- |
| Running the hospital locally | nowhere — the app needs no token | `.env`, source files |
| Any cloud service you add later, on purpose | that provider's own secret store, or `.env.local` (git-ignored) | a tracked file, `package.json` |
| Scripting a one-off task | an environment variable for that session only (`setx` / `export`), or a password-manager entry | git history |
| A token that has been pasted into a chat | nowhere — revoke it first, then issue a new one | reusing it anywhere |

Guard rail: `npm run check:secrets` scans every tracked file and fails on Cloudflare/GitHub/AWS/
Slack/Stripe tokens, private-key blocks and long values assigned to `*_KEY` / `*_SECRET` /
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
