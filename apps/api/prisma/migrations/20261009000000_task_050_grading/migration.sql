-- Task 050: Grading scheme & components.
--
-- Configurable weighted-grade schemes. A scheme belongs to exactly one class
-- subject (an assessment from another subject cannot contribute to it, which the
-- service also enforces), and each assessment may appear at most once per scheme
-- via the composite unique index. Weights are numeric so "total = 100" is a
-- validated policy in the service rather than a hardcoded column constraint,
-- leaving room for an explicit normalization policy later.

-- CreateEnum
CREATE TYPE "GradingSchemeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "grading_schemes" (
    "id" UUID NOT NULL,
    "class_subject_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "GradingSchemeStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grading_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_components" (
    "id" UUID NOT NULL,
    "scheme_id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grading_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grading_schemes_class_subject_id_idx" ON "grading_schemes"("class_subject_id");

-- CreateIndex
CREATE INDEX "grading_schemes_status_idx" ON "grading_schemes"("status");

-- CreateIndex
-- An assessment may appear at most once in a scheme: two components pointing at
-- the same assessment would double-count one score into the weighted total.
CREATE UNIQUE INDEX "grading_components_scheme_id_assessment_id_key" ON "grading_components"("scheme_id", "assessment_id");

-- CreateIndex
CREATE INDEX "grading_components_scheme_id_idx" ON "grading_components"("scheme_id");

-- CreateIndex
CREATE INDEX "grading_components_assessment_id_idx" ON "grading_components"("assessment_id");

-- AddForeignKey
ALTER TABLE "grading_schemes" ADD CONSTRAINT "grading_schemes_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_components" ADD CONSTRAINT "grading_components_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "grading_schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_components" ADD CONSTRAINT "grading_components_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
