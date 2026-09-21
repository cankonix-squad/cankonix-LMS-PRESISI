-- TASK-060: reporting read model.
--
-- One table, `reporting_metrics`, holding pre-aggregated participant, progress,
-- attendance and score figures per reporting scope. Every column is derived from
-- the transactional tables and is rebuilt by an idempotent refresh; nothing here
-- is a source of truth. Parent id columns are denormalized so a drill-down can
-- select a whole subtree with one indexed predicate.

-- CreateEnum
CREATE TYPE "ReportingScopeType" AS ENUM ('ORGANIZATION', 'PROGRAM', 'BATCH', 'CLASS', 'CLASS_SUBJECT', 'ENROLLMENT');

-- CreateTable
CREATE TABLE "reporting_metrics" (
    "id" UUID NOT NULL,
    "scopeType" "ReportingScopeType" NOT NULL,
    "scope_id" UUID NOT NULL,
    "scope_name" TEXT,
    "organization_id" UUID,
    "education_program_id" UUID,
    "education_batch_id" UUID,
    "academic_class_id" UUID,
    "class_subject_id" UUID,
    "participants" INTEGER NOT NULL DEFAULT 0,
    "active_participants" INTEGER NOT NULL DEFAULT 0,
    "average_progress_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attendance_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "average_final_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "graded_count" INTEGER NOT NULL DEFAULT 0,
    "unapproved_grade_count" INTEGER NOT NULL DEFAULT 0,
    "recalculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporting_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reporting_metrics_scopeType_scope_id_idx" ON "reporting_metrics"("scopeType", "scope_id");

-- CreateIndex
CREATE INDEX "reporting_metrics_organization_id_idx" ON "reporting_metrics"("organization_id");

-- CreateIndex
CREATE INDEX "reporting_metrics_education_program_id_idx" ON "reporting_metrics"("education_program_id");

-- CreateIndex
CREATE INDEX "reporting_metrics_education_batch_id_idx" ON "reporting_metrics"("education_batch_id");

-- CreateIndex
CREATE INDEX "reporting_metrics_academic_class_id_idx" ON "reporting_metrics"("academic_class_id");

-- CreateIndex
CREATE INDEX "reporting_metrics_class_subject_id_idx" ON "reporting_metrics"("class_subject_id");

-- CreateIndex
CREATE INDEX "reporting_metrics_recalculated_at_idx" ON "reporting_metrics"("recalculated_at");

-- CreateIndex
CREATE UNIQUE INDEX "reporting_metrics_scopeType_scope_id_key" ON "reporting_metrics"("scopeType", "scope_id");
