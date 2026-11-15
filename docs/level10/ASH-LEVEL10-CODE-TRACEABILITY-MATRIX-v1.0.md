# ASH Level 10 — Code Traceability Matrix v1.0

**Document ID:** ASH-LEVEL10-CODE-TRACEABILITY-MATRIX-v1.0  
**Status:** BASELINE / DESIGN INPUT — NOT AN IMPLEMENTATION  
**Review date:** 2026-11-15  
**Repository:** `smart-hospital-system/mamonaminyar1998`  
**Branch reviewed:** `main`  
**Reviewed baseline commit:** `cb68ac6e6a9f0cb62b1318f5d69391121bae47aa`  
**Related architecture:** [ASH-LEVEL10-UNIVERSAL-INTELLIGENCE-ARCHITECTURE-v1.0.md](../level10/ASH-LEVEL10-UNIVERSAL-INTELLIGENCE-ARCHITECTURE-v1.0.md)

---

## 1. Purpose and interpretation

This matrix maps the ten proposed Level 10 capability levels to code and documentation observed in the reviewed repository snapshot. It records current evidence, implementation gaps, dependencies, proposed changes, acceptance criteria, and approvals required before implementation.

This is a static, read-only traceability assessment. It does not assert that a feature is production-ready merely because a related file or route exists. A route, role check, audit table, backup utility, test workflow, or documentation page is evidence of a related capability—not proof of complete Level 10 governance.

**Status vocabulary**

- **Observed:** directly visible in the reviewed source or repository documentation.
- **Partial:** a related capability exists, but it does not meet the proposed Level 10 requirement end-to-end.
- **Not evidenced:** no implementation was identified in the reviewed paths and searches. This is not proof that no related code exists anywhere.
- **Proposed:** future design work only; not implemented or verified.
- **Not tested:** no runtime, integration, deployment, or penetration test was run as part of this review.

## 2. Repository and system boundaries

The repository contains multiple application surfaces that must not be collapsed into one assumed identity or data plane:

1. **Next.js application:** contains Slotly and the Next.js HMS area. The reviewed coexistence documentation describes separate application concerns and authentication/data boundaries within the application.
2. **ASH FastAPI application:** Python/FastAPI/SQLAlchemy backend with its own security dependencies, routers, database configuration, operational endpoints, and audit behavior.
3. **Persistence:** SQLite and PostgreSQL support are described for the FastAPI enterprise development path. The Next.js HMS code also exposes its own data access module. Do not assume a shared schema, shared transaction boundary, or synchronized identity.
4. **Operations:** Docker Compose and GitHub Actions provide development and CI foundations, not a universal orchestration or production deployment control plane.

Primary boundary evidence:
- `docs/APPLICATION_COEXISTENCE.md`
- `docs/ENTERPRISE_PHASE1_FA.md`
- `backend/app/main.py`
- `backend/app/database.py`
- `lib/hms/db.ts`
- `lib/auth.ts`
- `lib/hms/auth.ts`

**Architecture constraint:** any Level 10 implementation must preserve independent application/database/auth boundaries until an explicitly approved integration design proves otherwise. Cross-system actions require explicit identity mapping, authorization, audit correlation, failure handling, and reconciliation.

## 3. Ten-level traceability matrix

### L1 — Advisory Intelligence

**Required capability**
- Explain project state and answer questions using authorized, relevant project context.
- Distinguish source evidence, inference, stale context, and unknowns.
- Avoid presenting clinical content as validated clinical advice.

**Observed evidence**
- `backend/app/knowledge.py` — knowledge-related backend module identified in repository review.
- `lib/hms/ask.ts` — HMS question/answer-related module identified in repository review.
- `app/hms/(workspace)/layout.tsx` — explicitly displays a development-system notice that clinical references and dosing tools are unvalidated and require clinician review.

**Current assessment:** PARTIAL. Related knowledge/assistant surfaces exist, but a repository-wide, permission-aware evidence layer with provenance, freshness, source ACL enforcement, and consistent safety boundaries was not established by this review.

**Dependencies**
- Project/resource registry (L9).
- Identity and authorization adapters for each application.
- Source provenance, versioning, and freshness metadata.
- PHI classification and Purpose of Use / Professional Scope policy where clinical data is involved.

