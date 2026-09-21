-- TASK-054: certificate templates and issued certificates.
--
-- Templates are versioned on (code, version) so a certificate always names the
-- exact design it was printed from. A certificate points at one approved
-- graduation decision (unique FK), and stores two CSPRNG-generated values: the
-- human-facing certificate number and the public verification code. The rendered
-- document lives in object storage; only a pointer is kept here.

-- CreateEnum
CREATE TYPE "CertificateTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CertificateStatus" AS ENUM ('ISSUED', 'REVOKED');

-- CreateTable
CREATE TABLE "certificate_templates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "CertificateTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "template_object_key" TEXT,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL,
    "decision_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "verification_code" TEXT NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'ISSUED',
    "issued_at" TIMESTAMP(3) NOT NULL,
    "issued_by_user_id" UUID,
    "file_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certificate_templates_status_idx" ON "certificate_templates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_templates_code_version_key" ON "certificate_templates"("code", "version");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_decision_id_key" ON "certificates"("decision_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificate_number_key" ON "certificates"("certificate_number");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_verification_code_key" ON "certificates"("verification_code");

-- CreateIndex
CREATE INDEX "certificates_template_id_idx" ON "certificates"("template_id");

-- CreateIndex
CREATE INDEX "certificates_status_idx" ON "certificates"("status");

-- CreateIndex
CREATE INDEX "certificates_issued_at_idx" ON "certificates"("issued_at");

-- CreateIndex
CREATE INDEX "certificates_issued_by_user_id_idx" ON "certificates"("issued_by_user_id");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "graduation_decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "certificate_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_user_id_fkey" FOREIGN KEY ("issued_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "stored_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
