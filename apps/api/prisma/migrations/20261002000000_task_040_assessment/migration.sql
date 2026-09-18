-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "assessment_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "MasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL,
    "class_subject_id" UUID NOT NULL,
    "assessment_type_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "max_score" DECIMAL(7,2) NOT NULL,
    "weight" DECIMAL(5,2),
    "available_from" TIMESTAMP(3),
    "available_until" TIMESTAMP(3),
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessment_types_code_key" ON "assessment_types"("code");

-- CreateIndex
CREATE INDEX "assessment_types_status_idx" ON "assessment_types"("status");

-- CreateIndex
CREATE INDEX "assessments_class_subject_id_idx" ON "assessments"("class_subject_id");

-- CreateIndex
CREATE INDEX "assessments_assessment_type_id_idx" ON "assessments"("assessment_type_id");

-- CreateIndex
CREATE INDEX "assessments_status_idx" ON "assessments"("status");

-- CreateIndex
CREATE INDEX "assessments_available_from_idx" ON "assessments"("available_from");

-- CreateIndex
CREATE INDEX "assignments_assessment_id_idx" ON "assignments"("assessment_id");

-- Seed the data-driven assessment type vocabulary.
-- Types are rows, not an enum, so an institution can add its own method without
-- a code change; these six are the baseline the domain documents.
INSERT INTO "assessment_types" ("id", "code", "name", "description", "status", "created_at", "updated_at")
VALUES
    (gen_random_uuid(), 'QUIZ', 'Kuis', 'Penilaian singkat yang mengukur pemahaman pada satu topik', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'EXAM', 'Ujian', 'Penilaian terjadwal dengan bank soal dan sesi ujian', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'ASSIGNMENT', 'Tugas', 'Penilaian berbasis penugasan yang dikumpulkan peserta', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'PRACTICAL', 'Praktik', 'Penilaian keterampilan melalui praktik langsung', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'OBSERVATION', 'Observasi', 'Penilaian melalui pengamatan perilaku atau kinerja', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'COMPETENCY', 'Kompetensi', 'Penilaian capaian kompetensi minimal', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_assessment_type_id_fkey" FOREIGN KEY ("assessment_type_id") REFERENCES "assessment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