**Proposed changes**
- Define a source contract: source ID, owner, classification, version, timestamp, access policy, and citation locator.
- Add retrieval authorization before content is returned to a model or agent.
- Label output as observed fact, inference, or unknown; preserve source references.
- Prohibit clinical decision support from being represented as validated without the required clinical validation and approval.

**Acceptance criteria**
- Unauthorized sources are excluded before retrieval, not merely hidden in the final answer.
- Each material factual answer can be traced to a permitted source and version.
- Stale or unavailable sources are visibly identified.
- Tests demonstrate that synthetic data is used in development and PHI is not exposed through prompts, logs, or traces.
- Clinical output remains explicitly non-validated until clinical governance approves it.

**Required approvals**
- Product owner for knowledge scope and source ownership.
- Security/privacy owner for data classification and retrieval controls.
- Clinical owner for any clinical purpose, terminology, or workflow.
- Separate approval before connecting any external knowledge source or accessing PHI.

### L2 — Planning Intelligence

**Required capability**
- Convert a user request into a bounded plan with prerequisites, dependencies, risks, outputs, and rollback/recovery considerations.
- Separate planning approval from permission to execute individual operations.

**Observed evidence**
- `docs/ENTERPRISE_PHASE1_FA.md` — documents discrete operational steps and warns against running commands blindly.
- `docs/level10/ASH-LEVEL10-UNIVERSAL-INTELLIGENCE-ARCHITECTURE-v1.0.md` — defines proposed planning and approval concepts.

**Current assessment:** PARTIAL at the documentation/process level. No general plan object, dependency graph, or lifecycle engine was identified in the reviewed code.

**Dependencies**
- Request and project context model.
- Resource/dependency registry.
- Risk classification and policy engine (L7/L10).
- Approval service that binds consent to a precise operation.

**Proposed changes**
- Introduce versioned plan records with immutable plan snapshots.
- Represent steps as typed operations with explicit inputs, outputs, preconditions, risk, and compensating action.
- Make plan approval non-executable by itself; require a fresh approval for each operation.
- Detect stale plans when source state or dependencies change.

**Acceptance criteria**
- A plan can be rendered without performing any operation.
- Every step has a target, action, scope, preconditions, and expected evidence.
- Changing a target or material parameter invalidates the relevant approval.
- An approved plan cannot silently authorize later steps.
- Tests prove that a stale plan cannot be executed.

**Required approvals**
- Project owner for scope and sequencing.
- Security owner for risk classification.
- Explicit user approval for every subsequent operation.

### L3 — Architecture Intelligence

**Required capability**
- Maintain architecture models, system boundaries, interface contracts, decision records, and traceability between requirements and implementation.
- Detect conflicts with established architecture and decisions.

**Observed evidence**
- `docs/APPLICATION_COEXISTENCE.md` — describes application coexistence and boundaries.
- `docs/ENTERPRISE_PHASE1_FA.md` — describes the FastAPI/PostgreSQL/Docker development foundation and its limitations.
- `docs/level10/ASH-LEVEL10-UNIVERSAL-INTELLIGENCE-ARCHITECTURE-v1.0.md` — proposed Level 10 architecture.

**Current assessment:** PARTIAL. Architecture documentation exists; a continuously maintained architecture registry and machine-checkable requirement-to-code map were not identified.

**Dependencies**
- Canonical project/resource registry (L9).
- Versioned architecture decision records.
- Repository and API inventory.
- Ownership metadata for each subsystem.

**Proposed changes**
- Create versioned component, data-flow, trust-boundary, and integration inventories.
- Record architecture decisions, supersession, owner, rationale, and affected components.
- Add traceability IDs to requirements and implementation evidence.
- Add drift checks that report differences but do not automatically modify code.

**Acceptance criteria**
- Each production component has an owner, data classification, interface, and dependency list.
- Every cross-application data flow has an approved contract and security boundary.
- Architecture decisions are versioned and linked to affected code.
- Drift detection is read-only and produces reproducible evidence.

**Required approvals**
- Architecture owner and affected system owners.
- Security/privacy owner for trust-boundary changes.
- Clinical/product owner where clinical workflows or data semantics change.

### L4 — Engineering Intelligence

**Required capability**
- Support controlled engineering changes with repository-aware context, tests, review, and maintainable implementation.
- Preserve branch, dependency, naming, and security conventions.

