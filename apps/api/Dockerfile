FROM node:22-bookworm-slim AS build
WORKDIR /repo
RUN npm install --global pnpm@10.34.5
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @lms/api db:generate
RUN pnpm --filter @lms/api build
RUN pnpm --filter @lms/api deploy --legacy /out
RUN cd /out && pnpm exec prisma generate --schema=prisma/schema.prisma
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
