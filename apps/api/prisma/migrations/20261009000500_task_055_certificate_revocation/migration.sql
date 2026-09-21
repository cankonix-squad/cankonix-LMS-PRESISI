-- TASK-055: certificate revocation evidence.
--
-- One table, `certificate_revocations`, holding who withdrew a certificate,
-- when, and why. `certificate_id` is UNIQUE so a certificate is revoked at most
-- once; there is no DELETE path, because revocation withdraws a document
-- without erasing the fact that it was issued.

-- CreateTable
CREATE TABLE "certificate_revocations" (
    "id" UUID NOT NULL,
    "certificate_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "revoked_by_user_id" UUID,
    "revoked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_revocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificate_revocations_certificate_id_key" ON "certificate_revocations"("certificate_id");

-- CreateIndex
CREATE INDEX "certificate_revocations_revoked_by_user_id_idx" ON "certificate_revocations"("revoked_by_user_id");

-- CreateIndex
CREATE INDEX "certificate_revocations_revoked_at_idx" ON "certificate_revocations"("revoked_at");

-- AddForeignKey
ALTER TABLE "certificate_revocations" ADD CONSTRAINT "certificate_revocations_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_revocations" ADD CONSTRAINT "certificate_revocations_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
