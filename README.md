# Slotly — AI-powered booking & business management

A full-stack booking platform for small service businesses — salons, clinics, gyms, tutors,
photographers, repair shops and home-service teams. Take reservations online, run the front desk,
manage staff and schedules, collect payments, market to clients, and let an AI copilot fill the
gaps in the calendar.

Built with **Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · SQLite**.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

The database is created and seeded automatically on first boot (`data/slotly.db`).

### Demo credentials

| Role | Email | Password |
| --- | --- | --- |
| **Owner** | `mamon.aminyar650432@gmail.com` | `mamonaminyar` |
| Manager | `priya@lumierestudio.sg` | `slotly123` |
| Staff | `ava@lumierestudio.sg` | `slotly123` |

The sign-in screen is pre-filled with the owner account, and has one-click **Owner / Manager /
Staff** demo buttons plus a "Continue with Google" button that signs in the demo owner account.
Roles are enforced on the server (route handlers + page guards), not just in the UI.

Useful scripts:

```bash
npm run seed         # wipe + reseed six months of demo activity
npm run db:reset     # delete the SQLite file, then seed
npm run build        # production build
npm start            # run the production server
```

Optional: set `SLOTLY_DB_PATH` to store the database somewhere else (see `.env.example`).

---

## What's inside

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

## Notes

- Prices are in SGD and GST defaults to 9% (configurable in Settings → Payments).
- Google sign-in is intentionally simulated for this demo build so the workspace can be explored
  without OAuth credentials; the session handling is the same as a real provider flow.
- The workspace reseeds itself only when the database is empty, so your changes persist across
  restarts. Use Settings → Data → Reset demo to start fresh.

## Bilingual by design — English / دری

The interface is fully bilingual. The `EN / دری` control sits in the header of every screen and on
the login form: choosing Dari mirrors the whole layout right-to-left, switches every label to Dari,
uses Persian digits and the Solar Hijri calendar. The choice is stored per browser (`aybek_lang`
cookie), so two people can work side by side in different languages on the same server. The
hospital-wide default is **Settings → Hospital identity → Default language for new sessions**
(`en` or `fa`). Printed papers stay in English with the local hospital name so they can be read
anywhere.

Implementation: `lib/hms/i18n.ts` (dictionary + `t()` / `tx()` + `statusText()`),
`lib/hms/lang-server.ts` (cookie → settings → English), `components/hms/lang-provider.tsx`
(client context: `useTr()`, `useTx()`, `useLang()`), `components/hms/lang-switch.tsx`
(the two switchers), `lib/hms/format.ts` (language-aware money, dates, times, ages).
