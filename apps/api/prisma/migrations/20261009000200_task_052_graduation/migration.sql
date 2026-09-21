-- Task 052: Graduation rules and evaluation.
--
-- Four tables with a deliberate split between *rules* (what graduation requires),
-- *evaluations* (what the system observed about one participant), and
-- *evaluation details* (the per-component evidence). The formal decision that
-- acts on an evaluation is TASK-053 and is intentionally a separate table, so a
-- decision can be corrected or revoked without destroying the evidence it was
-- based on.
--
-- Rules are versioned: `(education_batch_id, code, version)` is unique, so a
-- threshold change creates a new version and an old evaluation still points at
-- exactly the rule text that produced it.

-- CreateEnum
CREATE TYPE "GraduationRuleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GraduationComponentType" AS ENUM ('ATTENDANCE_PERCENTAGE', 'FINAL_SCORE', 'REQUIRED_SUBJECT', 'FINAL_EXAM');

-- CreateEnum
CREATE TYPE "GraduationEvaluationOutcome" AS ENUM ('PENDING', 'ELIGIBLE', 'NOT_ELIGIBLE', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "graduation_rules" (
    "id" UUID NOT NULL,
    "education_batch_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "GraduationRuleStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "published_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "graduation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "graduation_rule_components" (
    "id" UUID NOT NULL,
    "graduation_rule_id" UUID NOT NULL,
    "component_type" "GraduationComponentType" NOT NULL,
    "label" TEXT NOT NULL,
    "threshold_value" DECIMAL(5,2),
    "subject_id" UUID,
    "assessment_id" UUID,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "graduation_rule_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "graduation_evaluations" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "graduation_rule_id" UUID NOT NULL,
    "outcome" "GraduationEvaluationOutcome" NOT NULL DEFAULT 'PENDING',
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluated_by_user_id" UUID,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "graduation_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "graduation_evaluation_details" (
    "id" UUID NOT NULL,
    "graduation_evaluation_id" UUID NOT NULL,
    "component_type" "GraduationComponentType" NOT NULL,
    "label" TEXT NOT NULL,
    "observed_value" DECIMAL(8,2),
    "threshold_value" DECIMAL(5,2),
    "passed" BOOLEAN NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "graduation_evaluation_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "graduation_rules_education_batch_id_code_version_key" ON "graduation_rules"("education_batch_id", "code", "version");

-- CreateIndex
CREATE INDEX "graduation_rules_education_batch_id_idx" ON "graduation_rules"("education_batch_id");

-- CreateIndex
CREATE INDEX "graduation_rules_status_idx" ON "graduation_rules"("status");

-- CreateIndex
-- A rule cannot declare the same requirement twice; the label distinguishes two
-- components of the same type (for example two different required subjects).
CREATE UNIQUE INDEX "graduation_rule_components_graduation_rule_id_component_typ_key" ON "graduation_rule_components"("graduation_rule_id", "component_type", "label");

-- CreateIndex
CREATE INDEX "graduation_rule_components_graduation_rule_id_idx" ON "graduation_rule_components"("graduation_rule_id");

-- CreateIndex
CREATE INDEX "graduation_rule_components_subject_id_idx" ON "graduation_rule_components"("subject_id");

-- CreateIndex
CREATE INDEX "graduation_rule_components_assessment_id_idx" ON "graduation_rule_components"("assessment_id");

-- CreateIndex
CREATE INDEX "graduation_evaluations_enrollment_id_idx" ON "graduation_evaluations"("enrollment_id");

-- CreateIndex
CREATE INDEX "graduation_evaluations_graduation_rule_id_idx" ON "graduation_evaluations"("graduation_rule_id");

-- CreateIndex
CREATE INDEX "graduation_evaluations_outcome_idx" ON "graduation_evaluations"("outcome");

-- CreateIndex
CREATE INDEX "graduation_evaluation_details_graduation_evaluation_id_idx" ON "graduation_evaluation_details"("graduation_evaluation_id");

-- AddForeignKey
ALTER TABLE "graduation_rules" ADD CONSTRAINT "graduation_rules_education_batch_id_fkey" FOREIGN KEY ("education_batch_id") REFERENCES "education_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graduation_rules" ADD CONSTRAINT "graduation_rules_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graduation_rule_components" ADD CONSTRAINT "graduation_rule_components_graduation_rule_id_fkey" FOREIGN KEY ("graduation_rule_id") REFERENCES "graduation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graduation_rule_components" ADD CONSTRAINT "graduation_rule_components_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graduation_rule_components" ADD CONSTRAINT "graduation_rule_components_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graduation_evaluations" ADD CONSTRAINT "graduation_evaluations_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graduation_evaluations" ADD CONSTRAINT "graduation_evaluations_graduation_rule_id_fkey" FOREIGN KEY ("graduation_rule_id") REFERENCES "graduation_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graduation_evaluations" ADD CONSTRAINT "graduation_evaluations_evaluated_by_user_id_fkey" FOREIGN KEY ("evaluated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graduation_evaluation_details" ADD CONSTRAINT "graduation_evaluation_details_graduation_evaluation_id_fkey" FOREIGN KEY ("graduation_evaluation_id") REFERENCES "graduation_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
