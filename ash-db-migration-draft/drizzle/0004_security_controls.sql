-- Restrict ordinary application roles from mutating audit history.
-- Deployment must create a dedicated DB role and grant only SELECT/INSERT as appropriate.
CREATE OR REPLACE FUNCTION security.prevent_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_update_delete
BEFORE UPDATE OR DELETE ON security.audit_logs
FOR EACH ROW EXECUTE FUNCTION security.prevent_audit_mutation();
--> statement-breakpoint
-- Do not rely on this trigger as protection against a database owner/superuser.
-- External encrypted backups and restricted database ownership remain required.
CREATE OR REPLACE FUNCTION security.prevent_approval_payload_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.request_payload IS DISTINCT FROM OLD.request_payload
     OR NEW.payload_hash IS DISTINCT FROM OLD.payload_hash
     OR NEW.request_type IS DISTINCT FROM OLD.request_type
     OR NEW.target_reference IS DISTINCT FROM OLD.target_reference
     OR NEW.requested_by_user_id IS DISTINCT FROM OLD.requested_by_user_id
  THEN
    RAISE EXCEPTION 'approval request payload is immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER approval_request_payload_immutable
BEFORE UPDATE ON security.approval_requests
FOR EACH ROW EXECUTE FUNCTION security.prevent_approval_payload_mutation();
