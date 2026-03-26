FROM node:22-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist

RUN mkdir -p /data
ENV DATABASE_PATH=/data/sudacchi.db
ENV MODE=slack
ENV NODE_ENV=production
ENV TZ=Asia/Tokyo

CMD ["node", "dist/index.js"]
