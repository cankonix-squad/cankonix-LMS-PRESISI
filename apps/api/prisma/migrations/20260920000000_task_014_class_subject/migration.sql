CREATE TYPE "ClassSubjectStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'COMPLETED');

CREATE TABLE "class_subjects" (
    "id" UUID NOT NULL,
    "academic_class_id" UUID NOT NULL,
    "curriculum_subject_id" UUID NOT NULL,
    "code" TEXT,
    "display_name" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "status" "ClassSubjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_subjects_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "class_subjects_academic_class_id_idx"
ON "class_subjects"("academic_class_id");
CREATE INDEX "class_subjects_curriculum_subject_id_idx"
ON "class_subjects"("curriculum_subject_id");
CREATE INDEX "class_subjects_status_idx"
ON "class_subjects"("status");
CREATE UNIQUE INDEX "class_subjects_academic_class_id_curriculum_subject_id_key"
ON "class_subjects"("academic_class_id", "curriculum_subject_id");

ALTER TABLE "class_subjects"
ADD CONSTRAINT "class_subjects_academic_class_id_fkey"
FOREIGN KEY ("academic_class_id") REFERENCES "academic_classes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "class_subjects"
ADD CONSTRAINT "class_subjects_curriculum_subject_id_fkey"
FOREIGN KEY ("curriculum_subject_id") REFERENCES "curriculum_subjects"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
