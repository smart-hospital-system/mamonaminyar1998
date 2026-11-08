import assert from "node:assert/strict";
import test from "node:test";
import {
  createTableRelationsHelpers,
  extractTablesRelationalConfig,
  is,
  SQL,
} from "drizzle-orm";
import { getTableConfig, PgDialect, PgTable } from "drizzle-orm/pg-core";
import * as schema from "../../src/db/schema/index";
import {
  accountRequests,
  approvalDecisions,
  approvalRequests,
  auditLogs,
  auditRetentionPolicies,
  authSessions,
  departments,
  emergencyAccessGrants,
  loginAttempts,
  passwordResetRequests,
  permissions,
  roleGrantRules,
  rolePermissions,
  roles,
  securityAlerts,
  staff,
  staffDepartments,
  userRoles,
  users,
} from "../../src/db/schema/index";

const coreTables = [
  departments,
  staff,
  staffDepartments,
  users,
  accountRequests,
  authSessions,
  loginAttempts,
  passwordResetRequests,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  roleGrantRules,
  approvalRequests,
  approvalDecisions,
  emergencyAccessGrants,
  auditLogs,
  securityAlerts,
  auditRetentionPolicies,
] as const;

const expectedColumns: Record<string, string[]> = {
  "app.departments": ["id", "code", "name", "description", "is_active", "created_at", "updated_at"],
  "app.staff": [
    "id", "staff_number", "first_name", "last_name", "job_title", "phone", "employment_status",
    "hired_at", "terminated_at", "created_at", "updated_at",
  ],
  "app.staff_departments": [
    "id", "staff_id", "department_id", "assignment_type", "start_date", "end_date", "assigned_by",
    "created_at",
  ],
  "security.users": [
    "id", "staff_id", "username", "password_hash", "account_status", "mfa_enabled", "mfa_method",
    "failed_login_count", "locked_until", "password_changed_at", "last_login_at", "created_at",
    "updated_at",
  ],
  "security.account_requests": [
    "id", "staff_id", "requested_username", "requested_by_user_id", "status",
    "reviewed_by_user_id", "review_reason", "reviewed_at", "created_at",
  ],
  "security.auth_sessions": [
    "id", "user_id", "token_hash", "created_at", "expires_at", "revoked_at", "revoke_reason",
    "last_activity_at",
  ],
  "security.login_attempts": [
    "id", "user_id", "username_submitted", "attempted_at", "success", "source_identifier_hash",
  ],
  "security.password_reset_requests": [
    "id", "user_id", "requested_by_user_id", "reset_token_hash", "status", "expires_at",
    "completed_at", "created_at",
  ],
  "security.roles": [
    "id", "code", "name", "description", "is_system_role", "is_active", "created_at",
  ],
  "security.permissions": ["id", "code", "name", "module", "description", "created_at"],
  "security.role_permissions": ["id", "role_id", "permission_id", "created_at"],
  "security.user_roles": [
    "id", "user_id", "role_id", "scope_type", "department_id", "assigned_by_user_id",
    "assigned_at", "expires_at", "revoked_at",
  ],
  "security.role_grant_rules": [
    "id", "grantor_role_id", "target_role_id", "scope_type", "is_allowed", "created_at",
  ],
  "security.approval_requests": [
    "id", "request_type", "requested_by_user_id", "target_reference", "request_payload",
    "payload_hash", "status", "expires_at", "created_at", "executed_at", "execution_reference",
  ],
  "security.approval_decisions": [
    "id", "approval_request_id", "approver_user_id", "decision", "reason", "decided_at",
  ],
  "security.emergency_access_grants": [
    "id", "user_id", "requested_by_user_id", "reason", "granted_permissions", "started_at",
    "expires_at", "revoked_at", "reviewed_by_user_id", "reviewed_at", "review_notes",
  ],
  "security.audit_logs": [
    "id", "event_id", "actor_user_id", "action", "resource_type", "resource_id", "department_id",
    "before_data", "after_data", "outcome", "source_identifier_hash", "correlation_id", "created_at",
  ],
  "security.security_alerts": [
    "id", "alert_type", "severity", "user_id", "description", "related_event_id", "status",
    "created_at", "resolved_at", "resolved_by_user_id",
  ],
  "security.audit_retention_policies": [
    "id", "record_type", "retention_years", "legal_basis", "is_active", "approved_by_user_id",
    "created_at",
  ],
};

