CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" UUID,
    "organization_type" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");
CREATE INDEX "organizations_parent_id_idx" ON "organizations"("parent_id");
CREATE INDEX "organizations_status_idx" ON "organizations"("status");
CREATE INDEX "organizations_organization_type_idx" ON "organizations"("organization_type");

ALTER TABLE "organizations"
ADD CONSTRAINT "organizations_parent_id_fkey"
FOREIGN KEY ("parent_id") REFERENCES "organizations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
