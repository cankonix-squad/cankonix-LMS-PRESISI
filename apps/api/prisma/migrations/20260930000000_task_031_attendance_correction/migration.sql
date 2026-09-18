-- CreateEnum
CREATE TYPE "AttendanceCorrectionStatus" AS ENUM ('PENDING', 'APPLIED', 'REJECTED');

-- CreateTable
CREATE TABLE "attendance_corrections" (
    "id" UUID NOT NULL,
    "attendance_record_id" UUID NOT NULL,
    "previous_status" "AttendanceStatus" NOT NULL,
    "new_status" "AttendanceStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "requested_by_user_id" UUID,
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMP(3),
    "status" "AttendanceCorrectionStatus" NOT NULL DEFAULT 'APPLIED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_corrections_attendance_record_id_created_at_idx" ON "attendance_corrections"("attendance_record_id", "created_at");

-- CreateIndex
CREATE INDEX "attendance_corrections_requested_by_user_id_idx" ON "attendance_corrections"("requested_by_user_id");

-- CreateIndex
CREATE INDEX "attendance_corrections_approved_by_user_id_idx" ON "attendance_corrections"("approved_by_user_id");

-- CreateIndex
CREATE INDEX "attendance_corrections_status_idx" ON "attendance_corrections"("status");

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append-only guard: a correction is history, so it may never be updated or deleted.
CREATE OR REPLACE FUNCTION prevent_attendance_correction_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'attendance_corrections is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_corrections_no_update
    BEFORE UPDATE ON "attendance_corrections"
    FOR EACH ROW EXECUTE FUNCTION prevent_attendance_correction_mutation();

CREATE TRIGGER attendance_corrections_no_delete
    BEFORE DELETE ON "attendance_corrections"
    FOR EACH ROW EXECUTE FUNCTION prevent_attendance_correction_mutation();
