FROM node:20-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @workspace/api-server build
CMD ["pnpm", "--filter", "@workspace/api-server", "start"]