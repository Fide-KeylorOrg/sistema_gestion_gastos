.PHONY: up down dev app migrate seed reset test

# Start the Postgres container (localhost:5434) and wait until it accepts connections.
up:
	docker compose up -d --wait db

# Stop every container (Postgres and the production image). Data is kept in the db-data volume.
down:
	docker compose --profile app down

# Run the app locally with hot reload, for day-to-day coding.
dev: up
	npm run dev

# Build and run the production image (same as AWS) on http://localhost:3100: runs pending migrations, then starts the app.
app:
	docker compose --profile app up -d --build --wait app

# Create and apply a migration after editing prisma/schema.prisma: make migrate name=add_employees
migrate: up
	npx prisma migrate dev $(if $(name),--name $(name))

# Create the fixed roles and the "admin" user (password from SEED_ADMIN_PASSWORD in .env). Safe to re-run.
seed: up
	npx prisma db seed

# Wipe all dev data, re-apply every migration and re-seed.
reset: up
	npx prisma migrate reset --force
	npx prisma db seed

# Run the tests against a separate gastos_test database, so dev data is never touched.
test: export DATABASE_URL := postgresql://gastos:gastos@localhost:5434/gastos_test
test: up
	docker compose exec -T db createdb -U gastos gastos_test 2>/dev/null || true
	npx prisma migrate deploy
	npx tsx --test "src/**/*.test.ts"
