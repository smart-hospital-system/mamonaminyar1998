# Verification record — workspace 0.3 / schema 2

Executed in the Linux sandbox on 2026-10-30 (Asia/Kabul). Synthetic test data only.
No claim of clinical validation, Windows-native execution or production readiness.

## Current completed checks

- `python -m pytest tests/integration tests/audit tests/setup -q`: **75 passed**.
  - 54 application/workspace checks (28 original + 26 added).
  - 7 historical isolated audit examples.
  - 14 installer/signature checks.
- `npm test`: **20 passed**, JSDOM + simulated API; 15 app, 5 wizard.
- JavaScript syntax, Python compile, pip dependency consistency and whitespace checks.
- Real Chromium 138.0.2 / Playwright Core 1.56.1 workflow passed, no `pageerror`:
  - admin patient registration; separate doctor account;
  - doctor-entered SOAP/vitals and patient timeline;
  - private task creation/completion;
  - half-hour Kabul appointment creation, check-in and assigned-doctor completion;
  - explicit fuzzy vocabulary result, command palette and persisted night theme;
  - empty prescription, manual synthetic item, draft save/edit/confirmation;
  - PDF generation from the stored document in **all 200** layouts;
  - 40-card paginated gallery; desktop and 390px mobile dashboard/menu; no page overflow.
- `tests/e2e/check_pdfs.py`: **200 short PDFs**, each **one page, A4**,
  synthetic clinical text retained; long 30-item stress document **6 pages**, final item retained.

The additions test independent preferences/favorites, CSRF, private-task isolation
and stale revisions, slot collisions including concurrent claims, terminal states,
assigned-doctor completion, physician-only notes, append-only amendments constrained
to same author/patient, vital input bounds, explicit vocabulary limits, normalized
and fuzzy typing, no negative-statement rewriting at the vocabulary endpoint,
inventory wildcard escaping, anonymous/department-role denial, archived design
configuration, source-preserving schema upgrade/failure cleanup, missing-column
snapshot rejection and schema-2 workflow backup/restore.

## Database migration evidence

A synthetic legacy database was made with confirmed prescription/patient/hospital
snapshots and schema 1. The additive upgrade produced a **new** file, left source
file hash unchanged, preserved old medical rows/snapshots and invalidated sessions.
Existing targets were refused. An injected migration fault removed its partial
destination without changing the source. Startup rejects legacy or incomplete table
sets. This is not proof against every form of corrupted/untrusted SQLite file;
accept backups only from trusted, reviewed sources.

## Browser reproduction

`tests/e2e/browser-smoke.cjs` creates synthetic records and a temporary doctor;
never run it against real hospital data. Set `ASH_E2E_USERNAME`,
`ASH_E2E_PASSWORD`, optionally `ASH_E2E_URL`/`ASH_E2E_OUTPUT` for an isolated TEST
server. The script deactivates the temporary doctor and retains synthetic records.

Optional Linux tooling was installed under ignored `.cache/browser-tools`:

```bash
npm install --prefix .cache/browser-tools --no-save --ignore-scripts \
  playwright-core@1.56.1 @sparticuz/chromium@138.0.2
# This sandbox additionally required extracting the packaged al2023.tar.br NSS/NSPR
# libraries and adding their lib directory to LD_LIBRARY_PATH.
NODE_PATH=.cache/browser-tools/node_modules node tests/e2e/browser-smoke.cjs
python tests/e2e/check_pdfs.py  # optional pypdf==6.1.3
```

Browser security was NOT disabled: the two packaged flags
`--disable-web-security` / `--allow-running-insecure-content` are filtered out.
Browser tools, PDFs, screenshots, credentials and runtime databases are ignored and
not shipped in setup ZIPs.

## Release boundary

Current source/release version is 0.3.0-workspace; current archives are under
`releases/v0.3.0/`. Root `releases/` archives are the previously delivered installer
edition, not this upgrade. Both new setup bundles retain the existing local wizard,
source manifest/hashes, optional Ed25519 license edition and preinstalled Windows
CPython 3.11 x64 requirement. The offline package carries 19 Windows wheels.

A fresh **0.3** online install was also executed with actual venv/pip/provision in
Linux development mode: READY 100, password input cleared, schema-2 snapshot
validation and installed app lifespan succeeded. The isolated installed environment
was removed afterwards. Windows offline dependency resolution passed using only the
19 local wheels with `--no-index` and the CPython 3.11 win_amd64 target. Installer
unit checks also pass with schema 2.
Native Windows installation/COM shortcut/physical printers, independent penetration
testing, large-scale load, medical validity and tamper-proof legal records remain
**unverified**. Backups remain unencrypted unless protected externally; no scheduled
backup/restore service or cloud sync exists. One upstream AnyIO deprecation warning
is emitted by TestClient.