const configs = new Map<string, ReturnType<typeof getTableConfig>>(
  coreTables.map((table) => {
    const config = getTableConfig(table);
    return [`${config.schema}.${config.name}`, config] as const;
  }),
);
const dialect = new PgDialect();

function configFor(qualifiedName: string) {
  const config = configs.get(qualifiedName);
  assert.ok(config, `missing table: ${qualifiedName}`);
  return config;
}

function columnFor(qualifiedName: string, columnName: string) {
  const column = configFor(qualifiedName).columns.find((candidate) => candidate.name === columnName);
  assert.ok(column, `missing column: ${qualifiedName}.${columnName}`);
  return column;
}

function indexFor(qualifiedName: string, indexName: string) {
  const index = configFor(qualifiedName).indexes.find((candidate) => candidate.config.name === indexName);
  assert.ok(index, `missing index: ${indexName}`);
  return index;
}

function indexColumnNames(qualifiedName: string, indexName: string) {
  return indexFor(qualifiedName, indexName).config.columns.map((column) => {
    assert.ok("name" in column && typeof column.name === "string", `${indexName} must use plain columns`);
    return column.name;
  });
}

function sqlText(value: SQL | undefined) {
  assert.ok(value, "expected a SQL expression");
  return dialect.sqlToQuery(value).sql.replace(/\s+/g, " ").trim();
}

function checkText(qualifiedName: string, checkName: string) {
  const check = configFor(qualifiedName).checks.find((candidate) => candidate.name === checkName);
  assert.ok(check, `missing check: ${checkName}`);
  return sqlText(check.value);
}

test("v4 exports exactly nineteen tables in app/security with the approved columns", () => {
  const exportedNames = Object.values(schema)
    .filter((value) => is(value, PgTable))
    .map((table) => {
      const config = getTableConfig(table);
      return `${config.schema}.${config.name}`;
    })
    .sort();

  assert.deepEqual(exportedNames, Object.keys(expectedColumns).sort());
  for (const [qualifiedName, columns] of Object.entries(expectedColumns)) {
    const config = configFor(qualifiedName);
    assert.ok(["app", "security"].includes(config.schema ?? ""));
    assert.deepEqual(config.columns.map((column) => column.name), columns);
  }
  assert.equal(columnFor("app.departments", "description").columnType, "PgText");
});

test("all tables have generated UUID primary keys and sensitive FKs restrict deletion", () => {
  const expectedForeignKeyCounts: Record<string, number> = {
    "app.departments": 0,
    "app.staff": 0,
    "app.staff_departments": 3,
    "security.users": 1,
    "security.account_requests": 3,
    "security.auth_sessions": 1,
    "security.login_attempts": 1,
    "security.password_reset_requests": 2,
    "security.roles": 0,
    "security.permissions": 0,
    "security.role_permissions": 2,
    "security.user_roles": 4,
    "security.role_grant_rules": 2,
    "security.approval_requests": 1,
    "security.approval_decisions": 2,
    "security.emergency_access_grants": 3,
    "security.audit_logs": 2,
    "security.security_alerts": 2,
    "security.audit_retention_policies": 1,
  };

  for (const [qualifiedName, config] of configs) {
    const id = columnFor(qualifiedName, "id");
    assert.equal(id.columnType, "PgUUID");
    assert.equal(id.primary, true);
    assert.equal(id.notNull, true);
    assert.equal(id.hasDefault, true);
    assert.equal(config.foreignKeys.length, expectedForeignKeyCounts[qualifiedName]);

    for (const foreignKey of config.foreignKeys) {
      assert.equal(foreignKey.onDelete, "restrict", `${qualifiedName} must protect history`);
    }
  }
});

