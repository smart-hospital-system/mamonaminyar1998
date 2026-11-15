# ASH Enterprise Project Registry v1.0

- **Snapshot date:** 2026-11-15
- **Registry status:** Initial inventory; evidence is partial and read-only
- **Maintained in:** `smart-hospital-system/mamonaminyar1998`
- **Scope:** Six repositories visible to the currently connected GitHub identity
- **Change policy:** This registry records observations and proposed work. It does not authorize merges, deployments, account changes, credential rotation, or other repository modifications.

> **Important:** A successful GitHub Actions run is not proof of production readiness, security assurance, clinical validation, or operational completeness. No repository was cloned or executed as part of this remote inventory. Ratings below are provisional and evidence-based, not certification.

## 1. Executive summary

Six repositories were visible in the connected GitHub account at the time of review. The strongest ASH-related source candidate is `smart-hospital-system/mamonaminyar1998`, but its README explicitly documents two independent applications (Next.js and FastAPI) with separate databases, authentication, and deployment paths. They are not integrated or synchronized, and neither is clinically certified.

The repositories have different apparent purposes and maturity:

- `mamonaminyar1998/ai`: large public multi-package JavaScript/TypeScript monorepo.
- `smart-hospital-system/mamonaminyar1998`: ASH / Aybek hospital development repository; active, multi-application, not production-certified.
- `smart-hospital-system/nextjs-tailwind-starter`: starter/template repository with CI and an open architecture-planning PR.
- `smart-hospital-system/demo-repository`: private demonstration repository with an open Next.js/CI scaffolding PR.
- `smart-hospital-system/huggingface.js`: public multi-package JavaScript repository; workflow executions were not found in the inspected Actions history.
- `smart-hospital-system/flask-python-boilerplate`: small Flask starter; workflow executions were not found in the inspected Actions history.

No repository was classified as “complete” or “production-ready” from this evidence alone.

## 2. Portfolio inventory

