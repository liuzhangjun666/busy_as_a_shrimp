FROM node:20-slim AS build
WORKDIR /workspace
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN set -eux; \
    sed -i 's/ bookworm-updates//g' /etc/apt/sources.list.d/debian.sources; \
    apt-get update -o Acquire::Retries=5 -y; \
    apt-get install -o Acquire::Retries=5 -y --no-install-recommends openssl; \
    rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @airp/database generate
RUN pnpm --filter @airp/api build

FROM node:20-slim AS runner
WORKDIR /workspace
ENV NODE_ENV=production
RUN set -eux; \
    sed -i 's/ bookworm-updates//g' /etc/apt/sources.list.d/debian.sources; \
    apt-get update -o Acquire::Retries=5 -y; \
    apt-get install -o Acquire::Retries=5 -y --no-install-recommends openssl; \
    rm -rf /var/lib/apt/lists/*
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/packages ./packages
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
CMD ["node", "apps/api/dist/main.js"]
