FROM node:22-bookworm-slim AS build
WORKDIR /repo
RUN npm install --global pnpm@10.34.5
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@lms/executive...
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3003 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/executive/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/executive/.next/static ./apps/executive/.next/static
COPY --from=build --chown=node:node /repo/apps/executive/public ./apps/executive/public
USER node
EXPOSE 3003
CMD ["node", "apps/executive/server.js"]
