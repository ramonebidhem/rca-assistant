import 'dotenv/config';
import path from 'node:path';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const uploadDirRaw = process.env.UPLOAD_DIR ?? '../uploads';
// Directory holding the built frontend (index.html + assets). When present the
// API also serves the SPA, so the app runs as a single service.
const clientDirRaw = process.env.CLIENT_DIR ?? '../frontend/dist';

export const env = {
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET', 'change-this-jwt-secret-in-production'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  port: Number(process.env.PORT ?? 4000),
  // Resolved to an absolute path relative to the backend package root.
  uploadDir: path.isAbsolute(uploadDirRaw)
    ? uploadDirRaw
    : path.resolve(process.cwd(), uploadDirRaw),
  clientDir: path.isAbsolute(clientDirRaw)
    ? clientDirRaw
    : path.resolve(process.cwd(), clientDirRaw),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
