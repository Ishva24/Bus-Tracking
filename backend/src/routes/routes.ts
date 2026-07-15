import { Router } from 'express';
import { getRouteDetails, getRouteSummaries } from '../services/busPosition';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../db/prisma';
import { getBusPosition } from '../db/redis';

const router = Router();

// 1. Get all districts
router.get(
  '/districts',
  asyncHandler(async (req, res) => {
    const districts = await prisma.district.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: districts });
  })
);

// 2. Get stops with optional search
router.get(
  '/stops',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const stops = await prisma.stop.findMany({
      where: search ? {
        name: { contains: search }
      } : undefined,
      include: {
        district: true,
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
    res.json({ success: true, data: stops });
  })
);

// 3. Search routes by source, destination, corporation, serviceType, and free scheme
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { source, destination, corporation, serviceType, isFreeForWomen } = req.query;

    if (!source || !destination) {
      return res.status(400).json({ success: false, error: 'Source and destination are required' });
    }

    const sourceStops = await prisma.stop.findMany({
      where: typeof source === 'string' && source.length > 30 ? { id: source } : { name: { contains: String(source) } },
    });

    const destStops = await prisma.stop.findMany({
      where: typeof destination === 'string' && destination.length > 30 ? { id: destination } : { name: { contains: String(destination) } },
    });

    if (sourceStops.length === 0 || destStops.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const sourceStopIds = sourceStops.map(s => s.id);
    const destStopIds = destStops.map(s => s.id);

    const routes = await prisma.route.findMany({
      where: {
        routeStops: {
          some: { stopId: { in: sourceStopIds } }
        },
        AND: {
          routeStops: {
            some: { stopId: { in: destStopIds } }
          }
        },
        ...(corporation ? { corporation: corporation as any } : {}),
        ...(isFreeForWomen === 'true' || serviceType ? {
          buses: {
            some: {
              ...(isFreeForWomen === 'true' ? { isFreeForWomen: true } : {}),
              ...(serviceType ? { serviceType: serviceType as any } : {}),
              status: 'ACTIVE'
            }
          }
        } : {})
      },
      include: {
        routeStops: {
          orderBy: { sequence: 'asc' },
          include: {
            stop: {
              include: { district: true }
            }
          }
        },
        buses: {
          where: {
            status: 'ACTIVE',
            ...(isFreeForWomen === 'true' ? { isFreeForWomen: true } : {}),
            ...(serviceType ? { serviceType: serviceType as any } : {})
          }
        }
      }
    });

    const matchingRoutes = [];
    for (const route of routes) {
      const sourceIndex = route.routeStops.findIndex(rs => sourceStopIds.includes(rs.stopId));
      const destIndex = route.routeStops.findIndex(rs => destStopIds.includes(rs.stopId));

      if (sourceIndex !== -1 && destIndex !== -1 && sourceIndex < destIndex) {
        const busesWithPositions = await Promise.all(
          route.buses.map(async (bus) => {
            const currentPosition = await getBusPosition(bus.id);
            return {
              id: bus.id,
              vehicleNo: bus.vehicleNo,
              busNumber: bus.busNumber,
              routeId: bus.routeId,
              status: bus.status,
              capacity: bus.capacity,
              serviceType: bus.serviceType,
              isFreeForWomen: bus.isFreeForWomen,
              createdAt: bus.createdAt.toISOString(),
              updatedAt: bus.updatedAt.toISOString(),
              routeName: route.name,
              currentPosition,
            };
          })
        );

        matchingRoutes.push({
          id: route.id,
          name: route.name,
          number: route.number,
          description: route.description,
          corporation: route.corporation,
          stops: route.routeStops.map(rs => ({
            id: rs.stop.id,
            name: rs.stop.name,
            latitude: rs.stop.latitude,
            longitude: rs.stop.longitude,
            category: rs.stop.category,
            district: rs.stop.district ? rs.stop.district.name : null,
            sequence: rs.sequence
          })),
          buses: busesWithPositions,
        });
      }
    }

    res.json({ success: true, data: matchingRoutes });
  })
);

// 4. Get route summaries
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const routes = await getRouteSummaries(search);
    res.json({ success: true, data: routes });
  })
);

// 5. Get route details by ID
router.get(
  '/:routeId',
  asyncHandler(async (req, res) => {
    const route = await getRouteDetails(req.params.routeId);
    res.json({ success: true, data: route });
  })
);

export default router;
