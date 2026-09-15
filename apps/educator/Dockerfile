FROM node:22-bookworm-slim AS build
WORKDIR /repo
RUN npm install --global pnpm@10.34.5
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@lms/educator...
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/educator/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/educator/.next/static ./apps/educator/.next/static
COPY --from=build --chown=node:node /repo/apps/educator/public ./apps/educator/public
USER node
EXPOSE 3001
CMD ["node", "apps/educator/server.js"]