**Observed evidence**
- `backend/app/main.py`, `backend/app/routers/`, and `backend/app/security.py` — FastAPI application structure and security dependencies.
- `app/api/` and `lib/` — Next.js API and application modules.
- `.github/workflows/ci.yml` — CI workflow identified in the repository baseline.
- `docs/ENTERPRISE_PHASE1_FA.md` — engineering setup, database, migration, and operational constraints.

**Current assessment:** PARTIAL. Application code and CI foundations exist. A Level 10 engineering agent, change sandbox, policy-enforced tool broker, or universal implementation pipeline was not identified.

**Dependencies**
- Repository adapter with read/write scopes.
- Test/build execution isolation.
- Secret and PHI scanning.
- Change review, approval, and rollback controls.
- Evidence store (L6).

**Proposed changes**
- Use isolated workspaces and least-privilege repository credentials.
- Require diff preview and explicit approval before each write, commit, push, or merge.
- Run the repository's prescribed checks in an isolated environment after approval.
- Preserve test output, tool versions, commit references, and artifact hashes as evidence.

**Acceptance criteria**
- No repository write occurs without an exact target/path/action approval.
- Secrets and PHI are not copied into logs or generated artifacts.
- Tests and builds run in an isolated environment with bounded permissions.
- Failed checks block promotion and produce actionable evidence.
- Rollback instructions exist for every approved change.

**Required approvals**
- Repository owner for every write/branch/commit/PR/merge operation.
- Security owner for credential scopes and execution isolation.
- Service owner for deployment-affecting changes.

### L5 — Controlled Execution Intelligence

**Required capability**
- Execute approved operations through typed adapters.
- Enforce exact-target, single-operation, scope-bound approval.
- Support idempotency, timeouts, safe failure, audit, and recovery.

**Observed evidence**
- `backend/app/routers/professional.py` — role-protected professional configuration and health endpoints.
- `backend/app/routers/operations.py` — role-protected operational status and metrics endpoints.
- `app/api/hms/security/route.ts` — authenticated security-code generation endpoint.
- `app/api/hms/backup/route.ts` — admin-protected backup export and gated demo reset.
- `app/api/bookings/route.ts` and `app/api/bookings/[id]/route.ts` — application-specific booking mutations and side effects.

**Current assessment:** NOT EVIDENCED as a universal capability. Existing endpoints perform bounded application actions, but no generic execution adapter registry or central operation approval enforcement was identified.

**Dependencies**
- L7 policy and approval engine.
- L9 resource registry.
- Execution adapters with per-system identities.
- Immutable audit/event evidence.
- Idempotency keys and recovery/compensation design.

**Proposed changes**
- Define an operation envelope: operation ID, requester, target resource, action, parameters hash, risk, expiry, idempotency key, and approval reference.
- Require server-side policy evaluation immediately before execution.
- Reject changed parameters, expired approvals, replayed approvals, and unregistered targets.
- Separate read, export, mutation, destructive, and production-impacting operation classes.
- Implement adapters individually; do not provide broad shell or database access by default.

**Acceptance criteria**
- Every adapter rejects calls without a valid, unused, scope-matching approval.
- Replays and parameter/target substitution are rejected.
- Operations are idempotent or have documented compensation.
- All results, failures, and approvals are correlated in the audit trail.
- Destructive and production operations fail closed if policy or audit services are unavailable.

**Required approvals**
- Explicit user approval for each exact operation.
- Resource/system owner approval for target access.
- Security approval for adapter design and privilege boundaries.
- Clinical/data owner approval for clinical or PHI-impacting actions.

### L6 — Quality Intelligence

**Required capability**
- Map requirements to automated tests, manual checks, evidence, defects, and release gates.
- Distinguish tests that ran from tests merely documented or claimed.

**Observed evidence**
- `.github/workflows/ci.yml` — repository CI workflow identified.
- `backend/app/observability.py` — backend observability/metrics module.
- `backend/app/routers/operations.py` — exposes admin-protected status and metrics endpoints.
- Test directories and test workflows are present in the repository.

**Current assessment:** PARTIAL. CI and tests exist, but a centralized evidence engine linking Level 10 requirements, test executions, artifacts, and approvals was not identified.

**Dependencies**
- Requirement IDs and traceability records (L3).
- CI provider adapter (L4).
- Evidence storage and retention policy.
- Release policy and approver roles (L7).

