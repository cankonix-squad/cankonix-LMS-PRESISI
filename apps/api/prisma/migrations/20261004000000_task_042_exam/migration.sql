CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'VALIDATED', 'SCHEDULED', 'CLOSED', 'ARCHIVED');
CREATE TYPE "ExamSelectionMode" AS ENUM ('FIXED', 'POOL');

CREATE TABLE "exams" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "assessment_id" UUID NOT NULL, "title" TEXT NOT NULL,
  "instructions" TEXT, "duration_minutes" INTEGER NOT NULL, "attempts_allowed" INTEGER,
  "shuffle_questions" BOOLEAN NOT NULL DEFAULT true, "shuffle_options" BOOLEAN NOT NULL DEFAULT true,
  "show_result_immediately" BOOLEAN NOT NULL DEFAULT false, "time_zone" TEXT,
  "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT', "config_version" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "exam_blueprints" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "exam_id" UUID NOT NULL, "title" TEXT,
  "description" TEXT, "total_questions" INTEGER NOT NULL, "total_points" DECIMAL(9,2) NOT NULL,
  "selection_mode" "ExamSelectionMode" NOT NULL DEFAULT 'FIXED', "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "exam_blueprints_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "exam_blueprint_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "exam_id" UUID NOT NULL, "blueprint_id" UUID NOT NULL,
  "code" TEXT NOT NULL, "label" TEXT, "sort_order" INTEGER NOT NULL DEFAULT 0, "question_bank_id" UUID,
  "question_type_id" UUID, "topic" TEXT, "difficulty" TEXT, "count" INTEGER NOT NULL,
  "points_per_question" DECIMAL(7,2) NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "exam_blueprint_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "exams_assessment_id_key" ON "exams"("assessment_id");
CREATE INDEX "exams_status_idx" ON "exams"("status");
CREATE INDEX "exams_assessment_id_idx" ON "exams"("assessment_id");
CREATE UNIQUE INDEX "exam_blueprints_exam_id_key" ON "exam_blueprints"("exam_id");
CREATE INDEX "exam_blueprints_exam_id_idx" ON "exam_blueprints"("exam_id");
CREATE UNIQUE INDEX "exam_blueprint_rules_blueprint_id_code_key" ON "exam_blueprint_rules"("blueprint_id","code");
CREATE INDEX "exam_blueprint_rules_blueprint_id_idx" ON "exam_blueprint_rules"("blueprint_id");
CREATE INDEX "exam_blueprint_rules_exam_id_idx" ON "exam_blueprint_rules"("exam_id");
CREATE INDEX "exam_blueprint_rules_question_bank_id_idx" ON "exam_blueprint_rules"("question_bank_id");
CREATE INDEX "exam_blueprint_rules_question_type_id_idx" ON "exam_blueprint_rules"("question_type_id");
ALTER TABLE "exams" ADD CONSTRAINT "exams_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exam_blueprints" ADD CONSTRAINT "exam_blueprints_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_blueprint_rules" ADD CONSTRAINT "exam_blueprint_rules_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_blueprint_rules" ADD CONSTRAINT "exam_blueprint_rules_blueprint_id_fkey" FOREIGN KEY ("blueprint_id") REFERENCES "exam_blueprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_blueprint_rules" ADD CONSTRAINT "exam_blueprint_rules_question_bank_id_fkey" FOREIGN KEY ("question_bank_id") REFERENCES "question_banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exam_blueprint_rules" ADD CONSTRAINT "exam_blueprint_rules_question_type_id_fkey" FOREIGN KEY ("question_type_id") REFERENCES "question_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
