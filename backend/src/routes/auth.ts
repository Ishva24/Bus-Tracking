import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../db/prisma';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  getTokenExpirySeconds,
} from '../services/auth';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { Errors, createError } from '../middleware/errorHandler';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const registerValidation = [
  body('email').isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character'),
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
  body('phone').optional().isString().trim(),
];

const loginValidation = [
  body('email').isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

function ensureValidation(req: Request) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400, 'VALIDATION_ERROR', { errors: errors.array() });
  }
}

router.post(
  '/register',
  authLimiter,
  registerValidation,
  asyncHandler(async (req: Request, res: Response) => {
    ensureValidation(req);

    const { email, password, name, phone } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw Errors.conflict('Email already registered');
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone: phone || null,
      },
    });

    const accessToken = generateAccessToken(user.id, user.email);
    const { token: refreshToken, tokenId } = generateRefreshToken(user.id);
    await storeRefreshToken(user.id, tokenId, refreshToken);

    await prisma.authLog.create({
      data: {
        email: user.email,
        userId: user.id,
        action: 'register',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: getTokenExpirySeconds(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
        },
      },
    });
  })
);

router.post(
  '/login',
  authLimiter,
  loginValidation,
  asyncHandler(async (req: Request, res: Response) => {
    ensureValidation(req);

    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await prisma.authLog.create({
        data: {
          email,
          action: 'failed_login',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          success: false,
        },
      });
      throw Errors.unauthorized('Invalid credentials');
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      await prisma.authLog.create({
        data: {
          email,
          userId: user.id,
          action: 'failed_login',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          success: false,
        },
      });
      throw Errors.unauthorized('Invalid credentials');
    }

    const accessToken = generateAccessToken(user.id, user.email);
    const { token: refreshToken, tokenId } = generateRefreshToken(user.id);
    await storeRefreshToken(user.id, tokenId, refreshToken);

    await prisma.authLog.create({
      data: {
        email: user.email,
        userId: user.id,
        action: 'login',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      },
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: getTokenExpirySeconds(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
        },
      },
    });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw Errors.badRequest('Refresh token required');
    }

    const userId = await validateRefreshToken(refreshToken);
    if (!userId) {
      throw Errors.unauthorized('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw Errors.unauthorized('User not found');
    }

    await revokeRefreshToken(refreshToken);
    const accessToken = generateAccessToken(user.id, user.email);
    const { token: newRefreshToken, tokenId } = generateRefreshToken(user.id);
    await storeRefreshToken(user.id, tokenId, newRefreshToken);

    await prisma.authLog.create({
      data: {
        email: user.email,
        userId: user.id,
        action: 'refresh',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      },
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: getTokenExpirySeconds(),
      },
    });
  })
);

router.post(
  '/logout',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    if (req.userId && req.userEmail) {
      await prisma.authLog.create({
        data: {
          email: req.userEmail,
          userId: req.userId,
          action: 'logout',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          success: true,
        },
      });
    }

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  })
);

router.post(
  '/logout-all',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      throw Errors.unauthorized();
    }

    await revokeAllUserTokens(req.userId);

    if (req.userEmail) {
      await prisma.authLog.create({
        data: {
          email: req.userEmail,
          userId: req.userId,
          action: 'logout_all',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          success: true,
        },
      });
    }

    res.json({
      success: true,
      data: { message: 'All sessions logged out successfully' },
    });
  })
);

export default router;
