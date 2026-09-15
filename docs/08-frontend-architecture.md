# Frontend Architecture

Four independent Next.js apps. Feature-oriented structure: `src/app`, `src/features`, `src/components`, `src/hooks`, `src/lib`, `src/providers`. Business components stay in their app; `packages/ui` contains generic primitives only. Student is mobile-first. Executive is read-heavy/read-mostly. Frontends consume API DTO/contracts, never Prisma models.