test("staff has no department_id and uses the v4 staff_number identity", () => {
  const staffColumns = configFor("app.staff").columns.map((column) => column.name);
  assert.equal(staffColumns.includes("department_id"), false);
  assert.equal(staffColumns.includes("employee_number"), false);
  assert.equal("departmentId" in staff, false);
  assert.equal(columnFor("app.staff", "staff_number").notNull, true);
  assert.equal(columnFor("app.staff", "staff_number").isUnique, true);

  for (const status of schema.EMPLOYMENT_STATUSES) {
    assert.match(checkText("app.staff", "staff_employment_status_check"), new RegExp(`'${status}'`));
  }
  assert.match(checkText("app.staff", "staff_employment_period_check"), /terminated_at.*>=.*hired_at/);
});

test("staff_departments enforces assignment type, dates and one active primary", () => {
  assert.equal(columnFor("app.staff_departments", "staff_id").notNull, true);
  assert.equal(columnFor("app.staff_departments", "department_id").notNull, true);
  assert.equal(columnFor("app.staff_departments", "assigned_by").notNull, true);
  assert.equal(columnFor("app.staff_departments", "start_date").columnType, "PgDateString");
  assert.equal(columnFor("app.staff_departments", "end_date").columnType, "PgDateString");

  for (const type of schema.DEPARTMENT_ASSIGNMENT_TYPES) {
    assert.match(
      checkText("app.staff_departments", "staff_departments_assignment_type_check"),
      new RegExp(`'${type}'`),
    );
  }
  assert.match(checkText("app.staff_departments", "staff_departments_period_check"), /end_date.*>=.*start_date/);

  const primary = indexFor("app.staff_departments", "staff_departments_one_active_primary_unique");
  assert.equal(primary.config.unique, true);
  assert.deepEqual(indexColumnNames("app.staff_departments", "staff_departments_one_active_primary_unique"), ["staff_id"]);
  assert.equal(
    sqlText(primary.config.where),
    '"app"."staff_departments"."assignment_type" = \'PRIMARY\' and "app"."staff_departments"."end_date" is null',
  );

  const membership = indexFor("app.staff_departments", "staff_departments_open_membership_unique");
  assert.equal(membership.config.unique, true);
  assert.equal(sqlText(membership.config.where), '"app"."staff_departments"."end_date" is null');
});

test("accounts are disabled by omission and enforce MFA/login counter invariants", () => {
  assert.equal(columnFor("security.users", "staff_id").isUnique, true);
  assert.equal(columnFor("security.users", "staff_id").notNull, true);
  assert.equal(columnFor("security.users", "username").isUnique, true);
  assert.equal(columnFor("security.users", "password_hash").notNull, true);
  assert.equal(columnFor("security.users", "account_status").default, "DISABLED");
  assert.equal(columnFor("security.users", "mfa_enabled").default, false);
  assert.equal(columnFor("security.users", "failed_login_count").default, 0);

  for (const status of schema.ACCOUNT_STATUSES) {
    assert.match(checkText("security.users", "users_account_status_check"), new RegExp(`'${status}'`));
  }
  assert.match(checkText("security.users", "users_failed_login_count_check"), />= 0/);
  assert.match(checkText("security.users", "users_mfa_method_check"), /mfa_enabled.*mfa_method/);
});

test("account requests implement every status and prohibit self-review in SQL", () => {
  assert.equal(columnFor("security.account_requests", "status").default, "PENDING");
  for (const status of schema.ACCOUNT_REQUEST_STATUSES) {
    assert.match(checkText("security.account_requests", "account_requests_status_check"), new RegExp(`'${status}'`));
  }
  assert.match(
    checkText("security.account_requests", "account_requests_no_self_review_check"),
    /reviewed_by_user_id.*<>.*requested_by_user_id/,
  );
  assert.match(
    checkText("security.account_requests", "account_requests_reviewed_at_check"),
    /reviewed_at.*>=.*created_at/,
  );
});

