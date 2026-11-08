CREATE TABLE security.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type varchar(60) NOT NULL,
  requested_by_user_id uuid NOT NULL REFERENCES security.users(id) ON DELETE RESTRICT,
  target_reference varchar(150) NOT NULL,
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_hash text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'PENDING',
  idempotency_key varchar(120) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz,
  execution_reference varchar(150),
  CONSTRAINT approval_status_check CHECK (status IN ('PENDING','APPROVED','REJECTED','EXPIRED','CANCELLED','EXECUTED','FAILED')),
  CONSTRAINT approval_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT approval_execution_fields_check CHECK (
    (status = 'EXECUTED' AND executed_at IS NOT NULL) OR
    (status <> 'EXECUTED' AND executed_at IS NULL)
  )
);
--> statement-breakpoint
CREATE INDEX approval_requests_status_expiry_idx
  ON security.approval_requests (status, expires_at);
--> statement-breakpoint
CREATE TABLE security.approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id uuid NOT NULL UNIQUE REFERENCES security.approval_requests(id) ON DELETE RESTRICT,
  approver_user_id uuid NOT NULL REFERENCES security.users(id) ON DELETE RESTRICT,
  decision varchar(20) NOT NULL,
  reason text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT approval_decision_check CHECK (decision IN ('APPROVED','REJECTED'))
);
--> statement-breakpoint
CREATE TABLE security.emergency_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES security.users(id) ON DELETE RESTRICT,
  requested_by_user_id uuid NOT NULL REFERENCES security.users(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  granted_permissions jsonb NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  reviewed_by_user_id uuid REFERENCES security.users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  review_notes text,
  CONSTRAINT emergency_reason_nonempty CHECK (length(btrim(reason)) > 0),
  CONSTRAINT emergency_expiry_check CHECK (expires_at > started_at),
  CONSTRAINT emergency_review_fields_check CHECK (
    (reviewed_by_user_id IS NULL AND reviewed_at IS NULL) OR
    (reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE INDEX emergency_grants_user_expiry_idx
  ON security.emergency_access_grants (user_id, expires_at)
  WHERE revoked_at IS NULL;
--> statement-breakpoint
CREATE TABLE security.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES security.users(id) ON DELETE SET NULL,
  action varchar(100) NOT NULL,
  resource_type varchar(80) NOT NULL,
  resource_id uuid,
  department_id uuid REFERENCES app.departments(id) ON DELETE SET NULL,
  before_data jsonb,
  after_data jsonb,
  outcome varchar(20) NOT NULL,
  source_identifier_hash text,
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_outcome_check CHECK (outcome IN ('SUCCESS','DENIED','FAILED'))
);
--> statement-breakpoint
CREATE INDEX audit_logs_created_at_idx ON security.audit_logs (created_at DESC);
--> statement-breakpoint
CREATE INDEX audit_logs_actor_created_idx ON security.audit_logs (actor_user_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX audit_logs_resource_created_idx ON security.audit_logs (resource_type, resource_id, created_at DESC);
--> statement-breakpoint
CREATE TABLE security.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type varchar(80) NOT NULL,
  severity varchar(20) NOT NULL,
  user_id uuid REFERENCES security.users(id) ON DELETE SET NULL,
  description text NOT NULL,
  related_event_id uuid,
  status varchar(20) NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_user_id uuid REFERENCES security.users(id) ON DELETE SET NULL,
  CONSTRAINT security_alert_severity_check CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  CONSTRAINT security_alert_status_check CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED'))
);
--> statement-breakpoint
CREATE INDEX security_alerts_status_created_idx ON security.security_alerts (status, created_at DESC);
--> statement-breakpoint
CREATE TABLE security.audit_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type varchar(80) NOT NULL,
  retention_years integer NOT NULL,
  legal_basis text,
  is_active boolean NOT NULL DEFAULT true,
  approved_by_user_id uuid REFERENCES security.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_retention_years_check CHECK (retention_years >= 5)
);
