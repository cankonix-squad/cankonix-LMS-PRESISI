-- CreateEnum
CREATE TYPE "LearningProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "learning_progress" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "status" "LearningProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "last_accessed_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_subject_progress_aggregates" (
    "id" UUID NOT NULL,
    "class_subject_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "total_activities" INTEGER NOT NULL DEFAULT 0,
    "completed_activities" INTEGER NOT NULL DEFAULT 0,
    "required_activities" INTEGER NOT NULL DEFAULT 0,
    "completed_required_activities" INTEGER NOT NULL DEFAULT 0,
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMP(3),
    "recalculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_subject_progress_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_progress_enrollment_id_status_idx" ON "learning_progress"("enrollment_id", "status");

-- CreateIndex
CREATE INDEX "learning_progress_activity_id_idx" ON "learning_progress"("activity_id");

-- CreateIndex
CREATE INDEX "learning_progress_status_idx" ON "learning_progress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "learning_progress_enrollment_id_activity_id_key" ON "learning_progress"("enrollment_id", "activity_id");

-- CreateIndex
CREATE INDEX "class_subject_progress_aggregates_class_subject_id_progress_idx" ON "class_subject_progress_aggregates"("class_subject_id", "progress_percent");

-- CreateIndex
CREATE INDEX "class_subject_progress_aggregates_enrollment_id_idx" ON "class_subject_progress_aggregates"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_subject_progress_aggregates_class_subject_id_enrollme_key" ON "class_subject_progress_aggregates"("class_subject_id", "enrollment_id");

-- AddForeignKey
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "learning_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