test("sessions store hashes only and have an absolute 24-hour lifetime", () => {
  assert.equal(columnFor("security.auth_sessions", "token_hash").isUnique, true);
  assert.equal(columnFor("security.auth_sessions", "last_activity_at").notNull, true);
  assert.equal(
    checkText("security.auth_sessions", "auth_sessions_absolute_24h_check"),
    '"security"."auth_sessions"."expires_at" = "security"."auth_sessions"."created_at" + interval \'24 hours\'',
  );
  assert.match(checkText("security.auth_sessions", "auth_sessions_revocation_check"), /revoked_at.*>=.*created_at/);
  assert.deepEqual(indexColumnNames("security.auth_sessions", "auth_sessions_user_expires_idx"), ["user_id", "expires_at"]);
});

test("login attempts and password resets retain no raw source or token", () => {
  assert.equal(columnFor("security.login_attempts", "success").columnType, "PgBoolean");
  assert.equal(columnFor("security.login_attempts", "success").notNull, true);
  assert.deepEqual(indexColumnNames("security.login_attempts", "login_attempts_user_attempted_idx"), ["user_id", "attempted_at"]);
  assert.equal(columnFor("security.password_reset_requests", "reset_token_hash").isUnique, true);
  assert.equal(columnFor("security.password_reset_requests", "reset_token_hash").notNull, false);

  for (const status of schema.PASSWORD_RESET_REQUEST_STATUSES) {
    assert.match(
      checkText("security.password_reset_requests", "password_reset_requests_status_check"),
      new RegExp(`'${status}'`),
    );
  }

  const forbiddenColumns = new Set([
    "password", "raw_password", "token", "raw_token", "session_secret", "ip_address", "user_agent",
  ]);
  for (const [qualifiedName, config] of configs) {
    for (const column of config.columns) {
      assert.equal(forbiddenColumns.has(column.name), false, `${qualifiedName}.${column.name}`);
    }
  }
});

test("RBAC preserves the eleven role codes and unique role-permission pairs", () => {
  assert.equal(schema.SYSTEM_ROLE_CODES.length, 11);
  assert.deepEqual(schema.SYSTEM_ROLE_CODES, [
    "SYSTEM_ADMIN", "GENERAL_ADMIN", "DEPARTMENT_MANAGER", "DOCTOR", "NURSE", "MIDWIFE",
    "LAB_STAFF", "RADIOLOGY_STAFF", "PHARMACY_MANAGER", "ACCOUNTANT", "RECEPTIONIST",
  ]);
  assert.equal(columnFor("security.roles", "code").isUnique, true);
  assert.equal(columnFor("security.permissions", "code").isUnique, true);

  const unique = configFor("security.role_permissions").uniqueConstraints.find(
    (candidate) => candidate.name === "role_permissions_role_permission_unique",
  );
  assert.ok(unique);
  assert.deepEqual(unique.columns.map((column) => column.name), ["role_id", "permission_id"]);
});

test("user role scope, self-grant denial and GLOBAL NULL uniqueness are structural", () => {
  const scope = checkText("security.user_roles", "user_roles_scope_department_check");
  assert.match(scope, /GLOBAL.*department_id.*is null/);
  assert.match(scope, /DEPARTMENT.*department_id.*is not null/);
  assert.match(checkText("security.user_roles", "user_roles_no_self_grant_check"), /user_id.*<>.*assigned_by_user_id/);
  assert.match(checkText("security.user_roles", "user_roles_expiration_check"), /expires_at.*>.*assigned_at/);

  const unique = indexFor("security.user_roles", "user_roles_one_unrevoked_assignment_unique");
  assert.equal(unique.config.unique, true);
  assert.equal(unique.config.columns.length, 4);
  assert.equal(sqlText(unique.config.where), '"security"."user_roles"."revoked_at" is null');
  const globalExpression = unique.config.columns[3];
  assert.ok(globalExpression instanceof SQL);
  assert.match(sqlText(globalExpression), /coalesce.*00000000-0000-0000-0000-000000000000/);
});

