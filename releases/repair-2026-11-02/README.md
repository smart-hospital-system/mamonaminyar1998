# Repaired development source — 2026-11-02

**این ZIP فقط سورس اصلاح‌شدهٔ پروژه است؛ نصب‌کنندهٔ کامل آفلاین یا محصول تأییدشدهٔ طبی نیست.**

- Archive: `Aybek-Hospital-Repaired-Source-2026-11-02.zip`
- Size: **16,979,707 bytes**
- SHA-256: `af962a7dae5416df18bd3eafe34012ab52e695507749c0641ad0d7912e0882ab`
- Source commit: `59b5fd9` (full ID recorded in `SOURCE-MANIFEST.json` inside the ZIP)
- Contents: **465 committed source files**, plus the source manifest and bundle notes.

## Included / excluded

Both independent applications are included: Next.js (3000) and ASH/FastAPI (8000), with separate database/auth/deployment paths. Source includes the explicit tracked synthetic Next demo DB and unvalidated legacy teaching catalogues; automatic age-band drug examples are disabled. Demo passwords are published and must be changed before any real use.

Live databases, private `.env` files, uploads, `.git`, historical ZIPs, Node/Python runtimes, `node_modules`, virtual environments and offline dependency caches are **not** included. Initial dependency installation requires network access or a separately verified compatible offline cache. No installation on the user's computer or cloud deployment was performed.

## Verification

- Archive CRC and every source-manifest SHA-256 verified.
- Source extracted to an isolated check folder; first-install helper and read-only verifier succeeded with a NEW synthetic DB.
- All **52 Next regression tests** passed from the extracted source using the already installed dependency tree. This was not a fresh Windows install or offline dependency-install test.
- Main checkout: **52 Next + 92 Python + 26 frontend = 170 passing tests**; 7 environment-dependent Python skips.
- Production Next build/start and HTTP checks on both synthetic applications passed.
- npm audit reported 0 vulnerabilities at the audit time.
- All seven previous release ZIPs retained their published SHA-256 checksums and passed CRC checks.

## Start here after extraction

Read these files before running anything:

1. `docs/REPAIR_AUDIT_2026-11-02_FA.md` — detailed Dari repair report and unresolved blockers.
2. `docs/APPLICATION_COEXISTENCE.md` — choose the application and use the matching commands.
3. `README.md` — Next.js instructions; Node 22.13+ is required.
4. `docs/SETUP_FA.md` — ASH Python installation instructions.

**Known blockers:** full historical print snapshots in Next.js remain incomplete; native Windows/PowerShell, physical A4 printer and independent clinical validation have not been performed. Browser-driven audio/monitoring is not a closed-browser service. The old unsafe whole-folder USB exporter is disabled. These limits are not removed by passing tests.

This bundle does not replace or silently update any historical installer. Keep the checksum file alongside it. Checksums detect changes; they do not establish publisher authenticity or clinical correctness.
