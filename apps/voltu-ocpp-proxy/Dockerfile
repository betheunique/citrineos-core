# Voltu OCPP proxy image. Build context = the monorepo root (like the operator-ui image).
# Multi-stage: build in the pnpm workspace, then ship a self-contained runtime with only prod deps.

FROM --platform=${BUILDPLATFORM:-linux/amd64} node:24.16.0 AS builder
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter=@voltu/ocpp-proxy build
# Assemble an isolated runtime dir: drop dev/catalog deps, install only prod deps (ws) with npm.
RUN mkdir -p /out \
 && cp -r apps/voltu-ocpp-proxy/dist /out/dist \
 && cp apps/voltu-ocpp-proxy/package.json /out/package.json \
 && cd /out \
 && npm pkg delete devDependencies scripts \
 && npm install --omit=dev --no-audit --no-fund

FROM node:24.16.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# The proxy listens for chargers; expose the OCPP-J WebSocket port.
EXPOSE 9310
COPY --from=builder /out ./
USER node
CMD ["node", "dist/index.js"]