test("role grant rules have a unique grantor/target/scope policy", () => {
  const unique = configFor("security.role_grant_rules").uniqueConstraints.find(
    (candidate) => candidate.name === "role_grant_rules_grantor_target_scope_unique",
  );
  assert.ok(unique);
  assert.deepEqual(unique.columns.map((column) => column.name), [
    "grantor_role_id", "target_role_id", "scope_type",
  ]);
  assert.equal(columnFor("security.role_grant_rules", "is_allowed").notNull, true);
  for (const scope of schema.ROLE_SCOPE_TYPES) {
    assert.match(checkText("security.role_grant_rules", "role_grant_rules_scope_type_check"), new RegExp(`'${scope}'`));
  }
});

test("approval requests and one-decision records preserve payload and execution metadata", () => {
  assert.equal(columnFor("security.approval_requests", "request_payload").columnType, "PgJsonb");
  assert.equal(columnFor("security.approval_requests", "request_payload").notNull, true);
  assert.equal(columnFor("security.approval_requests", "payload_hash").notNull, true);
  assert.equal(columnFor("security.approval_requests", "expires_at").notNull, true);
  assert.deepEqual(indexColumnNames("security.approval_requests", "approval_requests_status_expires_idx"), ["status", "expires_at"]);

  for (const status of schema.APPROVAL_REQUEST_STATUSES) {
    assert.match(checkText("security.approval_requests", "approval_requests_status_check"), new RegExp(`'${status}'`));
  }
  assert.equal(columnFor("security.approval_decisions", "approval_request_id").isUnique, true);
  for (const decision of schema.APPROVAL_DECISIONS) {
    assert.match(checkText("security.approval_decisions", "approval_decisions_decision_check"), new RegExp(`'${decision}'`));
  }
});

test("emergency access is time bounded and reviewed without deleting history", () => {
  assert.equal(columnFor("security.emergency_access_grants", "granted_permissions").columnType, "PgJsonb");
  assert.equal(columnFor("security.emergency_access_grants", "granted_permissions").notNull, true);
  assert.equal(columnFor("security.emergency_access_grants", "reason").notNull, true);
  assert.match(checkText("security.emergency_access_grants", "emergency_access_grants_expiration_check"), /expires_at.*>.*started_at/);
  assert.match(checkText("security.emergency_access_grants", "emergency_access_grants_revocation_check"), /revoked_at.*>=.*started_at/);
  assert.match(checkText("security.emergency_access_grants", "emergency_access_grants_review_check"), /reviewed_at.*>=.*started_at/);
});

test("audit logs have an independent event ID, correlation ID and required indexes", () => {
  assert.equal(columnFor("security.audit_logs", "event_id").isUnique, true);
  assert.equal(columnFor("security.audit_logs", "event_id").notNull, true);
  assert.equal(columnFor("security.audit_logs", "correlation_id").notNull, true);
  assert.equal(columnFor("security.audit_logs", "actor_user_id").notNull, false);
  assert.equal(columnFor("security.audit_logs", "before_data").columnType, "PgJsonb");
  assert.equal(columnFor("security.audit_logs", "after_data").columnType, "PgJsonb");
  assert.equal(columnFor("security.audit_logs", "resource_id").columnType, "PgUUID");
  assert.deepEqual(indexColumnNames("security.audit_logs", "audit_logs_created_at_idx"), ["created_at"]);
  assert.deepEqual(indexColumnNames("security.audit_logs", "audit_logs_actor_created_idx"), ["actor_user_id", "created_at"]);
  assert.deepEqual(indexColumnNames("security.audit_logs", "audit_logs_resource_created_idx"), ["resource_type", "resource_id", "created_at"]);

  for (const outcome of schema.AUDIT_OUTCOMES) {
    assert.match(checkText("security.audit_logs", "audit_logs_outcome_check"), new RegExp(`'${outcome}'`));
  }
});

