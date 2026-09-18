CREATE TYPE "EducationProgramStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "education_programs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "EducationProgramStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_programs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "education_programs_organization_id_code_key"
ON "education_programs"("organization_id", "code");
CREATE INDEX "education_programs_organization_id_idx"
ON "education_programs"("organization_id");
CREATE INDEX "education_programs_status_idx"
ON "education_programs"("status");

ALTER TABLE "education_programs"
ADD CONSTRAINT "education_programs_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
