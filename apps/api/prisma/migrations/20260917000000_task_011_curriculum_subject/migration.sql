CREATE TYPE "SubjectStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "CurriculumStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "SubjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subjects_code_key"
ON "subjects"("code");
CREATE INDEX "subjects_status_idx"
ON "subjects"("status");

CREATE TABLE "curriculums" (
    "id" UUID NOT NULL,
    "education_program_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "effective_from" DATE,
    "status" "CurriculumStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculums_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "curriculums_education_program_id_version_key"
ON "curriculums"("education_program_id", "version");
CREATE INDEX "curriculums_education_program_id_idx"
ON "curriculums"("education_program_id");
CREATE INDEX "curriculums_status_idx"
ON "curriculums"("status");

CREATE TABLE "curriculum_subjects" (
    "id" UUID NOT NULL,
    "curriculum_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "credit_hours" INTEGER,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curriculum_subjects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "curriculum_subjects_curriculum_id_subject_id_key"
ON "curriculum_subjects"("curriculum_id", "subject_id");
CREATE INDEX "curriculum_subjects_curriculum_id_idx"
ON "curriculum_subjects"("curriculum_id");
CREATE INDEX "curriculum_subjects_subject_id_idx"
ON "curriculum_subjects"("subject_id");

ALTER TABLE "curriculums"
ADD CONSTRAINT "curriculums_education_program_id_fkey"
FOREIGN KEY ("education_program_id") REFERENCES "education_programs"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "curriculum_subjects"
ADD CONSTRAINT "curriculum_subjects_curriculum_id_fkey"
FOREIGN KEY ("curriculum_id") REFERENCES "curriculums"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "curriculum_subjects"
ADD CONSTRAINT "curriculum_subjects_subject_id_fkey"
FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
