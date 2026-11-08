CREATE TABLE security.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL UNIQUE REFERENCES app.staff(id) ON DELETE RESTRICT,
  username varchar(80) NOT NULL,
  username_normalized varchar(80) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  account_status varchar(20) NOT NULL DEFAULT 'ACTIVE',
  mfa_enabled boolean NOT NULL DEFAULT false,
  mfa_method varchar(30),
  failed_login_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_username_nonempty CHECK (length(btrim(username)) > 0),
  CONSTRAINT users_status_check CHECK (account_status IN ('ACTIVE','SUSPENDED','DISABLED')),
  CONSTRAINT users_failed_login_nonnegative CHECK (failed_login_count >= 0),
  CONSTRAINT users_mfa_method_check CHECK (
    (mfa_enabled = false AND mfa_method IS NULL) OR
    (mfa_enabled = true AND mfa_method IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE TABLE security.account_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES app.staff(id) ON DELETE RESTRICT,
  requested_username varchar(80) NOT NULL,
  requested_username_normalized varchar(80) NOT NULL,
  requested_by_user_id uuid NOT NULL REFERENCES security.users(id) ON DELETE RESTRICT,
  status varchar(20) NOT NULL DEFAULT 'PENDING',
  reviewed_by_user_id uuid REFERENCES security.users(id) ON DELETE RESTRICT,
  review_reason text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_requests_status_check CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED','COMPLETED')),
  CONSTRAINT account_requests_review_fields_check CHECK (
    (status IN ('PENDING','CANCELLED') AND reviewed_by_user_id IS NULL AND reviewed_at IS NULL) OR
    (status IN ('APPROVED','REJECTED','COMPLETED') AND reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL)
  ),
  CONSTRAINT account_requests_no_self_approval CHECK (
    reviewed_by_user_id IS NULL OR reviewed_by_user_id <> requested_by_user_id
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX account_requests_one_pending_per_staff_uq
  ON security.account_requests (staff_id)
  WHERE status = 'PENDING';
--> statement-breakpoint
CREATE TABLE security.auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES security.users(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoke_reason varchar(100),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_sessions_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT auth_sessions_revocation_check CHECK (
    (revoked_at IS NULL AND revoke_reason IS NULL) OR
    (revoked_at IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE INDEX auth_sessions_user_expiry_idx
  ON security.auth_sessions (user_id, expires_at)
  WHERE revoked_at IS NULL;
--> statement-breakpoint
CREATE TABLE security.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES security.users(id) ON DELETE SET NULL,
  username_submitted varchar(80) NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL,
  source_identifier_hash text
);
--> statement-breakpoint
CREATE INDEX login_attempts_user_time_idx
  ON security.login_attempts (user_id, attempted_at DESC);
--> statement-breakpoint
CREATE TABLE security.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES security.users(id) ON DELETE RESTRICT,
  requested_by_user_id uuid NOT NULL REFERENCES security.users(id) ON DELETE RESTRICT,
  reset_token_hash text,
  status varchar(20) NOT NULL DEFAULT 'PENDING',
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT password_reset_status_check CHECK (status IN ('PENDING','COMPLETED','CANCELLED','EXPIRED')),
  CONSTRAINT password_reset_completion_check CHECK (
    (status = 'COMPLETED' AND completed_at IS NOT NULL) OR
    (status <> 'COMPLETED' AND completed_at IS NULL)
  )
);
--> statement-breakpoint
CREATE INDEX password_reset_user_status_idx
  ON security.password_reset_requests (user_id, status, created_at DESC);
