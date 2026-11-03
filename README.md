# sistema_gestion_gastos

Payroll and administrative expense management for Supermercado Los Ángeles. Requirements and user stories are in [`docs/`](docs/).

Next.js 16 (App Router, Cache Components) + Prisma 7 + PostgreSQL 17.

## Setup

Requires Node 24+, Docker and `make`.

```bash
cp .env.example .env   # then set SEED_ADMIN_PASSWORD
make install
make migrate           # starts Postgres in Docker (localhost:5434) and applies migrations
make seed              # creates the "Administrador" role and the "admin" user
make dev
```

| Command | What it does |
| --- | --- |
| `make migrate name=add_x` | Create a migration after editing `prisma/schema.prisma` |
| `make test` | Run tests against a separate `gastos_test` database |
| `make lint` / `make build` | Lint / production build |
| `make reset` | Wipe the dev database, re-apply migrations, re-seed |
| `make down` | Stop Postgres |

## Conventions

- **Authorization:** every page and Server Action that touches protected data calls `requirePermission("...")` from `src/lib/auth.ts`. Hiding a menu link is not access control.
- **Permissions:** keys live in `src/lib/permissions.ts` (English, e.g. `payroll.salaries`). Text shown on screen is in Spanish.
- **Sessions:** stored in the `Session` table and expire after 10 minutes of inactivity (RQNF-007). Deactivating a user ends their sessions on the next request.
- **Audit log:** write with `audit()` from `src/lib/audit.ts`. The table is append-only at the database level.
- **Cache Components:** read the session only inside a `<Suspense>` boundary. Pages under `src/app/(app)` get one from `loading.tsx`.
- **Tests:** `*.test.ts` next to the code, using `node:test` run through `tsx`.
