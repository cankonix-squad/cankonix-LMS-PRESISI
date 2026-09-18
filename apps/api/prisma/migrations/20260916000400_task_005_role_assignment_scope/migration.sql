-- CreateEnum
CREATE TYPE "UserRoleAssignmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('ORGANIZATION', 'PROGRAM', 'BATCH', 'CLASS', 'CLASS_SUBJECT');

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "user_account_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "status" "UserRoleAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_assignment_scopes" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "scope_type" "ScopeType" NOT NULL,
    "scope_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_assignment_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_role_assignments_user_account_id_idx" ON "user_role_assignments"("user_account_id");

-- CreateIndex
CREATE INDEX "user_role_assignments_role_id_idx" ON "user_role_assignments"("role_id");

-- CreateIndex
CREATE INDEX "user_role_assignments_status_idx" ON "user_role_assignments"("status");

-- CreateIndex
CREATE INDEX "user_role_assignments_valid_from_valid_until_idx" ON "user_role_assignments"("valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "role_assignment_scopes_assignment_id_idx" ON "role_assignment_scopes"("assignment_id");

-- CreateIndex
CREATE INDEX "role_assignment_scopes_scope_type_scope_id_idx" ON "role_assignment_scopes"("scope_type", "scope_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_assignment_scopes_assignment_id_scope_type_scope_id_key" ON "role_assignment_scopes"("assignment_id", "scope_type", "scope_id");

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_account_id_fkey" FOREIGN KEY ("user_account_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignment_scopes" ADD CONSTRAINT "role_assignment_scopes_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "user_role_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
