FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9.15.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY apps/client/package.json ./apps/client/
COPY apps/server/package.json ./apps/server/

RUN pnpm install --frozen-lockfile

COPY packages/core ./packages/core
COPY apps/client ./apps/client
COPY apps/server ./apps/server

ENV VITE_BASE_PATH=/
RUN pnpm -r build

ENV NODE_ENV=production
ENV PORT=2567
EXPOSE 2567

CMD ["node", "apps/server/dist/index.js"]
