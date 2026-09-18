-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_account_id" UUID,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "organization_id" UUID,
    "before_state" JSONB,
    "after_state" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_account_id_created_at_idx" ON "audit_logs"("actor_user_account_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_created_at_idx" ON "audit_logs"("resource_type", "resource_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- Append-only enforcement (TASK-006).
--
-- Audit history is only trustworthy while it is immutable. The application
-- enforces this on three levels: the repository interface exposes no update or
-- delete operation, the API exposes no write route beyond append, and this
-- trigger makes the guarantee a property of the database itself so that ad-hoc
-- SQL cannot rewrite history either.
--
-- Retention pruning, if ever required, must be an explicit and separately
-- reviewed procedure that disables this trigger knowingly — never an ordinary
-- DELETE that a future maintenance script might add by accident.
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only; % is not permitted', TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

-- CreateTrigger
CREATE TRIGGER audit_logs_append_only
    BEFORE UPDATE OR DELETE ON "audit_logs"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_mutation();