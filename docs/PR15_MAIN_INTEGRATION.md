# PR #15 integration with newer main

PR #15 was originally based on `a7630dc`. Before merging it, the working branch was reconciled with `865e458` from main. This note records conflict resolution, not clinical sign-off.

## Preserved from main

- New ENT, ophthalmic, paediatric and obstetric/gynaecology chapters, formulary entries and structural audits.
- Applicable age-band/sex restrictions and intentionally empty medication examples. Paediatric and reproductive-health examples are not populated with invented medicines.
- The newer standalone/disc/ISO tools, presentation assets and private licence-key implementation.
- Main's tracked catalogue datasets and demonstration database, without regeneration. Existing release ZIPs remain immutable.
- The `clinical-approved` human-review gate. No label, sign-off or specialist approval was supplied by this integration.

## Retained safeguards and integration adaptations

- No legacy or new recipe may automatically add a drug, force a syrup/liquid/injection, or enforce a universal minimum drug count. Existing recipe metadata is retained for compatibility; intentional no-medication plans remain valid.
- New catalogue audits are preserved. `npm run hms:regimens -- --check` performs structural and limited rule validation in memory, without writing files or opening the configured hospital database. It is not clinical validation.
- Teaching exports still require explicit opt-in, `--teaching-only` and a NEW `--output-dir`. All structural/blocking checks complete before files are written; tracked datasets are never overwritten by that command.
- Main's catalogue seeder deletes/recreates synthetic-prefix prescription records. It now refuses by default and requires both demo/teaching environment opt-ins and `--confirm-destroy`. Normal deployment does not refresh those records automatically.
- Clinical CI uses the read-only catalogue validator and explicitly initializes a separate synthetic verification DB. Its human approval requirement is unchanged.
- Both npm release scripts and regression/typecheck scripts remain available. Duplicate merge-generated JSON override keys were resolved to main's global patched PostCSS override.
- Main may generate a private `license.key` next to the configured DB. Preserve that key securely in addition to private environment settings and uploads; database snapshots do not include those files.

## Verification after conflict resolution

- `npm ci`, `npm run lint`: passed.
- `npm run test:next`: **54 passed**, including added age/sex/no-medication and read-only catalogue-check regressions.
- `npm test`: **26 passed**.
- `npm run hms:regimens -- --check`: 717 conditions, 3,815 synthetic examples, 729 no-medication cases; structural checks passed and no blocking rule findings. This is not prescribing approval.
- `npm run check:css`: passed.
- `npm audit --audit-level=low`: 0 vulnerabilities reported.
- Production `npm run build`: passed with an isolated configured DB path.

Remote CI must be reviewed on the updated PR revision. A missing `clinical-approved` label is not repaired by inventing specialist review or weakening the gate. Native Windows/printer and independent clinical/security validation remain outstanding.

## Historical source ZIP

`releases/repair-2026-11-02/Aybek-Hospital-Repaired-Source-2026-11-02.zip` is the earlier delivered source snapshot. It is not regenerated or relabelled to imply it contains this newer integration. Its published checksum and original per-file manifest remain valid for that snapshot, not for the latest branch tree. The earlier audit report describes its original verification period.
