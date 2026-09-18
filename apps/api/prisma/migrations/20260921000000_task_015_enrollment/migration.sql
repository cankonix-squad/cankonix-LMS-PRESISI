CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'COMPLETED');

CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "education_batch_id" UUID NOT NULL,
    "academic_class_id" UUID,
    "enrollment_number" TEXT,
    "enrolled_at" DATE NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "completed_at" DATE,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "enrollments_enrollment_number_key"
ON "enrollments"("enrollment_number");
CREATE INDEX "enrollments_person_id_idx" ON "enrollments"("person_id");
CREATE INDEX "enrollments_education_batch_id_idx"
ON "enrollments"("education_batch_id");
CREATE INDEX "enrollments_academic_class_id_idx"
ON "enrollments"("academic_class_id");
CREATE INDEX "enrollments_status_idx" ON "enrollments"("status");
CREATE UNIQUE INDEX "enrollments_person_id_education_batch_id_key"
ON "enrollments"("person_id", "education_batch_id");

ALTER TABLE "enrollments"
ADD CONSTRAINT "enrollments_person_id_fkey"
FOREIGN KEY ("person_id") REFERENCES "persons"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enrollments"
ADD CONSTRAINT "enrollments_education_batch_id_fkey"
FOREIGN KEY ("education_batch_id") REFERENCES "education_batches"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enrollments"
ADD CONSTRAINT "enrollments_academic_class_id_fkey"
FOREIGN KEY ("academic_class_id") REFERENCES "academic_classes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
