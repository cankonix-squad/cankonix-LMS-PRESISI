-- CreateEnum
CREATE TYPE "PersonStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL,
    "personnel_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "rank" TEXT,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" "PersonStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_accounts" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "external_auth_id" TEXT,
    "username" TEXT,
    "email" TEXT,
    "status" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_organizations" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "position_name" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "persons_personnel_number_key" ON "persons"("personnel_number");

-- CreateIndex
CREATE INDEX "persons_status_idx" ON "persons"("status");

-- CreateIndex
CREATE INDEX "persons_full_name_idx" ON "persons"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_person_id_key" ON "user_accounts"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_accounts_external_auth_id_key" ON "user_accounts"("external_auth_id");

-- CreateIndex
CREATE INDEX "user_accounts_status_idx" ON "user_accounts"("status");

-- CreateIndex
CREATE INDEX "person_organizations_person_id_idx" ON "person_organizations"("person_id");

-- CreateIndex
CREATE INDEX "person_organizations_organization_id_idx" ON "person_organizations"("organization_id");

-- CreateIndex
CREATE INDEX "person_organizations_start_date_idx" ON "person_organizations"("start_date");

-- CreateIndex
CREATE INDEX "person_organizations_person_id_is_primary_idx" ON "person_organizations"("person_id", "is_primary");

-- AddForeignKey
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_organizations" ADD CONSTRAINT "person_organizations_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_organizations" ADD CONSTRAINT "person_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
