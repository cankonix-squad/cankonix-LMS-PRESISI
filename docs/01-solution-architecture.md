# Solution Architecture

## Stack
Next.js + TypeScript + Tailwind + shadcn/ui; NestJS + TypeScript; PostgreSQL + Prisma; Redis + BullMQ; MinIO/S3; Keycloak; Docker; Nginx; REST/OpenAPI. Monorepo uses pnpm + Turborepo.

## Deployable units
`apps/admin`, `apps/educator`, `apps/student`, `apps/executive`, `apps/api`. Each frontend has independent build/container/release. API is stateless and horizontally scalable.

## Backend style
Modular Monolith. Controller -> Application Service -> Domain/Business Logic -> Repository -> Prisma -> PostgreSQL.

## Environments
LOCAL, DEV, UAT, PROD with isolated DB/Redis/storage/secrets/Keycloak configuration.

## Evolution
Do not start with microservices, Kafka, Kubernetes or a data warehouse. Exam can be extracted later only if measured concurrency requires it. Reporting can evolve to a separate analytics pipeline later.
