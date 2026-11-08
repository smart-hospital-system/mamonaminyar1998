import { relations } from "drizzle-orm";
import { accountRequests } from "./account-requests";
import { approvalDecisions } from "./approval-decisions";
import { approvalRequests } from "./approval-requests";
import { auditLogs } from "./audit-logs";
import { auditRetentionPolicies } from "./audit-retention-policies";
import { authSessions } from "./auth-sessions";
import { departments } from "./departments";
import { emergencyAccessGrants } from "./emergency-access-grants";
import { loginAttempts } from "./login-attempts";
import { passwordResetRequests } from "./password-reset-requests";
import { permissions } from "./permissions";
import { roleGrantRules } from "./role-grant-rules";
import { rolePermissions } from "./role-permissions";
import { roles } from "./roles";
import { securityAlerts } from "./security-alerts";
import { staffDepartments } from "./staff-departments";
import { staff } from "./staff";
import { userRoles } from "./user-roles";
import { users } from "./users";

export const departmentsRelations = relations(departments, ({ many }) => ({
  staffAssignments: many(staffDepartments),
  scopedUserRoles: many(userRoles),
  auditLogs: many(auditLogs),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  account: one(users),
  departmentAssignments: many(staffDepartments),
  assignedDepartmentAssignments: many(staffDepartments, {
    relationName: "staff_assignment_assigned_by",
  }),
  accountRequests: many(accountRequests),
}));

export const staffDepartmentsRelations = relations(staffDepartments, ({ one }) => ({
  staff: one(staff, {
    fields: [staffDepartments.staffId],
    references: [staff.id],
  }),
  department: one(departments, {
    fields: [staffDepartments.departmentId],
    references: [departments.id],
  }),
  assigner: one(staff, {
    fields: [staffDepartments.assignedBy],
    references: [staff.id],
    relationName: "staff_assignment_assigned_by",
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  staff: one(staff, { fields: [users.staffId], references: [staff.id] }),
  sessions: many(authSessions),
  loginAttempts: many(loginAttempts),
  passwordResetRequests: many(passwordResetRequests),
  requestedPasswordResets: many(passwordResetRequests, {
    relationName: "password_reset_requested_by",
  }),
  requestedAccountRequests: many(accountRequests, {
    relationName: "account_requests_requested_by",
  }),
  reviewedAccountRequests: many(accountRequests, {
    relationName: "account_requests_reviewed_by",
  }),
  roles: many(userRoles),
  assignedUserRoles: many(userRoles, { relationName: "user_roles_assigned_by" }),
  approvalRequests: many(approvalRequests),
  approvalDecisions: many(approvalDecisions),
  emergencyAccessGrants: many(emergencyAccessGrants),
  requestedEmergencyGrants: many(emergencyAccessGrants, {
    relationName: "emergency_access_requested_by",
  }),
  reviewedEmergencyGrants: many(emergencyAccessGrants, {
    relationName: "emergency_access_reviewed_by",
  }),
  auditLogs: many(auditLogs),
  securityAlerts: many(securityAlerts),
  resolvedSecurityAlerts: many(securityAlerts, { relationName: "security_alert_resolved_by" }),
  approvedRetentionPolicies: many(auditRetentionPolicies),
}));

export const accountRequestsRelations = relations(accountRequests, ({ one }) => ({
  staff: one(staff, { fields: [accountRequests.staffId], references: [staff.id] }),
  requester: one(users, {
    fields: [accountRequests.requestedByUserId],
    references: [users.id],
    relationName: "account_requests_requested_by",
  }),
  reviewer: one(users, {
    fields: [accountRequests.reviewedByUserId],
    references: [users.id],
    relationName: "account_requests_reviewed_by",
  }),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
}));

export const loginAttemptsRelations = relations(loginAttempts, ({ one }) => ({
  user: one(users, { fields: [loginAttempts.userId], references: [users.id] }),
}));

export const passwordResetRequestsRelations = relations(passwordResetRequests, ({ one }) => ({
  user: one(users, { fields: [passwordResetRequests.userId], references: [users.id] }),
  requester: one(users, {
    fields: [passwordResetRequests.requestedByUserId],
    references: [users.id],
    relationName: "password_reset_requested_by",
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
  grantorRules: many(roleGrantRules, { relationName: "role_grant_grantor" }),
  targetRules: many(roleGrantRules, { relationName: "role_grant_target" }),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
  department: one(departments, {
    fields: [userRoles.departmentId],
    references: [departments.id],
  }),
  assigner: one(users, {
    fields: [userRoles.assignedByUserId],
    references: [users.id],
    relationName: "user_roles_assigned_by",
  }),
}));

export const roleGrantRulesRelations = relations(roleGrantRules, ({ one }) => ({
  grantorRole: one(roles, {
    fields: [roleGrantRules.grantorRoleId],
    references: [roles.id],
    relationName: "role_grant_grantor",
  }),
  targetRole: one(roles, {
    fields: [roleGrantRules.targetRoleId],
    references: [roles.id],
    relationName: "role_grant_target",
  }),
}));

export const approvalRequestsRelations = relations(approvalRequests, ({ one }) => ({
  requester: one(users, {
    fields: [approvalRequests.requestedByUserId],
    references: [users.id],
  }),
  decision: one(approvalDecisions),
}));

export const approvalDecisionsRelations = relations(approvalDecisions, ({ one }) => ({
  request: one(approvalRequests, {
    fields: [approvalDecisions.approvalRequestId],
    references: [approvalRequests.id],
  }),
  approver: one(users, {
    fields: [approvalDecisions.approverUserId],
    references: [users.id],
  }),
}));

export const emergencyAccessGrantsRelations = relations(emergencyAccessGrants, ({ one }) => ({
  user: one(users, { fields: [emergencyAccessGrants.userId], references: [users.id] }),
  requester: one(users, {
    fields: [emergencyAccessGrants.requestedByUserId],
    references: [users.id],
    relationName: "emergency_access_requested_by",
  }),
  reviewer: one(users, {
    fields: [emergencyAccessGrants.reviewedByUserId],
    references: [users.id],
    relationName: "emergency_access_reviewed_by",
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one, many }) => ({
  actor: one(users, { fields: [auditLogs.actorUserId], references: [users.id] }),
  department: one(departments, {
    fields: [auditLogs.departmentId],
    references: [departments.id],
  }),
  securityAlerts: many(securityAlerts),
}));

export const securityAlertsRelations = relations(securityAlerts, ({ one }) => ({
  user: one(users, { fields: [securityAlerts.userId], references: [users.id] }),
  relatedEvent: one(auditLogs, {
    fields: [securityAlerts.relatedEventId],
    references: [auditLogs.eventId],
  }),
  resolver: one(users, {
    fields: [securityAlerts.resolvedByUserId],
    references: [users.id],
    relationName: "security_alert_resolved_by",
  }),
}));

export const auditRetentionPoliciesRelations = relations(auditRetentionPolicies, ({ one }) => ({
  approver: one(users, {
    fields: [auditRetentionPolicies.approvedByUserId],
    references: [users.id],
  }),
}));
