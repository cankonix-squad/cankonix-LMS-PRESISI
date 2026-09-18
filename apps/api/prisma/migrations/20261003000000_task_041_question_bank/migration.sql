-- CreateEnum
CREATE TYPE "QuestionVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "question_banks" (
    "id" UUID NOT NULL,
    "curriculum_subject_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "MasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "has_options" BOOLEAN NOT NULL DEFAULT false,
    "multi_select" BOOLEAN NOT NULL DEFAULT false,
    "status" "MasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "question_bank_id" UUID NOT NULL,
    "question_type_id" UUID NOT NULL,
    "code" TEXT,
    "status" "MasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_versions" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "stem" TEXT NOT NULL,
    "scoring_rule" JSONB,
    "explanation" TEXT,
    "difficulty" TEXT,
    "topic" TEXT,
    "max_score" DECIMAL(7,2) NOT NULL DEFAULT 1,
    "status" "QuestionVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "value" DECIMAL(7,2),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_banks_curriculum_subject_id_idx" ON "question_banks"("curriculum_subject_id");

-- CreateIndex
CREATE INDEX "question_banks_status_idx" ON "question_banks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "question_banks_curriculum_subject_id_code_key" ON "question_banks"("curriculum_subject_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "question_types_code_key" ON "question_types"("code");

-- CreateIndex
CREATE INDEX "question_types_status_idx" ON "question_types"("status");

-- CreateIndex
CREATE INDEX "questions_question_bank_id_idx" ON "questions"("question_bank_id");

-- CreateIndex
CREATE INDEX "questions_question_type_id_idx" ON "questions"("question_type_id");

-- CreateIndex
CREATE INDEX "questions_status_idx" ON "questions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "questions_question_bank_id_code_key" ON "questions"("question_bank_id", "code");

-- CreateIndex
CREATE INDEX "question_versions_question_id_idx" ON "question_versions"("question_id");

-- CreateIndex
CREATE INDEX "question_versions_status_idx" ON "question_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "question_versions_question_id_version_key" ON "question_versions"("question_id", "version");

-- CreateIndex
CREATE INDEX "question_options_version_id_idx" ON "question_options"("version_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_options_version_id_key_key" ON "question_options"("version_id", "key");

-- AddForeignKey
ALTER TABLE "question_banks" ADD CONSTRAINT "question_banks_curriculum_subject_id_fkey" FOREIGN KEY ("curriculum_subject_id") REFERENCES "curriculum_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_question_bank_id_fkey" FOREIGN KEY ("question_bank_id") REFERENCES "question_banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_question_type_id_fkey" FOREIGN KEY ("question_type_id") REFERENCES "question_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "question_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seed the data-driven question type vocabulary.
-- Types are rows, not an enum, so an institution can add its own kind of
-- question without a code change. `has_options` and `multi_select` keep option
-- validation data-driven: the service reads these flags instead of branching on
-- a code, which is why the seeded codes never appear in the service layer.
-- If the project later adopts `prisma/seed.ts`, move these rows out of the
-- migration BEFORE it is applied anywhere (same caveat as TASK-040).
INSERT INTO "question_types" ("id", "code", "name", "description", "has_options", "multi_select", "status", "created_at", "updated_at")
VALUES
    (gen_random_uuid(), 'SINGLE_CHOICE', 'Pilihan Ganda', 'Satu jawaban benar dari beberapa opsi', TRUE, FALSE, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'MULTIPLE_CHOICE', 'Pilihan Ganda Kompleks', 'Beberapa jawaban benar dari beberapa opsi', TRUE, TRUE, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'TRUE_FALSE', 'Benar/Salah', 'Pernyataan dengan jawaban benar atau salah', TRUE, FALSE, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'ESSAY', 'Uraian', 'Jawaban terbuka yang dinilai secara manual', FALSE, FALSE, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'SHORT_ANSWER', 'Jawaban Singkat', 'Jawaban singkat berupa teks atau angka', FALSE, FALSE, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
