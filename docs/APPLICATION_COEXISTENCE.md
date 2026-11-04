# Preserving the two hospital applications

PR #5 originally introduced the FastAPI application against the initial repository. In the meantime main acquired a separate Next.js application with independent history. This conflict resolution preserves both codebases; it does not replace either or introduce interoperability.

## Next.js application (existing main)

- Existing `app/`, `components/`, `lib/`, `public/`, `data/`, `aybek-hms/`, TypeScript configuration, deployment scripts and workflow remain present.
- Root package name/version and both applications' tooling are preserved. The 2026-11-02 repair updates the dependency lock and hardens existing commands. `npm run build` builds **Next.js**, not ASH CSS.
- Continue using the existing Next.js instructions above in the root README. Default port: **3000**.
- Its authentication, database files, clinical content and licensing are **not** imported into FastAPI. This merge does not validate its medical recommendations or authorize use of real records.

## ASH FastAPI application

- `backend/`, `frontend/`, `installer/`, `powershell/`, Python tooling and enterprise Compose are retained. Default port: **8000**.
- Follow `ENTERPRISE_PHASE1_FA.md` for PostgreSQL or the ASH installation documentation for SQLite. Initialization and database selection remain explicit. Do not point migration/import tools at Next.js database files.
- Root npm tooling adds the pinned Tailwind CLI and jsdom required by ASH without removing Next.js dependencies.
- `npm run build:css` (or `npm run ash:build`) builds ASH CSS only; `npm run check:css`, `npm run check`, and `npm test` are ASH checks. Runtime uses precompiled CSS; SQLite runtime does not require npm.
- `python -m pytest -q` tests ASH; PostgreSQL-dependent tests require an isolated, explicitly configured test cluster.
- `Dockerfile` and `compose.yaml` deploy **only ASH**, not Next.js. The frontend build stage installs the shared npm dependency lock and explicitly runs `build:css`, never the Next.js build.

## No shared clinical state

Do not share sessions, credentials, live database paths or backups between these applications. No automatic cutover, patient synchronization, cross-application login, database/schema conversion or merging is provided. A Next.js SQLite database is not an ASH schema-2 source. Deploy and validate each independently; neither Docker deployment nor this merge supplies clinical certification.

Both workflow files remain: `verify.yml` checks Next.js; `ci.yml` checks ASH (SQLite, frontend, PostgreSQL and Compose). New merge checks must be reviewed; prior successful checks on the pre-resolution PR are not evidence for this combined tree.

Historical ZIPs are immutable snapshots of ASH before this reconciliation. Their embedded npm configuration remains ASH-only; it differs intentionally from this combined development checkout. Existing ZIPs were not regenerated or relabelled.

## Repaired Next.js development checkout — 2026-11-02

This is not an installation on the user's Windows computer, and the historical ASH ZIPs do not contain these repairs. See [the Dari repair audit](REPAIR_AUDIT_2026-11-02_FA.md) for results and unresolved blockers.

### Fresh isolated evaluation

Requires Node **22.13+**. From the directory containing the root `package.json`:

```text
npm ci
```

Create `.env.local` (not committed) and choose a NEW synthetic path, for example:

```dotenv
SLOTLY_DB_PATH=.data/evaluation-next.db
NEXT_TELEMETRY_DISABLED=1
PORT=3000
```

Then:

```text
npm run deploy
```

The command initializes a synthetic demo only when the configured database is absent, rebuilds stale sources, and listens on `0.0.0.0` by default. It does not overwrite an existing DB. Default passwords are published demos: restrict network access and change credentials before entering records. For local-only access set `AYBEK_HOST=127.0.0.1`; network/preview access requires an appropriate bind address, firewall and secure transport.

Windows Next.js wizard: `aybek-hms\START-HERE.bat`. The helper finds the repository above its nested script location; an old installation on a guessed drive is not assumed. The Node database helper was tested, but native Windows/PowerShell execution was not available in this audit. Do not disable organization-wide execution policy to bypass an error.

