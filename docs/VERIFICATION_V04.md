# 0.4 professional upgrade — verification and release boundary

Run date: **2026-10-30**. Synthetic records only. Historical 0.3 evidence is in
`VERIFICATION.md`; it must not be confused with this run.

## Executed on current source

| Check | Observed result |
|---|---|
| Python regression/integration/setup/packaging suite | 82 passed; one Starlette/AnyIO deprecation warning |
| jsdom frontend suite | 24 passed |
| JavaScript syntax | app, workspace, professional and installer scripts passed |
| Python compileall | backend and scripts passed |
| pip check | no broken requirements |
| Runtime route/table inventory | 55 API routes; 17 SQL tables; schema remains 2 |
| Windows CPython 3.11 x64 dependency resolution | 19 bundled wheels resolved with `--no-index`, Windows target and tested constraints |
| Real online installer on Linux | actual allowlisted copy, fresh venv, network dependency install, pip check, stdin provisioning, explicit physician-owner, empty patient table, import validation and ready marker passed |
| Chromium workflow smoke | login, real persistence, SOAP/vitals, private tasks, appointments, fuzzy vocabulary, draft/edit, persisted design selection and confirmation, gallery, themes, desktop/mobile; no page errors |
| PDF inspection with pypdf | all 200 short synthetic layouts exactly one A4 page; long 30-item document six pages and final item retained |
| Professional Chromium smoke | all five 3-step guides; ten profile forms; escaped title saved/reloaded; manual health scan; ten appearance controls and actual copper palette; mobile no horizontal overflow; no page errors |
| Unified-package test | ten numbered PS scripts, shared PSM1, offline HTML guide, signed public-key metadata, every manifest hash, no runtime DB/private key/cache/node_modules |

The new tests include ordinary-admin clinical denial, explicit owner prescription,
lab/radiology results and discharge, studio optimistic revision/validation,
confirmed snapshot immutability after studio changes, department RBAC, all ten
preferences, 48-hour escalation/acknowledgement/resolution without changing patient
rows, and exclusive demo creation without touching the real DB.

The legacy design IDs 1–200 and existing records are preserved. Confirmed print
selection is disabled; a draft design choice is persisted with its expected
revision before confirmation/printing controls are re-enabled. Studio changes
only affect future confirmations. No medical/source repair is automated.

## Reproduction

```text
python -m pytest -q
npm ci --ignore-scripts
npm run check
npm test
python -m compileall -q backend scripts
python -m pip check
```

For an isolated **synthetic-only** test server, optional ignored browser tooling:
`playwright-core@1.56.1`, `@sparticuz/chromium@141.0.0`, and `pypdf` were installed.
This sandbox needed the packaged `al2023.tar.br` decompressed into an ignored
library directory, supplied via `LD_LIBRARY_PATH`. No browser binaries/libraries,
PDFs or screenshots are release inputs. The test filters the packaged
`--disable-web-security` and `--allow-running-insecure-content` flags out.

Set `ASH_E2E_USERNAME` / `ASH_E2E_PASSWORD` and optionally `ASH_E2E_URL`,
`ASH_E2E_OUTPUT` for your **test-only** instance, then run:

```text
node tests/e2e/browser-smoke.cjs
python tests/e2e/check_pdfs.py
node tests/e2e/professional-smoke.cjs
```

Browser smoke retains clearly labelled synthetic records and deactivates its
temporary doctor. Never run it on real hospital data. The professional smoke
briefly edits/restores a test heading and personal palette.

To check Windows dependencies without executing them:

```text
python -m pip download --no-index --find-links WHEELHOUSE --platform win_amd64 --python-version 311 --implementation cp --abi cp311 --only-binary=:all: -r requirements.txt -c requirements-tested.txt -d NEW_OUTPUT
```

Build the unified release from allowlisted source:

```text
python -m scripts.package_unified --output NEW_RELEASE.zip --wheelhouse WHEELHOUSE
```

Optional `--public-key PUBLIC_KEY_FILE` enables signed installation; no private
key is ever a packager input. Sources are identical for online/offline installation;
the setup switch only changes pip's dependency source. The final archive is
re-opened and every manifest-listed byte hash verified after creation.

## Not verified / not promised

- Native Windows or PowerShell execution, Windows shortcut/ACL/audio integration,
  physical printing, every browser/driver/font, or a genuinely air-gapped Windows
  end-to-end installation. Windows-target wheel resolution is not execution.
- A Python installer or standalone EXE is **not bundled**. Offline operation needs
  the compatible Python runtime already installed. Node/npm are test-only, not
  hospital runtime prerequisites.
- Cloud hosting, automatic online/offline data synchronization, complete OT,
  PACS/DICOM, batch/expiry/sales accounting, validated dosing/interactions/diagnosis,
  recorded audio/video tutorials, full correction/account-recovery workflows,
  centrally managed multi-server licensing or remote revocation.
- Complete duplicate-file/malware/logic-error detection, tamper-proof DRM, encrypted
  backups by default, or autonomous editing/deleting/restoring records/source.
- Clinical, security, regulatory or production acceptance. This remains a
  foundation requiring local IT and clinician validation before real data/use.

Read `UPGRADE_V04_FA.html` for beginner steps and `REVIEW_V04_FA.md` for the
one-by-one issue review and remaining requirements.
