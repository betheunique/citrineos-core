# Voltu bridge emitter image. Build context = the monorepo root (like the operator-ui image).
# Multi-stage: build in the pnpm workspace, then ship a self-contained runtime with only prod deps.

FROM --platform=${BUILDPLATFORM:-linux/amd64} node:24.16.0 AS builder
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter=@voltu/bridge-emitter build
# Assemble an isolated runtime dir: drop dev/catalog deps, install only prod deps (pg) with npm.
RUN mkdir -p /out \
 && cp -r apps/voltu-bridge-emitter/dist /out/dist \
 && cp apps/voltu-bridge-emitter/package.json /out/package.json \
 && cd /out \
 && npm pkg delete devDependencies scripts \
 && npm install --omit=dev --omit=optional --no-audit --no-fund

FROM node:24.16.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /out ./
USER node
CMD ["node", "dist/index.js"]
