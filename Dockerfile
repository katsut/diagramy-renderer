FROM node:22-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV RENDERER_PORT=4729
EXPOSE 4729
HEALTHCHECK --interval=3s --timeout=3s --start-period=10s --retries=5 \
  CMD ["node", "-e", "fetch('http://localhost:4729/health').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"]
CMD ["npx", "tsx", "src/server.ts"]
