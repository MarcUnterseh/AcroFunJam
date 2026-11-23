# Image of the website: the build of Vite served by Caddy, which also passes the API routes on (ADR 0040).
# Build context: the root of the repository.  docker build -f deploy/web.Dockerfile .

FROM node:26-alpine AS build
WORKDIR /src/front
COPY front/package.json front/package-lock.json ./
COPY front/apps/web/package.json apps/web/
COPY front/packages/core/package.json packages/core/
COPY front/packages/api-client/package.json packages/api-client/
COPY front/packages/ui-tokens/package.json packages/ui-tokens/
RUN npm ci --workspace @acrofunjam/web --include-workspace-root --ignore-scripts
COPY front/ ./
# Types are checked by the CI (npm run typecheck); the image only bundles.
RUN npx --workspace @acrofunjam/web vite build

FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/front/apps/web/dist /srv
