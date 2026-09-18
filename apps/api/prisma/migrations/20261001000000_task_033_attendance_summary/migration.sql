-- CreateEnum
CREATE TYPE "AttendanceSummaryScopeType" AS ENUM ('ENROLLMENT', 'ENROLLMENT_SUBJECT', 'CLASS_SUBJECT', 'CLASS', 'BATCH', 'PROGRAM');

-- CreateTable
CREATE TABLE "attendance_summaries" (
    "id" UUID NOT NULL,
    "scope_type" "AttendanceSummaryScopeType" NOT NULL,
    "scope_id" UUID NOT NULL,
    "enrollment_id" UUID,
    "class_subject_id" UUID,
    "academic_class_id" UUID,
    "education_batch_id" UUID,
    "academic_program_id" UUID,
    "participants" INTEGER NOT NULL DEFAULT 0,
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "present_count" INTEGER NOT NULL DEFAULT 0,
    "late_count" INTEGER NOT NULL DEFAULT 0,
    "excused_count" INTEGER NOT NULL DEFAULT 0,
    "sick_count" INTEGER NOT NULL DEFAULT 0,
    "absent_count" INTEGER NOT NULL DEFAULT 0,
    "attendance_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recalculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_summaries_scope_type_scope_id_key" ON "attendance_summaries"("scope_type", "scope_id");

-- CreateIndex
CREATE INDEX "attendance_summaries_scope_type_scope_id_idx" ON "attendance_summaries"("scope_type", "scope_id");

-- CreateIndex
CREATE INDEX "attendance_summaries_enrollment_id_idx" ON "attendance_summaries"("enrollment_id");

-- CreateIndex
CREATE INDEX "attendance_summaries_class_subject_id_idx" ON "attendance_summaries"("class_subject_id");

-- CreateIndex
CREATE INDEX "attendance_summaries_academic_class_id_idx" ON "attendance_summaries"("academic_class_id");

-- CreateIndex
CREATE INDEX "attendance_summaries_education_batch_id_idx" ON "attendance_summaries"("education_batch_id");

-- CreateIndex
CREATE INDEX "attendance_summaries_academic_program_id_idx" ON "attendance_summaries"("academic_program_id");
