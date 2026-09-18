# Lemdiklat Polri LMS

Foundation monorepo for the Lemdiklat Polri LMS. This repository currently contains TASK-000 only: workspace tooling, independent portal shells, a NestJS API health endpoint, Prisma initialization, local infrastructure configuration, and CI skeletons.

## Requirements

- Node.js 22 LTS or newer within the range in `package.json`
- pnpm 10.34.5
- Docker with Docker Compose for local PostgreSQL, Redis, MinIO, and Keycloak

## Setup

```bash
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
docker compose up -d --wait
```

The sample `.env.example` files contain placeholders only. Change the `change-me` values before using shared or deployed environments.

## Development

```bash
pnpm dev
pnpm --filter @lms/api dev
pnpm --filter @lms/admin dev
pnpm --filter @lms/educator dev
pnpm --filter @lms/student dev
pnpm --filter @lms/executive dev
```

Ports:

- API: `http://localhost:4000`
- Admin: `http://localhost:3000`
- Educator: `http://localhost:3001`
- Student: `http://localhost:3002`
- Executive: `http://localhost:3003`

## API

- Health: `GET /api/v1/health` (public)
- Current user: `GET /api/v1/me` (requires `Authorization: Bearer <token>`)
- Swagger UI: `/api/v1/docs`
- OpenAPI JSON: `/api/v1/docs-json`

The health endpoint reports API process liveness. Infrastructure readiness is owned by a later task.

## Authentication

The API is an OIDC **resource server**. Keycloak issues access tokens; the API only validates them.

- Access tokens must be RS256/RS384/RS512 signed by the configured issuer and carry the configured audience.
- Signature, `iss`, `aud`, `exp` and `nbf` are validated against the issuer's JWKS.
- The token subject is mapped to `UserAccount.externalAuthId`. Unmapped subjects are rejected with `401`; accounts or persons that are not `ACTIVE` are rejected with `403`.
- Authorization (Permission + Scope) is enforced by the LMS, never delegated to Keycloak. The API stores no passwords, tokens or client secrets.

Configuration (`apps/api/.env.example`):

| Variable                           | Required | Purpose                                                             |
| ---------------------------------- | -------- | ------------------------------------------------------------------- |
| `KEYCLOAK_ISSUER`                  | yes      | Expected `iss` claim, e.g. `http://localhost:8080/realms/lemdiklat` |
| `KEYCLOAK_AUDIENCE`                | yes      | Expected `aud` claim, e.g. `lemdiklat-api`                          |
| `KEYCLOAK_JWKS_URI`                | no       | JWKS endpoint; derived from the issuer by default                   |
| `AUTH_CLOCK_SKEW_SECONDS`          | no       | Clock skew tolerance (default `30`)                                 |
| `AUTH_JWKS_CACHE_SECONDS`          | no       | JWKS cache lifetime (default `300`)                                 |
| `AUTH_JWKS_TIMEOUT_MS`             | no       | JWKS request timeout (default `5000`)                               |
| `AUTH_LAST_LOGIN_THROTTLE_SECONDS` | no       | Minimum interval between `lastLoginAt` writes (default `300`)       |
| `DOCS_ENABLED`                     | no       | Swagger UI toggle; enabled outside production by default            |

If authentication is unconfigured or misconfigured, protected routes fail **closed** with `401`; a production instance refuses to start.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @lms/api db:validate
pnpm --filter @lms/api db:generate
```

Prisma is initialized with PostgreSQL. Schema changes are introduced only through migrations owned by the task that needs them.

## Package Layout

- `apps/admin`, `apps/educator`, `apps/student`, `apps/executive`: independent Next.js apps
- `apps/api`: NestJS modular monolith foundation
- `packages/ui`: shared React UI primitives
- `packages/api-client`: typed API client boundary
- `packages/types`: shared API contract types
- `packages/auth`, `packages/validation`, `packages/config`: reserved shared foundations for later tasks
- `packages/eslint-config`, `packages/tsconfig`: shared engineering configuration

## Dependencies Added

- Turborepo and pnpm workspace tooling for the locked monorepo architecture
- Next.js, React, Tailwind, and shadcn-compatible app configuration for the four frontends
- NestJS, Swagger, class-validator, and Prisma for the API foundation
- ESLint, Prettier, and TypeScript for baseline code quality

No LMS business feature dependencies were added in TASK-000.
