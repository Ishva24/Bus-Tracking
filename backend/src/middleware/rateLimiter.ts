import rateLimit from 'express-rate-limit';
import { config } from '../config';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  skip: (req) => {
    return req.path === '/v1/buses/positions' || req.path === '/buses/positions';
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return (req as any).userId || req.ip || 'unknown';
  },
});

// Stricter rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  },
});

// Rate limiter for ETA requests (can be expensive)
export const etaLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many ETA requests, please slow down',
    },
  },
  keyGenerator: (req) => {
    return (req as any).userId || req.ip || 'unknown';
  },
});