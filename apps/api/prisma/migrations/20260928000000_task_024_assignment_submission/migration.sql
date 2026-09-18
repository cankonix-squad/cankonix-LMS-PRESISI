-- CreateEnum
CREATE TYPE "AssignmentLifecycleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'GRADED', 'RETURNED');

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "assessment_id" UUID,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "due_at" TIMESTAMP(3),
    "max_score" INTEGER NOT NULL DEFAULT 100,
    "attempts_allowed" INTEGER NOT NULL DEFAULT 1,
    "status" "AssignmentLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_submissions" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "attempt_no" INTEGER NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "text_answer" TEXT,
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "status" "AssignmentSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_submission_files" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "stored_file_id" UUID NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_submission_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_grades" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "score" DECIMAL(7,2) NOT NULL,
    "grader_person_id" UUID NOT NULL,
    "feedback" TEXT,
    "graded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_grades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignments_activity_id_idx" ON "assignments"("activity_id");

-- CreateIndex
CREATE INDEX "assignments_status_idx" ON "assignments"("status");

-- CreateIndex
CREATE INDEX "assignments_due_at_idx" ON "assignments"("due_at");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_activity_id_key" ON "assignments"("activity_id");

-- CreateIndex
CREATE INDEX "assignment_submissions_assignment_id_idx" ON "assignment_submissions"("assignment_id");

-- CreateIndex
CREATE INDEX "assignment_submissions_enrollment_id_idx" ON "assignment_submissions"("enrollment_id");

-- CreateIndex
CREATE INDEX "assignment_submissions_status_idx" ON "assignment_submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submissions_assignment_id_enrollment_id_attempt__key" ON "assignment_submissions"("assignment_id", "enrollment_id", "attempt_no");

-- CreateIndex
CREATE INDEX "assignment_submission_files_submission_id_idx" ON "assignment_submission_files"("submission_id");

-- CreateIndex
CREATE INDEX "assignment_submission_files_stored_file_id_idx" ON "assignment_submission_files"("stored_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submission_files_submission_id_stored_file_id_key" ON "assignment_submission_files"("submission_id", "stored_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_grades_submission_id_key" ON "assignment_grades"("submission_id");

-- CreateIndex
CREATE INDEX "assignment_grades_grader_person_id_idx" ON "assignment_grades"("grader_person_id");

-- CreateIndex
CREATE INDEX "assignment_grades_graded_at_idx" ON "assignment_grades"("graded_at");

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "learning_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submission_files" ADD CONSTRAINT "assignment_submission_files_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "assignment_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submission_files" ADD CONSTRAINT "assignment_submission_files_stored_file_id_fkey" FOREIGN KEY ("stored_file_id") REFERENCES "stored_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_grades" ADD CONSTRAINT "assignment_grades_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "assignment_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_grades" ADD CONSTRAINT "assignment_grades_grader_person_id_fkey" FOREIGN KEY ("grader_person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

