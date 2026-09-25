-- TASK-064 — Graduation & Trend Reporting
-- Store in-force graduation decision outcomes in the reporting read model so
-- trend endpoints can answer pass/fail/remedial without touching transactional
-- graduation tables on the read path.

ALTER TABLE "reporting_metrics"
  ADD COLUMN "graduation_pass_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "graduation_fail_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "graduation_remedial_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "graduation_withdrawn_count" INTEGER NOT NULL DEFAULT 0;
