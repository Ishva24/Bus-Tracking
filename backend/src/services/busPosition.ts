import { BusPosition, RouteSummary } from '@bustrack/shared';
import { prisma } from '../db/prisma';
import { getAllBusPositions, getBusPosition } from '../db/redis';
import { Errors } from '../middleware/errorHandler';

export async function getBusPositionById(busId: string): Promise<BusPosition | null> {
  return getBusPosition(busId);
}

export async function getActiveBusSummaries(search?: string) {
  const buses = await prisma.bus.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { busNumber: { contains: search } },
              { vehicleNo: { contains: search } },
              { route: { name: { contains: search } } },
              { route: { number: { contains: search } } },
            ],
          }
        : {}),
    },
    include: {
      route: true,
    },
    orderBy: [{ busNumber: 'asc' }, { vehicleNo: 'asc' }],
  });

  const positions = await getAllBusPositions();
  const byBusId = new Map(positions.map((position: BusPosition) => [position.busId, position]));

  return buses.map((bus) => ({
    id: bus.id,
    vehicleNo: bus.vehicleNo,
    busNumber: bus.busNumber,
    routeId: bus.routeId,
    status: bus.status,
    capacity: bus.capacity,
    serviceType: bus.serviceType,
    isFreeForWomen: bus.isFreeForWomen,
    isLowFloor: bus.isLowFloor,
    createdAt: bus.createdAt.toISOString(),
    updatedAt: bus.updatedAt.toISOString(),
    routeName: bus.route.name,
    currentPosition: byBusId.get(bus.id) ?? null,
  }));
}

export async function getBusDetails(busId: string) {
  const bus = await prisma.bus.findUnique({
    where: { id: busId },
    include: {
      route: {
        include: {
          routeStops: {
            orderBy: { sequence: 'asc' },
            include: { stop: true },
          },
        },
      },
    },
  });

  if (!bus) {
    throw Errors.notFound('Bus');
  }

  return {
    id: bus.id,
    vehicleNo: bus.vehicleNo,
    busNumber: bus.busNumber,
    routeId: bus.routeId,
    routeName: bus.route.name,
    routeNumber: bus.route.number,
    status: bus.status,
    capacity: bus.capacity,
    serviceType: bus.serviceType,
    isFreeForWomen: bus.isFreeForWomen,
    isLowFloor: bus.isLowFloor,
    currentPosition: await getBusPosition(bus.id),
    stops: bus.route.routeStops.map((routeStop) => ({
      id: routeStop.stop.id,
      stopId: routeStop.stop.id,
      name: routeStop.stop.name,
      latitude: routeStop.stop.latitude,
      longitude: routeStop.stop.longitude,
      createdAt: routeStop.stop.createdAt.toISOString(),
      sequence: routeStop.sequence,
    })),
    createdAt: bus.createdAt.toISOString(),
    updatedAt: bus.updatedAt.toISOString(),
  };
}

export async function getRouteSummaries(search?: string): Promise<RouteSummary[]> {
  const routes = await prisma.route.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search } },
            { number: { contains: search } },
          ],
        }
      : undefined,
    include: {
      routeStops: true,
      buses: {
        where: {
          status: 'ACTIVE',
        },
      },
    },
    orderBy: [{ number: 'asc' }],
  });

  return routes.map((route) => ({
    id: route.id,
    name: route.name,
    number: route.number,
    stopCount: route.routeStops.length,
    activeBusCount: route.buses.length,
  }));
}

export async function getRouteDetails(routeId: string) {
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    include: {
      routeStops: {
        orderBy: { sequence: 'asc' },
        include: { stop: true },
      },
      buses: {
        orderBy: { busNumber: 'asc' },
      },
    },
  });

  if (!route) {
    throw Errors.notFound('Route');
  }

  const positions = await Promise.all(
    route.buses.map(async (bus) => ({
      busId: bus.id,
      position: await getBusPosition(bus.id),
    }))
  );
  const byBusId = new Map(positions.map(({ busId, position }) => [busId, position]));

  return {
    id: route.id,
    name: route.name,
    number: route.number,
    description: route.description,
    createdAt: route.createdAt.toISOString(),
    stops: route.routeStops.map((routeStop) => ({
      id: routeStop.stop.id,
      stopId: routeStop.stop.id,
      name: routeStop.stop.name,
      latitude: routeStop.stop.latitude,
      longitude: routeStop.stop.longitude,
      createdAt: routeStop.stop.createdAt.toISOString(),
      sequence: routeStop.sequence,
    })),
    buses: route.buses.map((bus) => ({
      id: bus.id,
      vehicleNo: bus.vehicleNo,
      busNumber: bus.busNumber,
      routeId: bus.routeId,
      status: bus.status,
      capacity: bus.capacity,
      serviceType: bus.serviceType,
      isFreeForWomen: bus.isFreeForWomen,
      isLowFloor: bus.isLowFloor,
      createdAt: bus.createdAt.toISOString(),
      updatedAt: bus.updatedAt.toISOString(),
      routeName: route.name,
      currentPosition: byBusId.get(bus.id) ?? null,
    })),
  };
}