test("security alerts and retention policies fail closed and retain five-year audit minimum", () => {
  assert.equal(columnFor("security.security_alerts", "status").default, "OPEN");
  for (const severity of schema.SECURITY_ALERT_SEVERITIES) {
    assert.match(checkText("security.security_alerts", "security_alerts_severity_check"), new RegExp(`'${severity}'`));
  }
  for (const status of schema.SECURITY_ALERT_STATUSES) {
    assert.match(checkText("security.security_alerts", "security_alerts_status_check"), new RegExp(`'${status}'`));
  }
  assert.deepEqual(indexColumnNames("security.security_alerts", "security_alerts_status_created_idx"), ["status", "created_at"]);

  // related_event_id is intentionally a historical reference, not a cascading FK.
  const alertReferencedTables = configFor("security.security_alerts").foreignKeys.map(
    (foreignKey) => getTableConfig(foreignKey.reference().foreignTable).name,
  );
  assert.equal(alertReferencedTables.includes("audit_logs"), false);
  assert.equal(columnFor("security.audit_retention_policies", "is_active").default, false);
  assert.match(checkText("security.audit_retention_policies", "audit_retention_policies_years_check"), /> 0/);
  assert.match(checkText("security.audit_retention_policies", "audit_retention_policies_audit_minimum_check"), /retention_years.*>= 5/);
});

test("all operational timestamps use TIMESTAMPTZ and all assignment dates use DATE", () => {
  for (const [qualifiedName, config] of configs) {
    for (const column of config.columns) {
      if (!column.name.endsWith("_at") || ["hired_at", "terminated_at"].includes(column.name)) continue;
      assert.equal(column.columnType, "PgTimestamp", `${qualifiedName}.${column.name}`);
      assert.ok("withTimezone" in column, `${qualifiedName}.${column.name} lacks timezone metadata`);
      assert.equal(column.withTimezone, true, `${qualifiedName}.${column.name} must include timezone`);
    }
  }
  for (const name of ["start_date", "end_date"]) {
    assert.equal(columnFor("app.staff_departments", name).columnType, "PgDateString");
  }
  assert.equal(columnFor("app.staff", "hired_at").columnType, "PgDateString");
  assert.equal(columnFor("app.staff", "terminated_at").columnType, "PgDateString");
});

test("Drizzle relations resolve all nineteen tables and cross-namespace references", () => {
  const relational = extractTablesRelationalConfig(schema, createTableRelationsHelpers);
  assert.equal(Object.keys(relational.tables).length, 19);
  assert.equal(relational.tables.staffDepartments.relations.staff.referencedTableName, "staff");
  assert.equal(relational.tables.staffDepartments.relations.department.referencedTableName, "departments");
  assert.ok(relational.tables.staff.relations.departmentAssignments);
  assert.ok(relational.tables.staffDepartments.relations.assigner);
  assert.equal(relational.tables.users.relations.staff.referencedTableName, "staff");
  assert.ok(relational.tables.accountRequests.relations.requester);
  assert.ok(relational.tables.accountRequests.relations.reviewer);
  assert.ok(relational.tables.roleGrantRules.relations.grantorRole);
  assert.ok(relational.tables.roleGrantRules.relations.targetRole);
  assert.ok(relational.tables.approvalRequests.relations.decision);
  assert.ok(relational.tables.approvalDecisions.relations.approver);
  assert.ok(relational.tables.emergencyAccessGrants.relations.reviewer);
  assert.equal(relational.tables.securityAlerts.relations.relatedEvent.referencedTableName, "audit_logs");
});
