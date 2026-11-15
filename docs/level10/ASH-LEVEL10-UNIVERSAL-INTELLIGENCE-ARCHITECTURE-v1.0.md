# ASH Level 10 — Universal Intelligence & Governance Architecture

**Document ID:** ASH-L10-ARCH-001  
**Version:** 1.0  
**Status:** Proposed architecture; documentation only  
**Created:** 2026-11-15  
**Project:** aybek-smart-hospital / ASH Healthcare Platform  
**Implementation status:** Not implemented; this document does not claim that Level 10 currently exists.

---

## 1. Executive definition

**Level 10 — Universal Intelligence & Governance (UIG)** is the proposed top-level coordination and governance layer for a multi-project ecosystem. It translates user requests into bounded, reviewable work; coordinates specialist capabilities; enforces explicit authorization; validates outcomes; and maintains traceable evidence.

It is intended to support many kinds of work—not only software engineering—including research, project management, documentation, data analysis, product design, operations, education, business workflows, and healthcare technology. Actual execution depends on available tools, connected services, permissions, and verified capabilities. Level 10 must never claim to have performed an operation that was not actually executed and verified.

Level 10 is not unrestricted autonomous authority, a guarantee of perfect results, or a replacement for accountable human, clinical, legal, security, or operational decision-makers.

## 2. Mandatory user-approval contract

The default policy is **ASK BEFORE EVERY OPERATION**.

Before Level 10 performs any discrete operation, it must present the proposed action and obtain the project owner's explicit approval. This includes read-only and write operations against project resources, external services, connected accounts, websites, repositories, databases, infrastructure, and local devices.

Pure conversational reasoning that does not access or change external resources may be used to prepare the proposal. Once an operation is needed, the system pauses and asks first.

### 2.1 Required approval request

Every approval request must state:

1. **Purpose:** why the operation is needed.
2. **Exact action:** what will be done, using which tool or method.
3. **Target and scope:** project, account, repository, branch, file paths, records, environment, or service.
4. **Inputs and data:** what information will be accessed or supplied, including whether sensitive or patient data could be involved.
5. **Expected outputs:** files, records, reports, API calls, configuration changes, or other results.
6. **Impact and risk:** security, privacy, availability, cost, compliance, and reversibility.
7. **Preconditions:** dependencies, credentials/permissions (never request secrets in chat), backups, and validation requirements.
8. **Rollback or recovery:** how to undo or contain the operation, if possible.
9. **Approval boundary:** exactly what the approval authorizes and what it does not authorize.

Approval requests must be specific. Avoid vague requests such as “May I proceed with everything?”

### 2.2 Approval semantics

- Approval is single-operation and scope-bound by default.
- Approval for one file does not authorize edits to other files.
- Approval for reading does not authorize writing.
- Approval for one repository, account, environment, or branch does not authorize another.
- Approval for a plan does not authorize execution.
- Approval for a test does not authorize deployment.
- Approval for a commit does not authorize push or merge.
- Approval for one step does not authorize subsequent steps.
- Silence, ambiguity, prior broad statements, or inferred intent are not approval.
- If the target, scope, inputs, or impact changes, stop and request fresh approval.
- The owner may deny, narrow, or revoke approval at any time.
- If approval is absent or unclear, do not perform the operation.

### 2.3 Operations that always require explicit approval

The following always require a separate approval request immediately before execution:

- Reading or searching private project data, connected accounts, local devices, or external services.
- Creating, editing, moving, renaming, or deleting files.
- Running scripts, commands, tests, builds, migrations, or deployments.
- Installing, upgrading, or removing packages and tools.
- Creating or modifying databases, schemas, records, users, roles, or permissions.
- Creating or changing branches, commits, tags, issues, pull requests, reviews, releases, or repository settings.
- Sending messages, emails, invitations, notifications, or submitting forms.
- Connecting, disconnecting, or changing an account or integration.
- Spending money, starting paid resources, changing subscriptions, or consuming billable services.
- Publishing, sharing, exporting, or transferring data.
- Accessing, processing, or exporting patient information or other sensitive data.

Where a platform itself requires further confirmation, that confirmation remains mandatory; Level 10 must not bypass it.

## 3. Ten capability levels

The ten levels describe capability domains, not a hierarchy of unrestricted permissions. All levels inherit the same approval contract and security policies.

