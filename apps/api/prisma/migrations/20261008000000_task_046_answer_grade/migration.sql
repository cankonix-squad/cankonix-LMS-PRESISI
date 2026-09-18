CREATE TABLE "answer_grades" (
  "id" UUID NOT NULL,
  "attempt_answer_id" UUID NOT NULL,
  "auto_score" DECIMAL(9,2),
  "manual_score" DECIMAL(9,2),
  "final_score" DECIMAL(9,2) NOT NULL,
  "grader_person_id" UUID,
  "feedback" TEXT,
  "graded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "answer_grades_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "answer_grades_attempt_answer_id_key" ON "answer_grades"("attempt_answer_id");
CREATE INDEX "answer_grades_grader_person_id_graded_at_idx" ON "answer_grades"("grader_person_id", "graded_at");
CREATE INDEX "answer_grades_graded_at_idx" ON "answer_grades"("graded_at");
ALTER TABLE "answer_grades" ADD CONSTRAINT "answer_grades_attempt_answer_id_fkey" FOREIGN KEY ("attempt_answer_id") REFERENCES "attempt_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "answer_grades" ADD CONSTRAINT "answer_grades_grader_person_id_fkey" FOREIGN KEY ("grader_person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;