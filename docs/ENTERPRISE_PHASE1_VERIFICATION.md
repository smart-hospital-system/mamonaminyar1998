# Phase-1 development verification (0.5.0-dev.1)

## Executed locally

- Full Python suite with real **PostgreSQL 17.6** enabled: **98 passed, 1 skipped**. The skipped test needs a matching-major pg_dump/pg_restore client, unavailable for PG17 in this sandbox.
- All **17 phase-1 tests** passed separately against a disposable **PostgreSQL 16.2 + matching 16.2 clients**, including real protected custom-format dump, refusal to overwrite an existing backup/nonempty DB, restore into a new isolated DB, revoked sessions and login/patient verification. This is not a Docker17 test or a production endorsement of that old test binary.
- Existing SQLite tests continued to run as part of the full suite; optional PG tests skip explicitly if ASH_TEST_DATABASE_URL is absent.
- The actual `docker/postgres-init.sql` was additionally exercised on the disposable PostgreSQL17 cluster, with isolated role/database names and local secret paths. Verified non-superuser/non-createdb/non-createrole/non-bypassrls roles, owner provisioning, default table/sequence grants, runtime readiness and login. This was **outside Docker**, not a container test.
- **26 DOM tests** passed. JavaScript syntax, Tailwind source/output equivalence, Python compileall and pip check passed. npm ci audit reported zero vulnerabilities at execution time (not a security certification).
- Compose and workflow YAML parsed successfully; local assertions checked read-only web filesystem, loopback web port, no exposed database port, and separate web/owner secret mounts.

## Important negative/safety tests

Ambiguous/empty database configuration refused without fallback; secret URL errors redacted; source-only inspection is read-only; live WAL inputs and unmapped columns/tables/views/indexes refused; nonempty targets refused; injected verification failure rolled back all PG schema/data; imported IDs/sequences/snapshots/hashes checked; sessions invalidated; runtime DDL denied; admin-only metrics/readiness behavior checked; passwords excluded from pg-client argv; temporary passfiles are 0600 and removed; local secrets never overwrite existing files.

## Not executed here

No Docker daemon is installed. The Dockerfile and Compose stack have **not been built/run locally**. GitHub workflow definitions are saved but **have not run on GitHub**, and no CI success badge/check is claimed. The Compose CI job is configured to build, initialize, start/readiness-check, back up and restore into a new CI-only database.

No production PostgreSQL was contacted; tests create/drop only randomly named test databases on disposable local clusters. No real hospital records were migrated. No Windows/PowerShell execution, real printer, production load/HA/DR, regulatory or clinical validation was performed. No FHIR, SMART/OIDC, pgvector/RAG or autonomous medical capability is implemented by phase 1.

## Reproduce safely

Use a dedicated **test-only** PostgreSQL cluster/account with CREATE DATABASE rights and set ASH_TEST_DATABASE_URL through a protected environment. Tests create/drop `ash_test_*` databases. Do not point them at production.

```text
python -m pip install -r requirements-dev.txt -r requirements-enterprise.txt -c requirements-tested.txt
python -m pytest -q
```

With matching-major client tools on PATH, set ASH_RUN_PG_CLIENT_TESTS=1 to enable the optional real backup/restore test. Regular application runtime roles do not need CREATE DATABASE and must not be used as cluster admins.

```text
npm ci --ignore-scripts
npm run check:css
npm run check
npm test
python -m compileall -q backend scripts
python -m pip check
```

Read `ENTERPRISE_PHASE1_FA.md` before operational commands. Source and manifest-reviewed release packaging exclude `.secrets`, `.data`, `.cache`, imports, issuer keys and runtime exports. The new ZIP carries the SQLite installer and enterprise source, **not** offline Docker images or optional PostgreSQL driver wheels. Older release ZIPs remain unchanged.
