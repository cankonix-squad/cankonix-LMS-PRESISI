-- CreateEnum
CREATE TYPE "LearningMeetingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "learning_meetings" (
    "id" UUID NOT NULL,
    "class_subject_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "planned_start_at" TIMESTAMP(3),
    "planned_end_at" TIMESTAMP(3),
    "status" "LearningMeetingStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_meetings_class_subject_id_idx" ON "learning_meetings"("class_subject_id");

-- CreateIndex
CREATE INDEX "learning_meetings_status_idx" ON "learning_meetings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "learning_meetings_class_subject_id_sequence_key" ON "learning_meetings"("class_subject_id", "sequence");

-- AddForeignKey
ALTER TABLE "learning_meetings" ADD CONSTRAINT "learning_meetings_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

