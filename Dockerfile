# One Dockerfile for local `make app` and for AWS, so both run the same build.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# postinstall runs `prisma generate`, which needs the schema copied above.
RUN npm ci

# One-off migration job: `prisma migrate deploy` (a one-off ECS task in AWS, the `migrate` service locally).
# Installs only the Prisma CLI: package.json is cut down to `prisma`, and npm takes every version from the real lockfile.
FROM node:24-alpine AS migrate
WORKDIR /app
COPY package.json package-lock.json ./
RUN node -e 'const p=require("./package.json"); require("fs").writeFileSync("package.json", JSON.stringify({name:p.name, private:true, dependencies:{prisma:p.devDependencies.prisma}}))' \
 && npm install --no-audit --no-fund \
 && npm cache clean --force
COPY prisma.config.ts ./
COPY prisma ./prisma
USER node
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]

FROM deps AS build
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=5s --timeout=3s --retries=10 CMD wget -qO /dev/null http://127.0.0.1:3000/login || exit 1
CMD ["node", "server.js"]
