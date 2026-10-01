# TASK-065 — Executive Portal UI

**Status:** DONE

## Dependency
TASK-061, TASK-062, TASK-063, TASK-064 = DONE.

## Objective
Read-heavy executive portal dengan drilldown.

## Mandatory References
`docs/02-domain-architecture.md`, `docs/03-data-architecture.md`, `docs/05-api-standards.md`, `docs/06-database-standards.md`, `docs/07-security-standards.md`, `docs/09-backend-architecture.md`

## Data Model / Persistence
Tidak ada transactional persistence baru.

## API / Application Contract
Overview KPI cards/charts/tables, filters, drilldown path, trend views via Reporting API only.

## Business Rules
Executive FE tidak mengaggregate banyak transactional endpoints. Scope/API authoritative. Loading/empty/error/export if already standardized.

## Acceptance Criteria
[x] Executive app builds independently; [x] drill-down navigation follows the Reporting API hierarchy; [x] responsive tables, navigation, and KPI views; [x] no transactional endpoint aggregation in the frontend; [x] available checks green.

## Implementation Summary

- Replaced the Executive placeholder page with an authenticated, read-only reporting dashboard using the typed `@lms/api-client` Reporting endpoints only.
- Added Executive overview KPI cards, date/scope filters, a progress/attendance comparison chart built from the API breakdown, a responsive breakdown table, and row links into the hierarchy.
- Added KPI detail, hierarchy drill-down, and graduation trend pages with API-backed filters, distributions, attention rows, pagination, trend visualization, empty/error states, and a responsive loading skeleton.
- Added a shared Executive shell and presentation primitives. The drill-down breadcrumb shows hierarchy levels supplied by the API; the API intentionally does not return ancestor IDs or names for those crumbs.
- Corrected the Executive API fallback to `http://localhost:4000`, matching the documented API port. Scope-specific filters include `scopeId`; national requests omit it.
- Kept Permission + Scope enforcement server-side. The frontend does not inspect roles or aggregate transactional endpoints.
- Kept OIDC login server-side and made its state/access-token cookies use `secure` only on HTTPS, so local HTTP callback flows can work without changing HTTPS behavior.
- Configured the Executive production build script to use Webpack, which completed successfully in this environment.
- No database schema, migration, API contract, backend business logic, or dependency changes.

## Verification

- PASS: Executive ESLint (`eslint .`).
- PASS: Executive route type generation and TypeScript (`next typegen`, `tsc --noEmit`).
- PASS: Executive production build (`next build --webpack`); routes generated for `/`, `/drilldown`, `/kpi`, `/trend`, `/login`, and OIDC handlers.
- PASS: standalone production server smoke check; `/login` returns HTTP 200 and an anonymous `/` request signals redirect to `/login`.
- PASS: Prettier check for Executive source and package manifest; `git diff --check`.
- PASS: API tests run directly with Node: 446/446.
- PASS: API client tests run directly with Node: 9/9.
- The repo Turbo test wrapper could not start because the configured pnpm shim could not verify its package-manager signature while the registry was unreachable. Running the same built test suites directly with Node succeeded.
- DEFERRED: live Keycloak/OIDC callback and protected Reporting API verification; no Keycloak realm/runtime or OIDC credentials are configured locally.
- DEFERRED: live PostgreSQL-backed reporting/read-model verification; no local PostgreSQL/container runtime is available.

## Review Notes

- Dashboard and trend visuals display values returned by the reporting read model; frontend code does not query or combine transactional domain endpoints.
- API authorization remains authoritative. A valid Executive session without `reporting.executive.read` receives the backend's denied response, shown through the page error state.
- Local login cannot complete until a Keycloak realm/client and `LMS_OIDC_ISSUER`/`LMS_OIDC_CLIENT_ID` are provided.

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
