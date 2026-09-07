# Single-service production image: Express API + built React frontend.
# The API serves the SPA and the uploaded images (stored in Postgres), so the
# whole app runs behind one URL with no persistent volume required.

# --- build stage ---
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Install dependencies first for better layer caching.
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY . .

# Build the frontend (relative /api base -> same origin) and the backend.
RUN cd frontend && npm run build
RUN cd backend && npx prisma generate && npm run build

# --- runtime stage ---
FROM node:22-bookworm-slim
WORKDIR /app

ENV NODE_ENV=production \
    CLIENT_DIR=/app/client \
    PORT=4000

COPY --from=build /app/backend/package*.json ./backend/
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/frontend/dist ./client

WORKDIR /app/backend
EXPOSE 4000

# Apply migrations, seed only if the database is empty, then serve.
CMD ["npm", "run", "start:prod"]
