# Database Standards

PostgreSQL + Prisma. Every schema change uses migrations. No Prisma from controllers. Use transactions for consistency boundaries. Add indexes from real access patterns. Preserve historical data. Do not store file binaries in DB. Avoid JSONB as a substitute for relational core design. Use consistent timestamps. Soft-delete only where justified.