**Proposed changes**
- Define evidence records with source commit, workflow/run ID, test name, result, timestamp, environment, and artifact hash.
- Link each acceptance criterion to at least one test or documented manual verification.
- Mark skipped, stale, flaky, and unexecuted checks distinctly.
- Gate release on required evidence rather than narrative status.

**Acceptance criteria**
- Every release-critical requirement has linked verification evidence.
- Evidence identifies the exact commit and environment.
- A green CI result cannot be reused for a different commit.
- Missing or stale evidence blocks the relevant release gate.
- Evidence access follows repository and data-classification permissions.

**Required approvals**
- Engineering/test owner for test policy.
- Security owner for security test coverage.
- Clinical owner for clinical validation criteria.
- Release owner for release gate changes.

### L7 — Security and Compliance Intelligence

**Required capability**
- Enforce identity, least privilege, data classification, Purpose of Use, Professional Scope, privacy, audit integrity, and secure defaults.
- Treat compliance as evidence-backed assessment, not a claim based on the presence of controls.

**Observed evidence**
- `backend/app/security.py` — FastAPI authentication/role/audit dependency module.
- `lib/hms/auth.ts` — Next.js HMS authentication module.
- `lib/auth.ts` — Next.js application authentication module.
- `lib/request-security.ts` — same-origin mutation policy and demo-action flag.
- `backend/app/routers/professional.py` — role-dependent access to professional/department endpoints.
- `app/api/hms/backup/route.ts` — admin restriction for export and feature flag plus confirmation for demo reset.

**Current assessment:** PARTIAL. Multiple authentication and authorization controls exist, but they are distributed across separate application stacks. This review did not identify a complete central Purpose of Use / Professional Scope enforcement service or prove compliance with a healthcare certification.

**Dependencies**
- Identity federation or explicit cross-system identity mapping (only if approved).
- Policy registry and policy decision/enforcement points.
- Authoritative professional credential and employment sources.
- Data classification, consent, and retention rules.
- Tamper-evident audit and security monitoring.

**Proposed changes**
- Keep existing auth domains separate until a reviewed integration design is approved.
- Define explicit policy inputs: subject, active employment, role, credential status, purpose, scope, resource, action, and context.
- Obtain clinical governance approval for the Purpose of Use catalogue and Professional Scope rules before coding them.
- Add negative tests for cross-tenant, cross-patient, role escalation, replay, CSRF, session revocation, and audit failure.
- Establish threat model and security acceptance gates for every adapter.

**Acceptance criteria**
- Deny by default when identity, purpose, scope, or policy evidence is absent or stale.
- Authorization is enforced server-side for every sensitive read and mutation.
- PHI access is logged with actor, patient/resource, purpose, scope, action, outcome, and correlation ID, without leaking PHI into general logs.
- Audit failure behavior is explicitly defined and tested.
- No compliance/certification claim is made without the applicable independent assessment.

**Required approvals**
- Security and privacy owner.
- Clinical governance owner for Purpose of Use and Professional Scope.
- Data controller/authorized hospital owner for PHI processing.
- Legal/compliance owner for any formal compliance assertion.

### L8 — Operations Intelligence

**Required capability**
- Monitor service health, dependencies, backups, recovery, incidents, and operational SLOs.
- Coordinate operations without bypassing system-specific safeguards.

**Observed evidence**
- `backend/app/routers/operations.py` — `/api/ops/status` and `/api/ops/metrics`, admin-protected.
- `backend/app/observability.py` — metrics support.
- `backend/app/routers/professional.py` — health summary/check/acknowledgement endpoints.
- `app/api/hms/backup/route.ts` — admin-protected JSON backup export and gated demo reset.
- `docs/ENTERPRISE_PHASE1_FA.md` — Docker Compose, PostgreSQL, migration, backup/restore and operational guidance.

**Current assessment:** PARTIAL. Service-specific health, metrics, backup and database operations exist. A unified multi-application operations control plane, tested disaster recovery orchestration, and central incident lifecycle were not established.

**Dependencies**
- Service/resource registry (L9).
- Metrics/logging/alert adapters.
- Backup inventory, encryption, retention, and restore verification.
- Incident and change-management policies.
- Approval engine for disruptive operations.

**Proposed changes**
- Register each service, database, environment, owner, SLO, health probe, and backup policy.
- Standardize correlation IDs and operational event fields across systems.
- Build read-only health aggregation first.
- Treat backup verification and restore drills as separate approved operations.
- Require explicit approval for restart, failover, restore, migration, and destructive maintenance.

