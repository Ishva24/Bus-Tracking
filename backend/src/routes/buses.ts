import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { getBusDetails, getActiveBusSummaries, getBusPositionById } from '../services/busPosition';
import { computeETA } from '../services/eta';
import { etaLimiter } from '../middleware/rateLimiter';
import { createError, Errors } from '../middleware/errorHandler';
import { asyncHandler } from '../utils/asyncHandler';
import { redis } from '../db/redis';
import { prisma } from '../db/prisma';

const router = Router();

function throwValidationError() {
  return (req: Parameters<typeof validationResult>[0]) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400, 'VALIDATION_ERROR', { errors: errors.array() });
    }
  };
}

const validate = throwValidationError();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const buses = await getActiveBusSummaries(search);
    res.json({ success: true, data: buses });
  })
);

router.get(
  '/:busId',
  asyncHandler(async (req, res) => {
    const bus = await getBusDetails(req.params.busId);
    res.json({ success: true, data: bus });
  })
);

router.get(
  '/:busId/position',
  asyncHandler(async (req, res) => {
    const position = await getBusPositionById(req.params.busId);
    if (!position) {
      throw Errors.notFound('Bus position');
    }
    res.json({ success: true, data: position });
  })
);

router.get(
  '/:busId/eta',
  etaLimiter,
  [query('boardingStopId').isString().notEmpty(), query('destinationStopId').isString().notEmpty()],
  asyncHandler(async (req, res) => {
    validate(req);

    const eta = await computeETA(
      req.params.busId,
      String(req.query.boardingStopId),
      String(req.query.destinationStopId)
    );
    res.json({ success: true, data: eta });
  })
);

router.post(
  '/eta',
  etaLimiter,
  [body('busId').isString().notEmpty(), body('boardingStopId').isString().notEmpty(), body('destinationStopId').isString().notEmpty()],
  asyncHandler(async (req, res) => {
    validate(req);

    const eta = await computeETA(req.body.busId, req.body.boardingStopId, req.body.destinationStopId);
    res.json({ success: true, data: eta });
  })
);

router.post(
  '/positions',
  [
    body('busId').isString().trim().notEmpty(),
    body('lat').isFloat({ min: -90, max: 90 }).toFloat(),
    body('lon').isFloat({ min: -180, max: 180 }).toFloat(),
    body('speed').optional().isFloat({ min: 0, max: 200 }).toFloat(),
    body('bearing').optional().isFloat({ min: 0, max: 360 }).toFloat(),
  ],
  asyncHandler(async (req, res) => {
    validate(req);
    const { busId, lat, lon, speed = 30, bearing = 0 } = req.body;
    
    // Fetch bus details to build a complete BusPosition
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      select: { vehicleNo: true, busNumber: true, routeId: true }
    });

    if (!bus) {
      return res.status(404).json({ success: false, error: 'Bus not found' });
    }

    const busPosition = {
      busId,
      vehicleNo: bus.vehicleNo,
      busNumber: bus.busNumber,
      routeId: bus.routeId,
      lat,
      lon,
      speed,
      bearing,
      lastUpdated: new Date().toISOString(),
      currentStopId: null
    };

    await redis.setex(`bus:position:${busId}`, 30, JSON.stringify(busPosition));
    await redis.publish('bus:position:update', JSON.stringify(busPosition));
    res.json({ success: true });
  })
);

router.post(
  '/sos',
  [
    body('busId').isString().trim().notEmpty(),
    body('busNumber').isString().trim().notEmpty(),
    body('vehicleNo').isString().trim().notEmpty(),
    body('latitude').isFloat({ min: -90, max: 90 }).toFloat(),
    body('longitude').isFloat({ min: -180, max: 180 }).toFloat(),
    body('alertType').optional().isString().trim().isLength({ max: 100 }),
  ],
  asyncHandler(async (req, res) => {
    validate(req);
    const { busId, busNumber, vehicleNo, latitude, longitude, alertType } = req.body;

    const alert = await prisma.emergencyAlert.create({
      data: {
        busId,
        busNumber,
        vehicleNo,
        latitude,
        longitude,
        alertType: alertType || 'SOS_BUTTON_TRIGGERED',
        status: 'ACTIVE',
      },
    });

    await redis.publish('bus:emergency:alert', JSON.stringify(alert));

    res.status(201).json({ success: true, data: alert });
  })
);

export default router;
