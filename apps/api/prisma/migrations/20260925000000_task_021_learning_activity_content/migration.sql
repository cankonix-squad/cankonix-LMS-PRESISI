-- CreateEnum
CREATE TYPE "LearningActivityStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LearningContentType" AS ENUM ('FILE', 'LINK');

-- CreateEnum
CREATE TYPE "LearningContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "learning_activity_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requires_content" BOOLEAN NOT NULL DEFAULT true,
    "status" "MasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_activity_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_activities" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "activity_type_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "available_from" TIMESTAMP(3),
    "available_until" TIMESTAMP(3),
    "status" "LearningActivityStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_contents" (
    "id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "version_group_id" UUID NOT NULL,
    "content_type" "LearningContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "object_key" TEXT,
    "external_url" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "LearningContentStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learning_activity_types_code_key" ON "learning_activity_types"("code");

-- CreateIndex
CREATE INDEX "learning_activity_types_status_idx" ON "learning_activity_types"("status");

-- CreateIndex
CREATE INDEX "learning_activities_meeting_id_idx" ON "learning_activities"("meeting_id");

-- CreateIndex
CREATE INDEX "learning_activities_activity_type_id_idx" ON "learning_activities"("activity_type_id");

-- CreateIndex
CREATE INDEX "learning_activities_status_idx" ON "learning_activities"("status");

-- CreateIndex
CREATE UNIQUE INDEX "learning_activities_meeting_id_sequence_key" ON "learning_activities"("meeting_id", "sequence");

-- CreateIndex
CREATE INDEX "learning_contents_activity_id_idx" ON "learning_contents"("activity_id");

-- CreateIndex
CREATE INDEX "learning_contents_version_group_id_idx" ON "learning_contents"("version_group_id");

-- CreateIndex
CREATE INDEX "learning_contents_status_idx" ON "learning_contents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "learning_contents_version_group_id_version_key" ON "learning_contents"("version_group_id", "version");

-- AddForeignKey
ALTER TABLE "learning_activities" ADD CONSTRAINT "learning_activities_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "learning_meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_activities" ADD CONSTRAINT "learning_activities_activity_type_id_fkey" FOREIGN KEY ("activity_type_id") REFERENCES "learning_activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_contents" ADD CONSTRAINT "learning_contents_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "learning_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