**Acceptance criteria**
- Health aggregation distinguishes healthy, degraded, unknown, and unavailable.
- A failed monitor never appears as an all-clear.
- Backup evidence includes timestamp, scope, encryption state, retention, and restore-test result.
- Recovery objectives are documented and verified through approved drills.
- Production operations are blocked when target identity or approval cannot be verified.

**Required approvals**
- IT/operations owner for monitoring and recovery policy.
- Database owner for backup/restore and migration.
- Security owner for log access and retention.
- Explicit service owner/user approval for disruptive operations.

### L9 — Strategic Portfolio Intelligence

**Required capability**
- Maintain a current inventory of projects, repositories, environments, services, owners, dependencies, risks, decisions, and delivery status.
- Support portfolio-level prioritization without assuming access to unconnected resources.

**Observed evidence**
- `docs/portfolio/ASH-ENTERPRISE-PROJECT-REGISTRY-v1.0.md` — static project/repository registry created in the reviewed repository history.
- GitHub repository structure and project documentation.
- `docs/APPLICATION_COEXISTENCE.md` — application boundary context.

**Current assessment:** PARTIAL. A portfolio registry document exists. A live, permission-aware portfolio service with ownership, freshness, dependency graph, and reconciliation was not identified.

**Dependencies**
- Authorized repository and service discovery adapters.
- Project/resource identity and ownership model.
- Source freshness and provenance.
- Approval policy for connecting additional repositories/accounts.

**Proposed changes**
- Define canonical project, repository, service, environment, owner, dependency, and risk records.
- Track source system, last verified time, visibility, and verification status.
- Distinguish connected, discovered, inaccessible, archived, and unknown resources.
- Add read-only synchronization first; require approval before connecting new accounts or changing repositories.

**Acceptance criteria**
- Each portfolio item has an immutable identity and authoritative source.
- Unknown/inaccessible resources are not reported as absent.
- Every status has a source and last-verified timestamp.
- Portfolio changes are auditable and do not silently modify source repositories.
- Cross-project dependencies have explicit owners and approval paths.

**Required approvals**
- Portfolio/project owner for registry semantics.
- Repository/account owner for each new connection.
- Security owner for connector permissions and data retention.

### L10 — Universal Intelligence and Governance

**Required capability**
- Coordinate all prior levels through a single governed request lifecycle.
- Enforce ask-before-every-operation, including private/read-only access, external discovery, writes, tests, builds, deployments, data exports, and PHI access.
- Keep approvals precise, single-use, time-bounded, and scope-bound.

**Observed evidence**
- `docs/level10/ASH-LEVEL10-UNIVERSAL-INTELLIGENCE-ARCHITECTURE-v1.0.md` — proposed architecture and approval semantics.
- Existing application-specific role checks and audit paths described in L5/L7.
- No central orchestration or policy/approval engine was identified in the reviewed paths and code searches.

**Current assessment:** NOT IMPLEMENTED. The Level 10 architecture is documented only. The repository review did not find a universal command interface, orchestration engine, specialist agent catalog, central policy/approval engine, execution adapter registry, or cross-system audit/evidence service.

**Dependencies**
- All L1–L9 capabilities and their owners.
- Canonical identity/resource registry.
- Central policy and approval service.
- Secure execution broker with least-privilege adapters.
- Immutable audit/evidence and incident/recovery services.
- Governance board and policy lifecycle.

**Proposed changes**
1. Approve a detailed threat model and governance policy before implementation.
2. Define request, plan, approval, operation, evidence, and audit-event schemas.
3. Build a non-executing request/plan prototype first.
4. Implement approval verification and audit persistence before enabling adapters.
5. Add one low-risk read-only adapter at a time, each with its own explicit authorization and tests.
6. Add write/destructive/production adapters only after independent review and separate approval.
7. Preserve per-system auth and data boundaries; do not create a universal superuser credential.
8. Add failure-mode tests for policy outage, audit outage, replay, stale approval, target substitution, timeout, partial success, and rollback.

**Acceptance criteria**
- No operation—including read-only private resource access—starts before explicit approval of that exact operation.
- Approval binds requester, action, target, scope, parameters hash, expiry, and single-use nonce.
- Any material change invalidates approval.
- Policy or audit unavailability fails closed for protected operations.
- Each operation produces correlated request, approval, execution, and evidence records.
- No adapter has broad ambient credentials or unrestricted shell/database access.
- Human owners retain final authority over clinical, privacy, production, financial, and destructive decisions.
- End-to-end tests prove all approval invariants and safe recovery behavior.

