# TASK-054 — Certificate Template / Issue / Verification

**Status:** DONE

## Dependency
TASK-053 dan TASK-022 = DONE.

## Objective
Issue certificate versioned dan public verification minimal.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
`CertificateTemplate`: id, name, version, templateObjectKey/config, status. `Certificate`: decisionId, templateId, certificateNumber unique, verificationCode unique, issuedAt, fileId nullable, status. `CertificateRevocation` task berikutnya.

## API / Application Contract
Template CRUD/version; issue certificate; authenticated read; public verify by code with minimal approved fields.

## Business Rules
Hanya eligible PASS decision. Number/code unpredictable enough. Public endpoint tidak expose PII berlebih. Issued certificate references template version.

## Acceptance Criteria
[x] eligibility; [x] unique number/code; [x] minimal public projection; [x] file storage abstraction; [x] checks green.

## Status Note (Codex — disetujui reviewer 2026-09-19)

### Endpoint

| Method | Path | Guard |
| --- | --- | --- |
| `POST` | `/api/v1/certificate-templates` | `certificate.template.manage` |
| `GET` | `/api/v1/certificate-templates` | `certificate.template.read` |
| `GET` | `/api/v1/certificate-templates/:id` | `certificate.template.read` |
| `PATCH` | `/api/v1/certificate-templates/:id` | `certificate.template.manage` |
| `PATCH` | `/api/v1/certificate-templates/:id/status` | `certificate.template.manage` |
| `POST` | `/api/v1/certificate-templates/:id/versions` | `certificate.template.manage` |
| `POST` | `/api/v1/certificates` | `certificate.issue` |
| `GET` | `/api/v1/certificates` | `certificate.read` |
| `GET` | `/api/v1/certificates/:id` | `certificate.read` |
| `PATCH` | `/api/v1/certificates/:id/file` | `certificate.issue` |
| `GET` | `/api/v1/certificates/verify?code=` | **`@Public()`** (tanpa autentikasi) |

Empat permission dipakai karena menulis template dan menerbitkan dokumen adalah
dua kewenangan yang berbeda (`certificate.template.*` vs `certificate.issue`).

### Keputusan desain yang perlu diketahui reviewer

1. **`CertificateRevocation` belum dibuat di task ini.** Spec menyatakan tabel itu
   milik task berikutnya (TASK-055). Enum `CertificateStatus` sudah memuat
   `REVOKED`, `CertificateRecord.revokedReason`/`revokedAt` sudah disiapkan, dan
   `toPublicProjection` sudah melaporkan status revoked beserta alasannya, tetapi
   belum ada endpoint atau tabel yang mengisinya.
2. **Endpoint publik mengembalikan `404` untuk kode tak dikenal**, bukan
   `{valid:false}`. Alasannya: mengembalikan objek berisi "tidak valid" untuk kode
   yang tidak ada akan menyamarkan perbedaan antara "sertifikat dicabut" dan
   "kode salah" pada beberapa bentuk respons. Perlu konfirmasi reviewer bila
   kontrak yang diinginkan justru `200 {valid:false}`.
3. **Satu decision = satu certificate** (`decisionId` unique). Pengulangan
   penerbitan ditolak `409 Conflict`, bukan menghasilkan dokumen kedua.
4. **Versi template tidak pernah datang dari body.** Ditetapkan service sebagai
   `max(version)+1` per `code`, sehingga `(code, version)` unik dan dokumen lama
   tetap menunjuk versi template yang benar.
5. **Tidak ada `delete`** pada repository maupun service; penarikan akan memindahkan
   `status` (TASK-055).

### Verification

- `pnpm lint` — PASS (11/11 task, Prettier clean)
- `pnpm typecheck` — PASS (14/14 task)
- `pnpm build` — PASS (11/11 task)
- `pnpm test` — PASS: `@lms/api` **300 pass / 0 fail** (22 test baru di
  `certificate.test.cjs`), `@lms/api-client` 6 pass / 0 fail
- `pnpm db:validate` — PASS
- Migration fidelity — `OK: 17 statements verbatim`
  (`20261009000400_task_054_certificate` vs `prisma migrate diff --from-empty`)
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