| Repository | Visibility | Default branch | Latest inspected Actions evidence | Open PR evidence | Provisional assessment |
|---|---|---|---|---|---|
| [mamonaminyar1998/ai](https://github.com/mamonaminyar1998/ai) | Public | `main` | 145 recorded runs; latest inspected run completed successfully on 2026-10-21 | Not established in this pass | Large multi-package project; requires package-level scope and release audit |
| [smart-hospital-system/demo-repository](https://github.com/smart-hospital-system/demo-repository) | Private | `main` | 24 recorded runs; latest inspected run “Proof HTML” succeeded on 2026-11-09 | [PR #5](https://github.com/smart-hospital-system/demo-repository/pull/5), open | Demo/starter work in progress; review repository purpose and PR scope |
| [smart-hospital-system/huggingface.js](https://github.com/smart-hospital-system/huggingface.js) | Public | `main` | 0 recorded workflow runs returned by inspected endpoint | Not established in this pass | Multi-package codebase; CI and maintenance status unverified |
| [smart-hospital-system/mamonaminyar1998](https://github.com/smart-hospital-system/mamonaminyar1998) | Public | `main` | 108 recorded runs; latest inspected run “ASH phase-1 verification” succeeded on 2026-11-08 | [PR #16](https://github.com/smart-hospital-system/mamonaminyar1998/pull/16), open | Primary ASH candidate; active but split into independent applications and not clinically certified |
| [smart-hospital-system/nextjs-tailwind-starter](https://github.com/smart-hospital-system/nextjs-tailwind-starter) | Public | `main` | 3 recorded runs; latest inspected CI succeeded on 2026-11-07 | [PR #6](https://github.com/smart-hospital-system/nextjs-tailwind-starter/pull/6), open | Starter with test/CI foundation; security architecture remains at planning/review stage |
| [smart-hospital-system/flask-python-boilerplate](https://github.com/smart-hospital-system/flask-python-boilerplate) | Public | `main` | 0 recorded workflow runs returned by inspected endpoint | Not established in this pass | Small Flask starter; runnable/test/release state not established |

**Permissions observed:** The connected GitHub integration reported admin, maintain, pull, push, and triage permissions for all six repositories. No write action was performed while compiling this registry.

## 3. ASH repository: architecture and evidence

Repository: [smart-hospital-system/mamonaminyar1998](https://github.com/smart-hospital-system/mamonaminyar1998)

The current README states that the repository preserves two independent applications:

1. Next.js application, described as running on port 3000.
2. ASH FastAPI application, described as running on port 8000.

The README explicitly says the applications have separate databases, authentication, and deployment paths; they are not integrated or synchronized. The README also states that neither application is clinically certified.

The README describes an on-premise/local-first hospital workflow and a separate PostgreSQL-capable FastAPI development foundation. It lists multiple implemented and unimplemented capabilities. Those descriptions are repository documentation, not independent runtime verification.

### 3.1 Open pull request

[PR #16 — Adapt CI and tests to Aybek HMS](https://github.com/smart-hospital-system/mamonaminyar1998/pull/16)

- State at inspection: open, not merged.
- Base: `main`.
- Head: `arena/f559e0de-mamonaminyar1998`.
- PR description proposes adapting CI to the existing HMS scripts and adding an isolated synthetic-database login-route test.
- PR description reports local validation including lint, CSS checks, tests, build, YAML parsing, and `git diff --check`.
- These are claims in the PR description; they were not independently re-executed during this remote registry operation.

### 3.2 Security and release-gate observations

The public README contains demonstration-account access information. Treat those accounts as demonstration-only, do not expose the demo service to the public internet, and verify that no demonstration identity can access real patient data. The registry intentionally does not reproduce any credential values.

The README also documents a public fallback value for licence signing in source code and recommends configuring a deployment-specific secret. This design requires a deliberate security review before any real commercial or production deployment. No key was rotated and no source file was changed.

Other release gates stated in the README include the separation of the two application stacks, unvalidated clinical scope, incomplete cloud/enterprise capabilities, and outstanding platform-specific validation. The presence of FHIR, SMART/OIDC, Kubernetes, pgvector/RAG, or clinical decision-support terms in repository descriptions must not be interpreted as implementation or certification.

## 4. Other open pull requests

### 4.1 Demo repository

[PR #5 — Add Next.js app with CI (lint, typecheck, test, build)](https://github.com/smart-hospital-system/demo-repository/pull/5)

- State at inspection: open, not merged.
- Base: `main`; head: `arena/b151e864-demo-repository`.
- The PR description says it adds a Next.js App Router application, a CI workflow, tests, and package tooling.
- Confirm that this is the intended purpose of the private demo repository before merging or treating it as a reusable product.

### 4.2 Next.js starter

[PR #6 — docs: architecture plan for SEC-01 (auth, RBAC, data layer, CSP)](https://github.com/smart-hospital-system/nextjs-tailwind-starter/pull/6)

- State at inspection: open, not merged.
- Base: `main`; head: `arena/f84a255d-nextjs-tailwind-starter`.
- The PR description says it adds a documentation-only security architecture plan. It identifies authentication, RBAC, data-layer scoping, and CSP as unresolved architectural decisions.
- Review and approve the plan before any implementation is started; do not assume the planned controls already exist.

## 5. Provisional work queue

| Priority | Work item | Target | Acceptance evidence |
|---|---|---|---|
| Critical | Review demo credentials and ensure demo identities/data cannot be used in a public or real-patient environment | ASH | Documented environment separation, account lifecycle, access test results; no credential values in source/docs |
| Critical | Review licence-signing fallback and secret-management design | ASH | No production signing path relies on a public fallback; rotation/recovery procedure and negative tests |
| High | Resolve the two-application architecture and define explicit integration boundaries or intentional separation | ASH | Approved architecture decision record, data ownership, authentication boundaries, deployment diagrams |
| High | Review PR #16 against the current main branch and CI policy | ASH | Required checks pass on the exact proposed merge commit; human review recorded |
| High | Review PR #6 and decide whether the starter is an active product or reference template | Next.js starter | Accepted/rejected architecture plan and clear ownership |
| High | Confirm the purpose and intended contents of PR #5 | Demo repository | Repository purpose documented; CI and app scope verified |
| Medium | Add or restore CI for repositories with no recorded Actions runs | huggingface.js, Flask boilerplate | Workflow files inspected; clean CI run on default branch |
| Medium | Audit dependency health, licences, vulnerabilities, secret exposure, and release artifacts | All six | Reproducible reports tied to commit SHAs |
| Medium | Verify release tags, branch protections, required reviews, and deployment environments | All six | Settings evidence and release inventory |
| Medium | Execute each project in an isolated environment with synthetic data only | All six | Reproducible setup, tests, build, smoke tests, cleanup evidence |

## 6. Evidence limitations and confidence

This is an initial remote GitHub inventory, not a full source-code or operational audit.

- Repository metadata, selected README content, open PR details, and recent Actions run summaries were inspected.
- Workflow run counts are the values returned by the inspected GitHub Actions endpoint at the time of review; they are not a guarantee that all workflows are correctly configured.
- A zero-run result means no run was returned by the inspected endpoint; it does not prove that a repository has no workflow files.
- Branch inventory, full commit ancestry, all issues, releases/tags, branch protection, rulesets, environment secrets, deployment history, and complete file-level security scans have not been fully verified.
- No local clone, dependency installation, application startup, database migration, integration test, clinical workflow test, or deployment was performed for this six-repository inventory.
- No PHI, production database, or private credential was accessed as part of this registry operation.
- The repository `mamonaminyar1998/ash-healthcare-platform` was not visible in the current connected inventory. A previous lookup returned 404. This does not establish deletion; it may be moved, renamed, private to another identity, or otherwise inaccessible to this connection.
- The local Windows device previously associated with the ASH checkout was reported offline. Local working-tree status must be rechecked when the device is available.

**Confidence:** High for the repository identities and default branches returned by the connected GitHub API; medium for the selected PR and Actions metadata; low-to-medium for maturity classifications; not assessed for production readiness.

## 7. Change and approval log

| Date | Operation | Result |
|---|---|---|
| 2026-11-15 | Read-only inventory of six connected GitHub repositories | Completed |
| 2026-11-15 | Create this registry file on the ASH repository default branch | Authorized by the project owner; execution recorded by the resulting Git commit |

No PR was merged, no existing file was edited, no workflow was triggered manually, no secret or account setting was changed, and no deployment was performed as part of this registry creation.
