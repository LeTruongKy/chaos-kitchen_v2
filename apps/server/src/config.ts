const rawOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

export const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 2567,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGINS: (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  CLIENT_DIST: process.env.CLIENT_DIST || '../../apps/client/dist',
};
