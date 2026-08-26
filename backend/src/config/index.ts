function parseCorsOrigins(value: string | undefined): string[] {
  return (value || 'http://localhost:8081,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // CORS
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  },

  // Google Maps
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',

  // FCM
  fcmServerKey: process.env.FCM_SERVER_KEY || '',

  // Simulator
  simulator: {
    busCount: parseInt(process.env.SIMULATED_BUS_COUNT || '30', 10),
    tickIntervalMs: parseInt(process.env.TICK_INTERVAL_MS || '3000', 10),
  },
};

export function validateConfig(): void {
  const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

  if (config.nodeEnv === 'production') {
    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }

    if (config.jwt.accessSecret === 'dev-access-secret-change-in-production') {
      throw new Error('JWT_ACCESS_SECRET must be changed in production');
    }
    if (config.jwt.refreshSecret === 'dev-refresh-secret-change-in-production') {
      throw new Error('JWT_REFRESH_SECRET must be changed in production');
    }
  }
}
