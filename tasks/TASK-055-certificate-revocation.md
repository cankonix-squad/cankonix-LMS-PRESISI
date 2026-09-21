# TASK-055 — Certificate Revocation

**Status:** DONE

## Dependency
TASK-054 dan TASK-006 = DONE.

## Objective
Mencabut sertifikat tanpa menghapus histori.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`CertificateRevocation`: certificateId, reason, revokedBy, revokedAt; preserve certificate record/status.

## API / Application Contract
Revoke endpoint; verification reflects revoked status and approved minimal reason/status.

## Business Rules
No hard delete. Revoke idempotency/policy. Audit mandatory.

## Acceptance Criteria
[x] revoked verification; [x] history; [x] audit; [x] checks green.

## Status Note (Codex — disetujui reviewer 2026-09-19)

### Endpoint

| Method | Path | Guard |
| --- | --- | --- |
| `PATCH` | `/api/v1/certificates/:id/revoke` | `certificate.revoke` |

Permission `certificate.revoke` **terpisah** dari `certificate.issue`. Mencabut
dokumen yang sudah dipakai institusi adalah tindakan berbeda dari menerbitkannya,
dan harus bisa diberikan ke fungsi pengawasan/compliance tanpa sekaligus
memberi kemampuan membuat sertifikat.

### Keputusan desain yang perlu diketahui reviewer

1. **Tidak ada un-revoke.** `REVOKED` bersifat terminal. Mengembalikan sertifikat
yang salah dicabut dilakukan dengan penerbitan baru bernomor baru, sehingga
pencabutan lama dan koreksinya sama-sama tetap terlihat. Ini juga alasan
`certificateId` dibuat `@unique` pada `certificate_revocations`.
2. **Revoke ulang ditolak (`409 Conflict`), bukan dianggap no-op.** Policy yang
dipilih adalah "alasan pertama menang": hanya ada satu alasan otoritatif,
bukan tumpukan yang harus ditafsirkan. Perlu konfirmasi reviewer bila policy yang
diinginkan justru menambah baris bukti baru.
3. **Status dan bukti ditulis dalam satu transaksi** (`prisma.$transaction`),
sehingga tidak mungkin ada sertifikat berstatus `REVOKED` tanpa alasan tercatat,
atau sebaliknya.
4. **Alasan wajib dan minimal 8 karakter** — divalidasi di DTO (`@MinLength(8)`)
dan diulang di domain rule, karena alasan adalah satu-satunya bagian rekaman yang
tidak bisa direkonstruksi dari data lain.
5. **Tidak ada `delete`/`update`** pada `certificate_revocations` maupun pada
repository, sehingga bukti bersifat immutable seperti audit trail (TASK-006).

### Verification

- `pnpm lint` — PASS (11/11 task, Prettier clean)
- `pnpm typecheck` — PASS (14/14 task)
- `pnpm build` — PASS (11/11 task)
- `pnpm test` — PASS: `@lms/api` **312 pass / 0 fail** (12 test baru di
  `certificate-revocation.test.cjs`), `@lms/api-client` 6 pass / 0 fail
- `pnpm db:validate` — PASS
- Migration fidelity — `OK: 6 statements verbatim`
  (`20261009000500_task_055_certificate_revocation` vs `prisma migrate diff --from-empty`)
- `prisma migrate deploy` — **DEFERRED**: Docker/runtime container tidak tersedia
  di environment ini. Bukan blocker teknis; migration sudah diverifikasi verbatim
  terhadap output kanonik Prisma.

## Aturan Implementasi Wajib
- Baca `AGENTS.md`, `tasks/MASTER-CHECKLIST.md`, dan dokumen pada `docs/` yang relevan sebelum coding.
- Backend tetap **NestJS Modular Monolith**. Jangan membuat microservice.
- Alur backend: Controller → Application Service → Domain/Business Logic → Repository → Prisma → PostgreSQL. Controller tidak boleh mengakses Prisma langsung.
- Semua input API divalidasi; perubahan database memakai Prisma migration; business logic baru wajib memiliki test.
- Gunakan `/api/v1`; jangan hardcode role untuk authorization. Permission + scope tetap menjadi security boundary.
- Jangan mengerjakan task berikutnya secara oportunistik.
- Jika Docker/database runtime tidak tersedia, verification runtime boleh dicatat `DEFERRED` hanya bila bukan blocker teknis task. Jangan menginstal runtime container otomatis.
- Setelah implementasi dan verification yang tersedia berhasil, ubah status task menjadi `REVIEW`, update `MASTER-CHECKLIST`, lalu STOP. Codex tidak boleh menandai `DONE`.

## Laporan Akhir Codex
Laporkan file dibuat/diubah, migration/schema, endpoint, test, hasil lint/typecheck/test/build, verification yang DEFERRED, issue/risiko, dan konfirmasi bahwa task berikutnya tidak dikerjakan.
