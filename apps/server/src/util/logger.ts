import { config } from '../config';

export const logger = {
  info: (msg: string, ...args: unknown[]) => {
    if (config.NODE_ENV === 'production') {
      console.info(JSON.stringify({ level: 'info', msg, args, timestamp: new Date().toISOString() }));
    } else {
      console.info(`[${new Date().toISOString()}] INFO: ${msg}`, ...args);
    }
  },
  warn: (msg: string, ...args: unknown[]) => {
    if (config.NODE_ENV === 'production') {
      console.warn(JSON.stringify({ level: 'warn', msg, args, timestamp: new Date().toISOString() }));
    } else {
      console.warn(`[${new Date().toISOString()}] WARN: ${msg}`, ...args);
    }
  },
  error: (msg: string, ...args: unknown[]) => {
    if (config.NODE_ENV === 'production') {
      console.error(JSON.stringify({ level: 'error', msg, args, timestamp: new Date().toISOString() }));
    } else {
      console.error(`[${new Date().toISOString()}] ERROR: ${msg}`, ...args);
    }
  }
};
