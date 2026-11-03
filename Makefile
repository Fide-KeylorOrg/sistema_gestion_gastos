TEST_DATABASE_URL := postgresql://gastos:gastos@localhost:5434/gastos_test

.PHONY: install up down migrate seed dev build lint test reset

install:
	npm install

up:
	docker compose up -d --wait

down:
	docker compose down

# make migrate name=add_employees  creates and applies a new migration after editing prisma/schema.prisma
migrate: up
	npx prisma migrate dev $(if $(name),--name $(name))
	npx prisma generate

seed: up
	npx prisma db seed

dev: up
	npm run dev

build:
	npm run build

lint:
	npm run lint

# Tests run against a separate gastos_test database so the dev data is never touched.
test: up
	docker compose exec -T db createdb -U gastos gastos_test 2>/dev/null || true
	DATABASE_URL=$(TEST_DATABASE_URL) npx prisma migrate deploy
	DATABASE_URL=$(TEST_DATABASE_URL) npx tsx --test "src/**/*.test.ts"

# Drops all dev data, re-applies migrations and re-seeds.
reset: up
	npx prisma migrate reset --force
	npx prisma db seed
