CREATE SCHEMA IF NOT EXISTS app;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS security;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE TABLE app.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(40) NOT NULL UNIQUE,
  name varchar(150) NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT departments_code_nonempty CHECK (length(btrim(code)) > 0),
  CONSTRAINT departments_name_nonempty CHECK (length(btrim(name)) > 0)
);
--> statement-breakpoint
CREATE TABLE app.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_number varchar(40) NOT NULL UNIQUE,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  job_title varchar(120) NOT NULL,
  phone varchar(30),
  employment_status varchar(20) NOT NULL DEFAULT 'ACTIVE',
  hired_at date,
  terminated_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_status_check CHECK (employment_status IN ('ACTIVE','SUSPENDED','TERMINATED')),
  CONSTRAINT staff_number_nonempty CHECK (length(btrim(staff_number)) > 0),
  CONSTRAINT staff_name_nonempty CHECK (length(btrim(first_name)) > 0 AND length(btrim(last_name)) > 0),
  CONSTRAINT staff_termination_date_check CHECK (terminated_at IS NULL OR hired_at IS NULL OR terminated_at >= hired_at)
);
--> statement-breakpoint
CREATE TABLE app.staff_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES app.staff(id) ON DELETE RESTRICT,
  department_id uuid NOT NULL REFERENCES app.departments(id) ON DELETE RESTRICT,
  assignment_type varchar(20) NOT NULL,
  start_date date NOT NULL,
  end_date date,
  assigned_by_staff_id uuid REFERENCES app.staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_departments_type_check CHECK (assignment_type IN ('PRIMARY','SECONDARY')),
  CONSTRAINT staff_departments_date_check CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT staff_departments_unique_assignment UNIQUE (staff_id, department_id, start_date)
);
--> statement-breakpoint
CREATE UNIQUE INDEX staff_one_active_primary_department_uq
  ON app.staff_departments (staff_id)
  WHERE assignment_type = 'PRIMARY' AND end_date IS NULL;
--> statement-breakpoint
CREATE INDEX staff_departments_department_active_idx
  ON app.staff_departments (department_id, staff_id)
  WHERE end_date IS NULL;