**Required approvals**
- Executive/project sponsor for Level 10 scope and funding.
- Security/privacy owner for governance and threat model.
- System owners for each connector and execution adapter.
- Clinical governance for any clinical or PHI-related operation.
- Separate explicit user approval for each actual operation.

## 4. Cross-cutting implementation dependencies

| Dependency | Why it is required | Blocking levels |
|---|---|---|
| Canonical resource registry | Prevents wrong-repository, wrong-environment, and wrong-service operations | L1–L10 |
| Per-system identity adapters | Existing application authentication domains are separate | L1, L4, L5, L7, L8, L9, L10 |
| Purpose of Use / Professional Scope governance | Determines whether a clinical data operation is permitted | L1, L5, L7, L10 |
| Policy and approval engine | Enforces precise, single-use, scope-bound authorization | L2, L5, L7, L10 |
| Execution adapter broker | Prevents direct, uncontrolled tool execution | L4, L5, L8, L10 |
| Evidence and audit correlation | Makes operations reconstructable and reviewable | L5–L10 |
| Recovery and idempotency model | Handles partial failures and repeated requests safely | L5, L8, L10 |
| CI and isolated test execution | Verifies changes without production access | L4, L6, L10 |
| Data classification and PHI controls | Limits exposure and defines permitted processing | L1, L5, L7, L8, L10 |

## 5. Recommended implementation sequence

This sequence is a proposal, not execution authorization.

| Sequence | Deliverable | Exit condition |
|---|---|---|
| 0 | Confirm system owners, boundaries, and threat model | Owners and trust boundaries are approved |
| 1 | Canonical resource and project registry schema | Resource identity and freshness rules are tested |
| 2 | Request/plan/approval/operation/evidence schemas | Schema and lifecycle invariants are reviewed |
| 3 | Policy decision and approval enforcement service | Replay, expiry, scope substitution, and fail-closed tests pass |
| 4 | Central audit correlation and evidence store | End-to-end event reconstruction is demonstrated |
| 5 | Read-only, non-PHI adapter pilot | Exact-operation approval is enforced and audited |
| 6 | Quality/evidence integration with CI | Evidence is commit- and environment-bound |
| 7 | Operations read-only aggregation | Health state and unknown/unavailable states are correct |
| 8 | Additional adapters, one at a time | Each adapter passes security review and owner approval |
| 9 | Controlled write/production capabilities | Independent security and owner acceptance completed |

**Do not begin with a universal agent or unrestricted command runner.** The policy, approval, audit, and resource-identity foundations must exist first.

## 6. Traceability and verification rules

For each requirement added during implementation, maintain:

- Requirement ID and source architecture section.
- Responsible owner and risk classification.
- Affected repository, application, API, database, and file paths.
- Data classification and whether PHI is involved.
- Required policy and approval type.
- Unit, integration, security, and operational tests.
- Evidence reference, commit SHA, workflow/run ID, and timestamp.
- Deployment/recovery plan where applicable.

A status may move from **Not evidenced** to **Observed** only after the relevant code or configuration is inspected. It may move to **Verified** only after the required tests are executed against the stated commit and environment, with inspectable evidence. Documentation alone cannot establish runtime behavior.

## 7. Review limitations

- This matrix is based on a static inspection of the GitHub `main` snapshot identified above.
- The local Windows working tree was not inspected because the connected device was previously offline.
- No runtime tests, CI runs, builds, migrations, deployment checks, penetration tests, or database queries were performed for this matrix.
- No patient records or PHI were accessed.
- File references identify observed code surfaces; they do not prove every related implementation detail or all call paths.
- “Not evidenced” means not established by the inspected paths/searches, not a definitive claim that no code exists anywhere in the repository.
- No compliance, clinical validation, or production-readiness certification is asserted.

## 8. Change control

This document is a design and traceability artifact only. It does not authorize implementation, repository changes, API changes, database migrations, account connections, external access, testing, builds, deployments, or access to PHI.

Every subsequent operation requires a separate proposal and explicit approval identifying the exact target, action, and scope. Approval of this document does not authorize any implementation step.
