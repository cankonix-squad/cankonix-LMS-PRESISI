FROM node:22-bookworm-slim AS build
WORKDIR /repo
RUN npm install --global pnpm@10.34.5
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@lms/student...
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3002 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/student/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/student/.next/static ./apps/student/.next/static
COPY --from=build --chown=node:node /repo/apps/student/public ./apps/student/public
USER node
EXPOSE 3002
CMD ["node", "apps/student/server.js"]
