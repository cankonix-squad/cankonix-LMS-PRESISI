FROM node:22-bookworm-slim AS build
WORKDIR /repo
RUN npm install --global pnpm@10.34.5
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@lms/admin...
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/admin/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build --chown=node:node /repo/apps/admin/public ./apps/admin/public
USER node
EXPOSE 3000
CMD ["node", "apps/admin/server.js"]