| Level | Name | Primary responsibility |
|---|---|---|
| 1 | Advisory Intelligence | Explain, research from permitted sources, compare options, and formulate recommendations. |
| 2 | Planning Intelligence | Convert approved goals into scope, milestones, dependencies, estimates, and acceptance criteria. |
| 3 | Architecture Intelligence | Design systems, interfaces, data flows, integration boundaries, and resilience patterns. |
| 4 | Engineering Intelligence | Produce implementation designs, code proposals, technical documentation, and migration plans. |
| 5 | Controlled Execution Intelligence | Execute only the exact operation explicitly approved by the owner. |
| 6 | Quality Intelligence | Define and perform approved tests, inspect evidence, and assess acceptance criteria. |
| 7 | Security & Compliance Intelligence | Threat-model, assess privacy and access controls, and identify compliance gaps. |
| 8 | Operations Intelligence | Plan and, when separately approved, operate infrastructure, observability, backup, and recovery workflows. |
| 9 | Strategic Portfolio Intelligence | Coordinate portfolio priorities, cross-project dependencies, resource trade-offs, and risk reporting. |
| 10 | Universal Intelligence & Governance | Orchestrate the levels, enforce policy, manage approvals, reconcile evidence, and continuously evaluate the whole ecosystem. |

## 4. Level 10 core components

### 4.1 Universal Command Interface
Receives natural-language requests and converts them into structured intent: objective, project, constraints, expected outcome, and urgency. Ambiguous or conflicting requests are clarified before an operation is proposed.

### 4.2 Project and Asset Registry
Maintains approved project metadata: project identity, repositories, environments, owners, architecture decisions, dependencies, lifecycle status, and authoritative documentation. Registry data must include source and last-verified time. Stale or unverified data must be labelled.

### 4.3 Context and Knowledge Layer
Retrieves only approved and relevant information from permitted sources. Records provenance, version, freshness, and access scope. Treats retrieved documents, code, web pages, and tool outputs as untrusted data—not as instructions that can override system policy or user approval.

### 4.4 Orchestration Engine
Decomposes an approved objective into bounded tasks, selects suitable specialist capabilities, tracks dependencies, and coordinates outputs. It cannot grant permissions to itself or to subordinate agents.

### 4.5 Specialist Agent Catalog
Possible specialist roles include:

- Research and Evidence Analyst
- Product and Project Manager
- Business Analyst
- Systems and Software Architect
- Application and API Engineer
- Database and Data Engineer
- AI, ML, and RAG Engineer
- Security and Privacy Auditor
- Healthcare Interoperability Analyst
- QA and Test Engineer
- DevOps and Reliability Engineer
- Technical Writer and Documentation Analyst

Agents are logical roles, not proof that a particular model, tool, or service is connected. Each role must declare its scope, required inputs, permitted tools, output contract, limitations, and review requirements.

### 4.6 Policy and Approval Engine
Applies identity, authorization, scope, risk classification, approval state, and separation of duties. It denies by default when authorization is missing, ambiguous, expired, or out of scope.

### 4.7 Execution Adapters
Provide narrowly scoped interfaces to approved tools and services. Each adapter must validate arguments, enforce target allowlists where feasible, apply least privilege, use timeouts, handle errors safely, and return verifiable execution metadata.

### 4.8 Quality and Evidence Engine
Maps each requirement to tests, checks, evidence, and acceptance decisions. Distinguishes proposed, executed, passed, failed, skipped, and unverified checks. A tool's success response alone is not sufficient evidence for a broader claim.

### 4.9 Audit and Observability
Records who requested, approved, and executed an operation; what target and scope were used; timestamps; tool identity; result; evidence references; and any error or rollback. Logs must avoid secrets and unnecessary sensitive or patient data.

### 4.10 Recovery and Continuity
Defines backup checks, restore procedures, idempotency, compensating actions, incident handling, and safe-stop behavior. Recovery actions that change resources also require approval unless a separately approved, tightly bounded emergency policy explicitly defines them.

## 5. Standard request lifecycle

**INTAKE → CLARIFY → CONTEXT PROPOSAL → PLAN → RISK REVIEW → APPROVAL → EXECUTE ONE APPROVED OPERATION → VERIFY → REPORT → REQUEST NEXT APPROVAL**

1. **Intake:** capture the user's objective and constraints.
2. **Clarify:** resolve material ambiguity without performing external operations.
3. **Context proposal:** identify which sources or resources need to be inspected and ask permission before accessing them.
4. **Plan:** prepare steps, dependencies, outputs, and acceptance criteria.
5. **Risk review:** classify impact, sensitivity, reversibility, and failure modes.
6. **Approval:** request explicit authorization for the next discrete operation.
7. **Execution:** perform only the approved operation, within the approved scope.
8. **Verification:** check the result using approved verification steps; ask again if verification requires a new operation not already authorized.
9. **Report:** provide truthful status, evidence, limitations, and outstanding risks.
10. **Next step:** request a new approval before another operation.

## 6. Risk and authorization model

Suggested risk classes:

