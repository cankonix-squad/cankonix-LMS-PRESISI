# TASK-067 — Production Zero-Downtime Deployment Foundation

## Status

`REVIEW`

## Goal

Membuat deployment production lebih aman dengan readiness healthcheck, deploy service yang berubah saja, verifikasi setelah restart, dan rollback otomatis untuk image aplikasi jika deploy gagal.

## Scope tahap ini

- Docker healthcheck untuk database, Keycloak, API, dan empat frontend.
- API/frontend hanya diarahkan ke traffic setelah container berstatus `healthy`.
- Workflow memilih service berdasarkan file yang berubah.
- Image aplikasi aktif diberi tag rollback sebelum build.
- Kegagalan build, start, migration, atau smoke test memulihkan image aplikasi sebelumnya.
- Migration database tidak dibatalkan otomatis; rollback schema memerlukan prosedur migration yang kompatibel dan review terpisah.

## Deferred

- Blue-green deployment penuh dengan dua environment aplikasi dan switch routing Traefik.
- Multi-replica rolling deployment; Compose saat ini masih berjalan pada satu VPS dengan satu instance per portal/API.
- Backup dan restore otomatis database/object storage/Keycloak.

## References

- `AGENTS.md`
- `docs/10-infrastructure.md`
- `docs/07-security-standards.md`
- `docs/12-development-workflow.md`
- `docker-compose.production.yml`
- `.github/workflows/deploy-production.yml`

## Acceptance checklist

- [ ] PostgreSQL, Redis, Keycloak, API, dan portal memiliki readiness healthcheck.
- [ ] Push yang hanya mengubah Educator tidak me-restart Admin, Student, atau Executive.
- [ ] Workflow menunggu service sehat sebelum migration dan smoke test.
- [ ] Deploy gagal mengembalikan image service aplikasi sebelumnya.
- [ ] API health dan seluruh URL publik tetap diverifikasi.
- [ ] Workflow memiliki batas waktu dan mencegah deployment bersamaan.
- [ ] `docker compose config` valid.
- [ ] Lint/format workflow dan dokumentasi valid.
- [ ] Task dipindahkan ke `REVIEW`; Codex tidak menandai `DONE`.

## Verification

- `docker compose config --quiet` dengan environment check — PASS.
- Workflow remote deployment script `bash -n` — PASS.
- Prettier check untuk Compose, workflow, tasklist, dan master checklist — PASS.
- `mc ready local` pada image MinIO production — PASS.
- Runtime deployment dengan healthcheck baru dan rollback belum dijalankan ke production; menunggu review sebelum merge.

Task siap direview. Codex tidak menandai task ini `DONE`.
