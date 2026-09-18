-- CreateEnum
CREATE TYPE "StoredFileStatus" AS ENUM ('PENDING', 'UPLOADED', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "stored_files" (
    "id" UUID NOT NULL,
    "object_key" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "owner_user_id" UUID,
    "status" "StoredFileStatus" NOT NULL DEFAULT 'PENDING',
    "uploaded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_object_key_key" ON "stored_files"("object_key");

-- CreateIndex
CREATE INDEX "stored_files_namespace_idx" ON "stored_files"("namespace");

-- CreateIndex
CREATE INDEX "stored_files_owner_user_id_idx" ON "stored_files"("owner_user_id");

-- CreateIndex
CREATE INDEX "stored_files_status_idx" ON "stored_files"("status");

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

