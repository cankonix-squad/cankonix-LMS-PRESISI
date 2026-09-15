# TASK-000 — Foundation

**Status:** DONE-WITH-DEFERRED

## Recovery Note

Dokumen ini dibuat ulang sebagai recovery governance setelah folder `tasks/` diperbarui dengan implementation specification v2.

Source code hasil TASK-000 tetap ada dan tidak boleh dibuat ulang, dihapus, atau diubah dalam langkah recovery ini.

## Objective

Menetapkan foundation repository sesuai locked architecture:

- Monorepo pnpm + Turborepo.
- Aplikasi frontend independen: admin, educator, student, executive.
- Backend NestJS modular monolith.
- Prisma dengan PostgreSQL.
- Konfigurasi infrastruktur lokal untuk PostgreSQL, Redis, MinIO, dan Keycloak.
- Baseline lint, typecheck, test, build, dan Prisma validation/generation.

## Architecture References

- `docs/00-project-overview.md`
- `docs/01-solution-architecture.md`
- `docs/02-domain-architecture.md`
- `docs/03-data-architecture.md`
- `docs/04-authorization-model.md`
- `docs/05-api-standards.md`
- `docs/06-database-standards.md`
- `docs/07-security-standards.md`
- `docs/08-frontend-architecture.md`
- `docs/09-backend-architecture.md`
- `docs/10-infrastructure.md`
- `docs/11-coding-standards.md`
- `docs/12-development-workflow.md`

## Verified PASS

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Prisma `db:validate`
- Prisma `db:generate`

## Verification DEFERRED

- Docker Compose runtime
- PostgreSQL container runtime
- Redis container runtime
- MinIO container runtime
- Keycloak container runtime

## Deferred Verification Rule

Deferred infrastructure verification is not a blocker for the next development task when the next task does not technically depend on that runtime verification.

Deferred infrastructure verification remains mandatory before integration testing, UAT, or production readiness.

## Implementation Boundary

This recovered TASK-000 document records the existing foundation result only. It does not authorize rebuilding TASK-000, changing source code, installing Docker, or starting TASK-001.
