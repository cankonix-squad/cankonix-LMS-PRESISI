-- Task 051: Final grade per enrollment / class subject.
--
-- The weighted result of a grading scheme for one participant in one class
-- subject. It is keyed uniquely by (enrollment, class subject) so recalculation
-- updates the existing row instead of accumulating duplicates.
--
-- `status` records whether a human has approved the number. An approved grade is
-- not silently recalculated: the service refuses until it is explicitly reopened,
-- and every calculate/approve transition is written to the audit trail. The
-- approver is a `user_accounts` reference (the acting login), not a raw person id,
-- so "who approved this" is answerable from the security record of the actor.

-- CreateEnum
CREATE TYPE "FinalGradeStatus" AS ENUM ('CALCULATED', 'APPROVED', 'REOPENED');

-- CreateTable
CREATE TABLE "final_grades" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "class_subject_id" UUID NOT NULL,
    "grading_scheme_id" UUID NOT NULL,
    "numeric_score" DECIMAL(5,2) NOT NULL,
    "grade_code" TEXT,
    "status" "FinalGradeStatus" NOT NULL DEFAULT 'CALCULATED',
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_grades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- One final grade per participant per class subject: the natural key the
-- recalculation path upserts against.
CREATE UNIQUE INDEX "final_grades_enrollment_id_class_subject_id_key" ON "final_grades"("enrollment_id", "class_subject_id");

-- CreateIndex
CREATE INDEX "final_grades_enrollment_id_idx" ON "final_grades"("enrollment_id");

-- CreateIndex
CREATE INDEX "final_grades_class_subject_id_idx" ON "final_grades"("class_subject_id");

-- CreateIndex
CREATE INDEX "final_grades_status_idx" ON "final_grades"("status");

-- CreateIndex
CREATE INDEX "final_grades_approved_by_user_id_idx" ON "final_grades"("approved_by_user_id");

-- AddForeignKey
ALTER TABLE "final_grades" ADD CONSTRAINT "final_grades_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_grades" ADD CONSTRAINT "final_grades_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_grades" ADD CONSTRAINT "final_grades_grading_scheme_id_fkey" FOREIGN KEY ("grading_scheme_id") REFERENCES "grading_schemes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_grades" ADD CONSTRAINT "final_grades_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