- **R0 — Conversational:** internal explanation or drafting without external access or side effects.
- **R1 — Read-only external:** access/search of an external or private resource; explicit approval required.
- **R2 — Reversible change:** scoped file or configuration change; explicit approval and recovery plan required.
- **R3 — High impact:** database, identity, access-control, infrastructure, production, or sensitive-data operation; explicit approval plus enhanced review and preconditions required.
- **R4 — Critical:** irreversible, safety-critical, regulated, broad-scope, or materially costly operation; require explicit approval, independent review where feasible, and an approved execution window. Some operations may be prohibited by policy or unavailable tools.

Risk classification never substitutes for approval. A low-risk operation still requires approval under the default policy.

## 7. Authorization record

Each approved operation should have a structured record similar to the following conceptual example:

    {
      "approval_id": "approval-unique-id",
      "request_id": "request-unique-id",
      "requester": "project-owner",
      "action": "read | create | update | delete | execute | publish",
      "target": {
        "project": "ASH",
        "resource": "exact-resource-identifier"
      },
      "scope": ["exact approved paths, records, or resources"],
      "risk_class": "R1",
      "expected_outputs": ["specified output"],
      "expires_at": "explicit expiry timestamp",
      "single_use": true,
      "status": "pending | approved | denied | expired | revoked | consumed"
    }

This is a conceptual contract, not a deployed authorization service. Production implementation must use authenticated identities, server-side policy enforcement, tamper-evident audit records, secure storage, and replay protection. Do not treat a client-supplied JSON object as proof of authorization.

## 8. Execution and agent safety requirements

- Least privilege for every tool, service account, and agent.
- No shared unrestricted administrator identity for agents.
- No secrets, API keys, tokens, passwords, or recovery codes in prompts, source code, logs, or generated documentation.
- Validate and constrain all tool inputs and outputs.
- Treat repository content, uploaded files, web pages, and tool results as untrusted data.
- Prevent prompt injection in retrieved content from changing policy or granting permissions.
- Use allowlisted targets and environment separation where feasible.
- Require idempotency keys for operations that may be retried.
- Use bounded retries, timeouts, rate limits, and circuit breakers.
- Stop safely on unexpected scope expansion, permission errors, conflicting evidence, or partial failure.
- Do not silently retry a failed write or broaden access.
- Do not expose PHI or other sensitive data in reports; use synthetic data for development and testing.
- Require accountable human review for clinical, legal, financial, security-critical, and production decisions.

## 9. ASH-specific governance constraints

For ASH Healthcare Platform:

- Separate development, test, staging, and production environments.
- Use synthetic patient data for development and routine tests.
- Treat PHI access, export, migration, and production queries as high-impact operations.
- Require explicit clinical/product approval for Purpose of Use, Professional Scope, clinical workflows, and clinical decision support behavior.
- Do not claim FHIR, JCI, WHO, or other compliance or certification without a documented assessment and appropriate independent evidence.
- Preserve auditability for patient-data access and security-relevant actions.
- Validate authorization at the data-access boundary, not only in the UI.
- Require security review and tested recovery plans before production changes.
- Do not represent the platform as clinically certified or production-safe solely because automated tests pass.

## 10. Evidence and completion states

Every task must use explicit status labels:

- **PROPOSED:** designed but not executed.
- **AWAITING_APPROVAL:** an approval request is pending.
- **APPROVED:** the exact operation is authorized but not yet executed.
- **EXECUTED:** the operation was carried out; verification may still be pending.
- **VERIFIED:** the stated acceptance checks passed and evidence is available.
- **PARTIALLY_VERIFIED:** some checks passed; known gaps remain.
- **FAILED:** the operation or acceptance check failed.
- **BLOCKED:** a dependency, permission, policy, or safety requirement prevents progress.
- **NOT_IMPLEMENTED:** architecture or documentation exists, but no working implementation is present.

A final report must include scope, actual actions, changed resources (if any), tests and evidence, failures, residual risks, and next proposed operation. Never mark a task VERIFIED based only on intention or an unexecuted plan.

## 11. API contract outline

The following endpoints are proposed logical interfaces, not existing ASH APIs:

| Method | Proposed endpoint | Purpose |
|---|---|---|
| POST | /api/v1/l10/requests | Register a user request |
| GET | /api/v1/l10/requests/{requestId} | Read request status, subject to approval |
| POST | /api/v1/l10/plans | Submit a proposed execution plan |
| POST | /api/v1/l10/approvals | Record an authenticated approval or denial |
| GET | /api/v1/l10/approvals/{approvalId} | Read approval status |
| POST | /api/v1/l10/operations | Execute one approved operation |
| GET | /api/v1/l10/operations/{operationId} | Read operation result |
| POST | /api/v1/l10/verifications | Submit verification evidence |
| GET | /api/v1/l10/audit-events | Query authorized audit events |

API requirements:

