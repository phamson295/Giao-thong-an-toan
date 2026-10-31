# Build từ thư mục gốc monorepo (xem docker-compose.yml) để có gói @gtat/shared
FROM node:22-alpine
WORKDIR /repo
COPY package.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm install --workspace @gtat/api --no-audit --no-fund
RUN npm run build --workspace @gtat/api
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
