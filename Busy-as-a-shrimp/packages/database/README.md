# Database Package

## Purpose

This package owns the Prisma schema, generated client, and migration history for the project.

## Common Commands

1. `pnpm --filter @airp/database build`
2. `pnpm --filter @airp/database validate`
3. `pnpm --filter @airp/database migrate:status`
4. `pnpm --filter @airp/database migrate:deploy`
5. `pnpm --filter @airp/database db:push`

## Notes

- The initial migration baseline is stored under `prisma/migrations/20260328161000_init`.
- Local Docker MySQL is aligned with the root `.env` values: database `busy_as_a_shrimp` and root password `123456`.
