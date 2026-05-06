import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  /** Public origin (e.g. https://nexus.34-31-184-93.nip.io). Used to build
   *  activation / password-reset URLs that admins share with users. */
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
}));

export type AppConfig = ReturnType<typeof appConfig>;
