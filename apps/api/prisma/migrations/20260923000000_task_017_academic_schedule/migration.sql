-- CreateEnum
CREATE TYPE "AcademicScheduleMode" AS ENUM ('FACE_TO_FACE', 'ONLINE', 'BLENDED');

-- CreateEnum
CREATE TYPE "AcademicScheduleStatus" AS ENUM ('SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "academic_schedules" (
    "id" UUID NOT NULL,
    "class_subject_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "mode" "AcademicScheduleMode" NOT NULL DEFAULT 'FACE_TO_FACE',
    "location" TEXT,
    "url" TEXT,
    "status" "AcademicScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academic_schedules_class_subject_id_idx" ON "academic_schedules"("class_subject_id");

-- CreateIndex
CREATE INDEX "academic_schedules_start_at_end_at_idx" ON "academic_schedules"("start_at", "end_at");

-- CreateIndex
CREATE INDEX "academic_schedules_status_idx" ON "academic_schedules"("status");

-- AddForeignKey
ALTER TABLE "academic_schedules" ADD CONSTRAINT "academic_schedules_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

