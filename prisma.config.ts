import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Variables already set in the shell (e.g. the test DATABASE_URL from the Makefile) win over .env.
if (existsSync(".env")) process.loadEnvFile();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Not env(): that throws when unset, and `prisma generate` (postinstall, Docker builds) needs no database.
    url: process.env.DATABASE_URL,
  },
});
