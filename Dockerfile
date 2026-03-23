FROM node:20

WORKDIR /app

COPY . .

RUN npm install -g pnpm
RUN pnpm install

RUN pnpm --filter @workspace/api-server build

EXPOSE 3000

CMD ["pnpm", "--filter", "@workspace/api-server", "start"]
