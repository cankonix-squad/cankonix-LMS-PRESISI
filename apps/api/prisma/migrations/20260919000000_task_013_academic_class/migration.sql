-- CreateEnum
CREATE TYPE "AcademicClassStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "academic_classes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "education_batch_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "status" "AcademicClassStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_classes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_classes_education_batch_id_code_key" ON "academic_classes"("education_batch_id", "code");

-- CreateIndex
CREATE INDEX "academic_classes_education_batch_id_idx" ON "academic_classes"("education_batch_id");

-- CreateIndex
CREATE INDEX "academic_classes_status_idx" ON "academic_classes"("status");

-- AddForeignKey
ALTER TABLE "academic_classes" ADD CONSTRAINT "academic_classes_education_batch_id_fkey" FOREIGN KEY ("education_batch_id") REFERENCES "education_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