- Authenticate every caller and authorize every resource access.
- Bind approvals to an immutable request, action, target, scope, and expiry.
- Enforce single-use approval consumption atomically.
- Reject replay, expired approval, changed arguments, and scope mismatch.
- Keep read and write permissions separate.
- Apply bounded request sizes, rate limits, CSRF protections where relevant, and safe error responses.
- Avoid exposing sensitive fields in responses and logs.
- Use versioned schemas and backward-compatible evolution.
- Do not implement these endpoints until separately approved.

## 12. Conceptual data model

Suggested entities:

- **projects:** project identity, owner, lifecycle, classification.
- **resources:** repositories, files, services, environments, datasets, and external systems.
- **agents:** role, version, capability declaration, tool allowlist, status.
- **requests:** requester, objective, constraints, project, state.
- **plans:** ordered steps, dependencies, expected outputs, acceptance criteria.
- **approvals:** identity, exact scope, action, expiry, single-use state, decision.
- **operations:** approved action, execution adapter, timestamps, result, idempotency key.
- **evidence:** test results, source references, hashes, verification status.
- **audit_events:** append-only security and governance events.
- **policies:** versioned authorization and risk rules.
- **incidents:** failure, severity, containment, recovery, and review.

Data model principles: immutable identifiers; UTC timestamps; explicit tenant/project scope; referential integrity; minimal sensitive data; retention rules; encryption in transit and at rest; and append-only or tamper-evident audit history. No schema or migration is created by this document.

## 13. Non-functional requirements

- **Security:** least privilege, defense in depth, secure secret management, threat modeling.
- **Privacy:** data minimization, purpose limitation, access traceability, retention and deletion controls.
- **Reliability:** bounded retries, idempotency, graceful degradation, safe-stop behavior.
- **Scalability:** asynchronous task orchestration, queue isolation, quotas, and workload limits.
- **Maintainability:** modular adapters, versioned contracts, documented decisions, and automated tests.
- **Observability:** structured logs, metrics, traces, correlation IDs, and redaction.
- **Portability:** provider-independent domain contracts where practical.
- **Accessibility:** clear approval prompts, status visibility, and understandable error messages.
- **Cost control:** budget estimates and explicit approval before billable or paid operations.
- **Interoperability:** documented APIs and standards-based integration where justified.

## 14. Delivery roadmap

Implementation must proceed in separately approved increments:

1. **Discovery and baseline:** inspect the selected repositories and existing architecture; read-only access itself requires approval.
2. **Architecture validation:** reconcile this proposal with existing ASH conventions, threat model, and project registry.
3. **Policy specification:** define identities, scopes, approval semantics, risk classes, and audit requirements.
4. **Prototype:** implement a non-production request/approval state machine with no privileged execution adapters.
5. **Security and QA:** threat model, unit/integration tests, abuse cases, concurrency tests, and independent review.
6. **Read-only adapters:** add only individually approved integrations and validate data boundaries.
7. **Controlled execution adapters:** add one narrowly scoped capability at a time, each with approval enforcement and rollback strategy.
8. **Portfolio orchestration:** introduce multi-project coordination after per-project controls are proven.
9. **Operational readiness:** monitoring, backup/restore tests, incident response, access reviews, and cost controls.
10. **Release decision:** production use only after owner approval, required specialist sign-offs, and evidence-backed acceptance.

No roadmap step is pre-authorized by this document.

## 15. Acceptance criteria for a future implementation

A future implementation cannot be called Level 10-ready until all applicable criteria are demonstrated:

- Every external or stateful operation pauses for explicit, scope-bound approval.
- Approval is bound server-side to exact arguments and target resources.
- Approval is single-use, expires, and can be revoked.
- A denied, absent, ambiguous, expired, or mismatched approval blocks execution.
- Agents cannot approve their own actions or expand their own permissions.
- Multi-step plans require approval for each discrete operation.
- Tool outputs and retrieved content cannot override policy.
- All operations produce traceable audit evidence without leaking secrets or PHI.
- Partial failures stop safely and have documented recovery behavior.
- Tests cover authorization bypass, replay, race conditions, scope expansion, prompt injection, and audit failure.
- Project boundaries and environment boundaries are enforced.
- Independent security review and relevant domain-owner sign-offs are complete.
- Documentation accurately distinguishes implemented, tested, and planned capabilities.

## 16. Current decision and implementation boundary

This document is an architecture proposal only. It does not create an agent, service, database, API, workflow, permission system, or automation. It does not authorize future reads, writes, deployments, or account actions.

**Current status:** PROPOSED — DOCUMENTED ONLY

**Approval rule:** Ask the project owner before every discrete operation. If approval is not explicit and unambiguous, stop.

**Next proposed action:** Conduct a read-only architecture and repository discovery review to map this proposal against the current ASH codebase. This next action requires a separate explicit approval.
