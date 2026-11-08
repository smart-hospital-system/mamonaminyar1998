CREATE TABLE security.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(60) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  description text,
  is_system_role boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE security.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(100) NOT NULL UNIQUE,
  name varchar(150) NOT NULL,
  module varchar(60) NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE security.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES security.roles(id) ON DELETE RESTRICT,
  permission_id uuid NOT NULL REFERENCES security.permissions(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);
--> statement-breakpoint
CREATE TABLE security.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES security.users(id) ON DELETE RESTRICT,
  role_id uuid NOT NULL REFERENCES security.roles(id) ON DELETE RESTRICT,
  scope_type varchar(20) NOT NULL,
  department_id uuid REFERENCES app.departments(id) ON DELETE RESTRICT,
  assigned_by_user_id uuid NOT NULL REFERENCES security.users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT user_roles_scope_check CHECK (
    (scope_type = 'GLOBAL' AND department_id IS NULL) OR
    (scope_type = 'DEPARTMENT' AND department_id IS NOT NULL)
  ),
  CONSTRAINT user_roles_scope_type_check CHECK (scope_type IN ('GLOBAL','DEPARTMENT')),
  CONSTRAINT user_roles_expiry_check CHECK (expires_at IS NULL OR expires_at > assigned_at),
  CONSTRAINT user_roles_revocation_check CHECK (revoked_at IS NULL OR revoked_at >= assigned_at)
);
--> statement-breakpoint
CREATE UNIQUE INDEX user_roles_active_global_uq
  ON security.user_roles (user_id, role_id)
  WHERE scope_type = 'GLOBAL' AND revoked_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX user_roles_active_department_uq
  ON security.user_roles (user_id, role_id, department_id)
  WHERE scope_type = 'DEPARTMENT' AND revoked_at IS NULL;
--> statement-breakpoint
CREATE INDEX user_roles_user_active_idx
  ON security.user_roles (user_id, expires_at)
  WHERE revoked_at IS NULL;
--> statement-breakpoint
CREATE TABLE security.role_grant_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grantor_role_id uuid NOT NULL REFERENCES security.roles(id) ON DELETE RESTRICT,
  target_role_id uuid NOT NULL REFERENCES security.roles(id) ON DELETE RESTRICT,
  scope_type varchar(20) NOT NULL,
  is_allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_grant_scope_check CHECK (scope_type IN ('GLOBAL','DEPARTMENT')),
  CONSTRAINT role_grant_rules_unique UNIQUE (grantor_role_id, target_role_id, scope_type)
);
