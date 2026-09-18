CREATE TABLE "attempt_answers" (
  "id" UUID NOT NULL,
  "attempt_question_id" UUID NOT NULL,
  "answer_payload" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "attempt_answers_attempt_question_id_key" ON "attempt_answers"("attempt_question_id");
CREATE INDEX "attempt_answers_saved_at_idx" ON "attempt_answers"("saved_at");
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_question_id_fkey" FOREIGN KEY ("attempt_question_id") REFERENCES "attempt_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;