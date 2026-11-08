# ASH Healthcare Platform – Database Migration Draft

Status: REVIEW DRAFT ONLY. These migrations have NOT been applied to any database.

## Important scope

This package contains PostgreSQL DDL draft migrations and a Drizzle Kit journal for review. It does not include runtime authorization services, password hashing code, MFA enrollment, session middleware, approval execution logic, backup automation, or complete permission seeds. Database constraints alone cannot enforce all authorization rules.

## Files

- `drizzle/0000_core_schemas.sql`: schemas and organizational entities
- `drizzle/0001_identity_accounts.sql`: users, account requests, sessions and login records
- `drizzle/0002_rbac.sql`: roles, permissions and scoped role assignments
- `drizzle/0003_approvals_emergency_audit.sql`: dual approval, emergency access, audit and alert tables
- `drizzle/0004_security_controls.sql`: append-only and immutable-payload triggers
- `drizzle/meta/_journal.json`: Drizzle migration journal draft

## Before integration

1. Confirm the installed `drizzle-kit` version and journal compatibility.
2. Review all SQL with the project owner and a PostgreSQL engineer.
3. Add the complete permission catalog and initial role-permission matrix.
4. Implement server-side checks for department membership, role grant authority, approval execution and emergency expiry.
5. Decide exact role permissions and financial thresholds.
6. Define database roles/ownership and least-privilege grants. Do not run the application as the database owner.
7. Design and test encrypted secondary backups and restore procedures.
8. Confirm applicable legal retention and deletion requirements.

## Known review items

- `CREATE EXTENSION pgcrypto` may require database-owner privileges; confirm deployment policy.
- `staff_departments` partial unique index guarantees one open-ended PRIMARY assignment, but overlapping historical date ranges still require application validation or an exclusion constraint.
- The five-minute lockout after five failed attempts is application logic; the schema stores counters and lock timestamps but does not implement the policy by itself.
- Password minimum length, weak-password blocklist, Argon2id parameters and MFA are application-level controls, not SQL constraints.
- Session lifetime of 24 hours must be enforced by session-creation and validation services.
- `audit_logs` trigger blocks UPDATE/DELETE through ordinary SQL, but a database owner/superuser can bypass or disable it. External append-only storage or immutable backups are needed for stronger tamper resistance.
- `approval_requests` protects selected payload fields from UPDATE, but status transitions and execution authorization must be implemented in a transaction in the application layer.
- `security_alerts.related_event_id` is intentionally not a foreign key because audit IDs use a bigint identity while `event_id` is UUID; add a proper FK to `security.audit_logs(event_id)` in a reviewed follow-up if desired.
- `approval_decisions` enforces at most one decision per request. It does not itself enforce that the approver is authorized or different from the requester; the application transaction must enforce that.
- A retention policy row is configuration metadata only. No automatic purge job is included.

## Safety

Do not run `drizzle-kit migrate`, `drizzle-kit push`, `psql -f`, or any equivalent against the hospital database before explicit execution approval. This draft has not been applied or integration-tested.
