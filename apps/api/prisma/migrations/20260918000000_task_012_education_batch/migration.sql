CREATE TYPE "EducationBatchStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "education_batches" (
    "id" UUID NOT NULL,
    "education_program_id" UUID NOT NULL,
    "curriculum_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "EducationBatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "capacity" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_batches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "education_batches_education_program_id_code_key"
ON "education_batches"("education_program_id", "code");
CREATE INDEX "education_batches_education_program_id_idx"
ON "education_batches"("education_program_id");
CREATE INDEX "education_batches_curriculum_id_idx"
ON "education_batches"("curriculum_id");
CREATE INDEX "education_batches_status_idx"
ON "education_batches"("status");
CREATE INDEX "education_batches_start_date_end_date_idx"
ON "education_batches"("start_date", "end_date");

ALTER TABLE "education_batches"
ADD CONSTRAINT "education_batches_education_program_id_fkey"
FOREIGN KEY ("education_program_id") REFERENCES "education_programs"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "education_batches"
ADD CONSTRAINT "education_batches_curriculum_id_fkey"
FOREIGN KEY ("curriculum_id") REFERENCES "curriculums"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;