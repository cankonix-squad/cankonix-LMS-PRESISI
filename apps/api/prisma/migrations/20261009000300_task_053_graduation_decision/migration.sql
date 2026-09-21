-- TASK-053: formal graduation decisions.
--
-- A decision is separate from the evaluation it rests on: the evaluation is
-- evidence produced by the rule engine, the decision is an authored act.
-- `graduation_evaluation_id` is unique, so one evaluation carries at most one
-- decision. Rows are never deleted; revocation is a status.

-- CreateEnum
CREATE TYPE "GraduationDecisionOutcome" AS ENUM ('PASS', 'FAIL', 'REMEDIAL', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "GraduationDecisionStatus" AS ENUM ('DRAFT', 'APPROVED', 'REVOKED');

-- CreateTable
CREATE TABLE "graduation_decisions" (
    "id" UUID NOT NULL,
    "graduation_evaluation_id" UUID NOT NULL,
    "decision" "GraduationDecisionOutcome" NOT NULL,
    "status" "GraduationDecisionStatus" NOT NULL DEFAULT 'DRAFT',
    "decided_by_user_id" UUID,
    "decided_at" TIMESTAMP(3),
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMP(3),
    "revoked_by_user_id" UUID,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "graduation_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "graduation_decisions_graduation_evaluation_id_key" ON "graduation_decisions"("graduation_evaluation_id");

-- CreateIndex
CREATE INDEX "graduation_decisions_status_idx" ON "graduation_decisions"("status");

-- CreateIndex
CREATE INDEX "graduation_decisions_decision_idx" ON "graduation_decisions"("decision");

-- CreateIndex
CREATE INDEX "graduation_decisions_decided_by_user_id_idx" ON "graduation_decisions"("decided_by_user_id");

-- CreateIndex
CREATE INDEX "graduation_decisions_approved_by_user_id_idx" ON "graduation_decisions"("approved_by_user_id");

-- AddForeignKey
ALTER TABLE "graduation_decisions" ADD CONSTRAINT "graduation_decisions_graduation_evaluation_id_fkey" FOREIGN KEY ("graduation_evaluation_id") REFERENCES "graduation_evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graduation_decisions" ADD CONSTRAINT "graduation_decisions_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graduation_decisions" ADD CONSTRAINT "graduation_decisions_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graduation_decisions" ADD CONSTRAINT "graduation_decisions_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
