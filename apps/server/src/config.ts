export const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 2567,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  CLIENT_DIST: process.env.CLIENT_DIST || '../../apps/client/dist',
};
