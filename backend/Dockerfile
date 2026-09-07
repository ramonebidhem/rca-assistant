FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies (needs prisma schema for postinstall generate).
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate

EXPOSE 4000

# On boot: apply migrations, seed, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed && npx tsx src/index.ts"]
