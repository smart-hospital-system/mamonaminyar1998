# Preserving the two hospital applications

PR #5 originally introduced the FastAPI application against the initial repository. In the meantime main acquired a separate Next.js application with independent history. This conflict resolution preserves both codebases; it does not replace either or introduce interoperability.

## Next.js application (existing main)

- Existing `app/`, `components/`, `lib/`, `public/`, `data/`, `aybek-hms/`, TypeScript configuration, deployment scripts and workflow remain present.
- Root package name, version, dependencies and existing scripts are retained. `npm run build` still builds **Next.js**, not ASH CSS.
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