### Explicit initialization, inspection and snapshots

```text
node scripts/init-next-demo.mjs
npm run hms:verify
node scripts/sqlite-maintenance.mjs backup --output backups/NEW-next-snapshot.db
node scripts/sqlite-maintenance.mjs restore --source backups/NEW-next-snapshot.db --output .data/NEW-next-restored.db
```

- Initializer preserves an existing file unopened; otherwise it creates only synthetic seed data.
- Verifier is read-only. It does not initialize missing databases or treat empty clinical tables as corruption. It is a structural check, not clinical certification.
- Backups use SQLite `VACUUM INTO` for a consistent copy including committed WAL writes, never separate live main/WAL/SHM copies. Existing outputs and sidecars are refused.
- Restore creates a NEW verified DB, invalidates sessions in that copy only, and never changes the active path. Independently verify it, stop all server instances, then explicitly select the new `SLOTLY_DB_PATH` before restart.
- Snapshots contain sensitive data. Encrypt/protect them. They do not include uploads or `.env.local` licence keys; preserve those securely and separately. Backups are not automatically pruned.
- Legacy Windows `05-build.ps1 -OfflineTarget` whole-folder export is disabled: it copied records, uploads and private secrets. The new repair source ZIP is not a replacement offline installer: runtimes and dependencies are not bundled. Runtime remains offline once dependencies are installed.
- The Windows `07-backup.ps1`/`08-restore.ps1` wrappers use the same tested Node snapshot helper. A native Windows scheduled-task/restore drill is still required.

Passwordless/reset demo APIs are OFF by default. `AYBEK_ENABLE_DEMO_ACTIONS=1` belongs only on a disposable synthetic instance; destructive CLI commands also require `--confirm-destroy`. Never use those tools on patient data. Google OAuth is not implemented; it does not grant a simulated owner session.

Unvalidated age-band drug examples are disabled by default. For isolated specialist teaching review only, the server flag is `AYBEK_ENABLE_TEACHING_REGIMENS=1`. Bulk teaching export additionally requires `--teaching-only --output-dir NEW_DIRECTORY`, refuses existing destinations and validates structure before writing. Neither a flag nor a passing rule screen authorizes patient treatment. Fixed drug counts, liquids, vials and injections are not universal requirements. Existing datasets were not regenerated.

## ASH evaluation is separate

The root Windows `Setup.cmd`, `Start-Hospital.cmd`, `powershell/` and Python `scripts/Install-Windows.ps1` belong to **ASH**, not Next.js. Use [SETUP_FA.md](SETUP_FA.md) or the enterprise guide for its full prerequisites. ASH does not inherit the Next demo password/accounts.

For a new isolated SQLite evaluation with an installed Python environment:

```text
python -m scripts.manage --db .data/evaluation-ash.sqlite3 init
```

This prompts for a new administrator password and refuses an already initialized database. Grant physician-owner duties only explicitly and to a qualified physician (`init --physician-owner`); ordinary administrators are not automatically prescribers. Set `ASH_DB_PATH` to that exact database before starting:

```text
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --no-access-log
```

For example, set `$env:ASH_DB_PATH='.data/evaluation-ash.sqlite3'` in PowerShell or `export ASH_DB_PATH=.data/evaluation-ash.sqlite3` in a Unix shell. Network binding does not supply HTTPS, firewall configuration or permission to expose a hospital publicly. Never select a Next SQLite file for ASH.

## Current verification commands

```text
npm run lint
npm run test:next
npm test
npm run check:css
npm audit
npm run check:secrets
python -m pytest -q
```

Python tests require `requirements-dev.txt` in an isolated environment. PostgreSQL tests require their own explicitly configured test server. The current local audit is not a new remote CI run, browser/physical-printer validation or production deployment. The detailed report distinguishes passing tests from skipped checks and records the unresolved Next historical-print snapshot limitation.
