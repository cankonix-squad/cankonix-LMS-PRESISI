CREATE TYPE "MasterStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'ENDED', 'CANCELLED');

CREATE TABLE "educator_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "MasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educator_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "educator_assignments" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "class_subject_id" UUID NOT NULL,
    "educator_type_id" UUID NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_until" DATE,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educator_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "class_staff_assignments" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "academic_class_id" UUID NOT NULL,
    "staff_type" TEXT NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_until" DATE,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_staff_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "educator_types_code_key" ON "educator_types"("code");
CREATE INDEX "educator_types_status_idx" ON "educator_types"("status");

CREATE INDEX "educator_assignments_person_id_idx"
ON "educator_assignments"("person_id");
CREATE INDEX "educator_assignments_class_subject_id_idx"
ON "educator_assignments"("class_subject_id");
CREATE INDEX "educator_assignments_educator_type_id_idx"
ON "educator_assignments"("educator_type_id");
CREATE INDEX "educator_assignments_status_idx"
ON "educator_assignments"("status");
CREATE INDEX "educator_assignments_valid_from_valid_until_idx"
ON "educator_assignments"("valid_from", "valid_until");

CREATE INDEX "class_staff_assignments_person_id_idx"
ON "class_staff_assignments"("person_id");
CREATE INDEX "class_staff_assignments_academic_class_id_idx"
ON "class_staff_assignments"("academic_class_id");
CREATE INDEX "class_staff_assignments_staff_type_idx"
ON "class_staff_assignments"("staff_type");
CREATE INDEX "class_staff_assignments_status_idx"
ON "class_staff_assignments"("status");
CREATE INDEX "class_staff_assignments_valid_from_valid_until_idx"
ON "class_staff_assignments"("valid_from", "valid_until");

ALTER TABLE "educator_assignments"
ADD CONSTRAINT "educator_assignments_person_id_fkey"
FOREIGN KEY ("person_id") REFERENCES "persons"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "educator_assignments"
ADD CONSTRAINT "educator_assignments_class_subject_id_fkey"
FOREIGN KEY ("class_subject_id") REFERENCES "class_subjects"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "educator_assignments"
ADD CONSTRAINT "educator_assignments_educator_type_id_fkey"
FOREIGN KEY ("educator_type_id") REFERENCES "educator_types"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "class_staff_assignments"
ADD CONSTRAINT "class_staff_assignments_person_id_fkey"
FOREIGN KEY ("person_id") REFERENCES "persons"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "class_staff_assignments"
ADD CONSTRAINT "class_staff_assignments_academic_class_id_fkey"
FOREIGN KEY ("academic_class_id") REFERENCES "academic_classes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
