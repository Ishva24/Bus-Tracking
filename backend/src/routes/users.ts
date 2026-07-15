import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { Errors, createError } from '../middleware/errorHandler';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) {
      throw Errors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { favoriteRoutes: true },
    });

    if (!user) {
      throw Errors.notFound('User');
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        favoriteRoutes: user.favoriteRoutes.map((favorite) => favorite.routeId),
      },
    });
  })
);

router.get(
  '/me/favorites',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) {
      throw Errors.unauthorized();
    }

    const favorites = await prisma.favoriteRoute.findMany({
      where: { userId: req.userId },
      include: { route: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: favorites.map((favorite) => ({
        id: favorite.id,
        routeId: favorite.routeId,
        createdAt: favorite.createdAt.toISOString(),
        route: {
          id: favorite.route.id,
          number: favorite.route.number,
          name: favorite.route.name,
          description: favorite.route.description,
        },
      })),
    });
  })
);

router.post(
  '/me/favorites',
  authMiddleware,
  [body('routeId').isString().notEmpty()],
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) {
      throw Errors.unauthorized();
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400, 'VALIDATION_ERROR', { errors: errors.array() });
    }

    const route = await prisma.route.findUnique({ where: { id: req.body.routeId } });
    if (!route) {
      throw Errors.notFound('Route');
    }

    const favorite = await prisma.favoriteRoute.upsert({
      where: {
        userId_routeId: {
          userId: req.userId,
          routeId: route.id,
        },
      },
      update: {},
      create: {
        userId: req.userId,
        routeId: route.id,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: favorite.id,
        routeId: favorite.routeId,
        createdAt: favorite.createdAt.toISOString(),
      },
    });
  })
);

router.delete(
  '/me/favorites/:routeId',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) {
      throw Errors.unauthorized();
    }

    await prisma.favoriteRoute.deleteMany({
      where: {
        userId: req.userId,
        routeId: req.params.routeId,
      },
    });

    res.json({
      success: true,
      data: {
        routeId: req.params.routeId,
        removed: true,
      },
    });
  })
);

router.get(
  '/me/alerts',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) {
      throw Errors.unauthorized();
    }

    const alerts = await prisma.proximityAlert.findMany({
      where: { userId: req.userId },
      include: {
        bus: true,
        stop: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: alerts.map((alert) => ({
        id: alert.id,
        busId: alert.busId,
        busNumber: alert.bus.busNumber,
        vehicleNo: alert.bus.vehicleNo,
        boardingStopId: alert.boardingStopId,
        boardingStopName: alert.stop.name,
        stopsThreshold: alert.stopsThreshold,
        triggered: alert.triggered,
        createdAt: alert.createdAt.toISOString(),
      })),
    });
  })
);

router.post(
  '/me/alerts',
  authMiddleware,
  [
    body('busId').isString().notEmpty(),
    body('boardingStopId').isString().notEmpty(),
    body('stopsThreshold').optional().isInt({ min: 1, max: 10 }),
  ],
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) {
      throw Errors.unauthorized();
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400, 'VALIDATION_ERROR', { errors: errors.array() });
    }

    const { busId, boardingStopId, stopsThreshold = 2 } = req.body;

    const bus = await prisma.bus.findUnique({ where: { id: busId } });
    if (!bus) {
      throw Errors.notFound('Bus');
    }

    const stop = await prisma.stop.findUnique({ where: { id: boardingStopId } });
    if (!stop) {
      throw Errors.notFound('Stop');
    }

    const alert = await prisma.proximityAlert.upsert({
      where: {
        userId_busId_boardingStopId: {
          userId: req.userId,
          busId,
          boardingStopId,
        },
      },
      update: {
        stopsThreshold,
        triggered: false,
      },
      create: {
        userId: req.userId,
        busId,
        boardingStopId,
        stopsThreshold,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: alert.id,
        busId: alert.busId,
        boardingStopId: alert.boardingStopId,
        stopsThreshold: alert.stopsThreshold,
        triggered: alert.triggered,
        createdAt: alert.createdAt.toISOString(),
      },
    });
  })
);

router.delete(
  '/me/alerts/:alertId',
  authMiddleware,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) {
      throw Errors.unauthorized();
    }

    await prisma.proximityAlert.deleteMany({
      where: {
        id: req.params.alertId,
        userId: req.userId,
      },
    });

    res.json({
      success: true,
      data: {
        id: req.params.alertId,
        removed: true,
      },
    });
  })
);

export default router;
