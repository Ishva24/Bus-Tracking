import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: err.message || 'An unexpected error occurred',
      details: err.details,
    },
  });
}

export function createError(
  message: string,
  statusCode: number = 500,
  code: string = 'INTERNAL_ERROR',
  details?: Record<string, unknown>
): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

// Common error creators
export const Errors = {
  notFound: (resource: string) =>
    createError(`${resource} not found`, 404, 'NOT_FOUND'),

  validation: (message: string, details?: Record<string, unknown>) =>
    createError(message, 400, 'VALIDATION_ERROR', details),

  unauthorized: (message: string = 'Unauthorized') =>
    createError(message, 401, 'UNAUTHORIZED'),

  forbidden: (message: string = 'Forbidden') =>
    createError(message, 403, 'FORBIDDEN'),

  conflict: (message: string) =>
    createError(message, 409, 'CONFLICT'),

  badRequest: (message: string, details?: Record<string, unknown>) =>
    createError(message, 400, 'BAD_REQUEST', details),

  internal: (message: string = 'Internal server error') =>
    createError(message, 500, 'INTERNAL_ERROR'),
};