import { BusPosition, TripETA, getTrafficLabel, haversineDistance } from '@bustrack/shared';
import { prisma } from '../db/prisma';
import { getETACache, setETACache, incrementRateLimit } from '../db/redis';
import { Errors } from '../middleware/errorHandler';
import { getBusPositionById } from './busPosition';

interface RouteStopPoint {
  stopId: string;
  name: string;
  lat: number;
  lon: number;
}

const AVERAGE_SPEED_KMH = 22;

async function getTrafficFactor(): Promise<number> {
  const hour = new Date().getHours();
  if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20)) {
    return 1.35;
  }
  if (hour >= 11 && hour <= 16) {
    return 1.15;
  }
  return 1.0;
}

function inferCurrentStopIndex(stops: RouteStopPoint[], position: BusPosition | null): number {
  if (!position) {
    return 0;
  }

  if (position.currentStopId) {
    const exact = stops.findIndex((stop) => stop.stopId === position.currentStopId);
    if (exact >= 0) {
      return exact;
    }
  }

  let nearestIndex = 0;
  let nearestDistance = Number.MAX_SAFE_INTEGER;
  stops.forEach((stop, index) => {
    const distance = haversineDistance(position.lat, position.lon, stop.lat, stop.lon);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}

function computeDistanceKm(stops: RouteStopPoint[], fromIdx: number, toIdx: number): number {
  let totalKm = 0;
  for (let index = fromIdx; index < toIdx; index += 1) {
    totalKm += haversineDistance(
      stops[index].lat,
      stops[index].lon,
      stops[index + 1].lat,
      stops[index + 1].lon
    );
  }
  return totalKm;
}

function toIsoFromMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function fetchGoogleDirectionsETA(
  apiKey: string,
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number },
  waypoints: { lat: number; lon: number }[]
): Promise<number | null> {
  try {
    const originStr = `${origin.lat},${origin.lon}`;
    const destStr = `${destination.lat},${destination.lon}`;
    // Limit to 25 waypoints to stay within Google API limits
    const waypointsStr = waypoints
      .slice(0, 25)
      .map((w) => `${w.lat},${w.lon}`)
      .join('|');

    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&departure_time=now&key=${apiKey}`;
    if (waypointsStr) {
      url += `&waypoints=${waypointsStr}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = (await response.json()) as any;

    if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
      console.warn('Google Directions API returned status:', data.status);
      return null;
    }

    let totalSeconds = 0;
    const legs = data.routes[0].legs;
    for (const leg of legs) {
      const legDuration = leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0;
      totalSeconds += legDuration;
    }

    return totalSeconds / 60; // convert to minutes
  } catch (error: any) {
    console.error('Error fetching Google Directions ETA:', error.message);
    return null;
  }
}

export async function computeETA(
  busId: string,
  boardingStopId: string,
  destinationStopId: string
): Promise<TripETA> {
  const cached = await getETACache(busId, boardingStopId, destinationStopId);
  if (cached) {
    return cached as TripETA;
  }

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

  const stops: RouteStopPoint[] = bus.route.routeStops.map((routeStop) => ({
    stopId: routeStop.stop.id,
    name: routeStop.stop.name,
    lat: routeStop.stop.latitude,
    lon: routeStop.stop.longitude,
  }));

  const boardingIdx = stops.findIndex((stop) => stop.stopId === boardingStopId);
  const destinationIdx = stops.findIndex((stop) => stop.stopId === destinationStopId);
  if (boardingIdx === -1 || destinationIdx === -1) {
    throw Errors.badRequest('Both boarding and destination stops must be on the selected route');
  }
  if (destinationIdx < boardingIdx) {
    throw Errors.badRequest('Destination must be at or after the boarding stop on the route');
  }

  const position = await getBusPositionById(busId);
  const busStopIdx = inferCurrentStopIndex(stops, position);

  // Check active Google Maps API key
  let googleApiKey: string | null = null;
  let configRecord: any = null;
  try {
    configRecord = await prisma.mapProviderConfig.findFirst({
      where: { providerName: 'google', isActive: true },
    });
    if (configRecord?.apiKey) {
      googleApiKey = configRecord.apiKey;
    }
  } catch (err) {
    // DB error or table not migrated yet
  }

  let minutesToBoardingGoogle: number | null = null;
  let minutesToDestinationGoogle: number | null = null;

  if (googleApiKey && position) {
    if (boardingIdx >= busStopIdx) {
      // Waypoints for boarding
      const waypointsToBoarding = stops.slice(busStopIdx + 1, boardingIdx);
      minutesToBoardingGoogle = await fetchGoogleDirectionsETA(
        googleApiKey,
        { lat: position.lat, lon: position.lon },
        { lat: stops[boardingIdx].lat, lon: stops[boardingIdx].lon },
        waypointsToBoarding
      );
    } else {
      minutesToBoardingGoogle = 0;
    }

    if (destinationIdx >= busStopIdx) {
      // Waypoints for destination
      const waypointsToDestination = stops.slice(busStopIdx + 1, destinationIdx);
      minutesToDestinationGoogle = await fetchGoogleDirectionsETA(
        googleApiKey,
        { lat: position.lat, lon: position.lon },
        { lat: stops[destinationIdx].lat, lon: stops[destinationIdx].lon },
        waypointsToDestination
      );
    } else {
      minutesToDestinationGoogle = 0;
    }

    if (minutesToBoardingGoogle !== null || minutesToDestinationGoogle !== null) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const counterKey = `quota:google:directions:${today}`;
        const count = await incrementRateLimit(counterKey, 24 * 60 * 60 * 1000);
        if (configRecord && configRecord.usageLimitPerDay && count > configRecord.usageLimitPerDay) {
          console.warn(`⚠️ Google Maps daily quota limit of ${configRecord.usageLimitPerDay} exceeded! Deactivating Google Maps.`);
          await prisma.mapProviderConfig.update({
            where: { id: configRecord.id },
            data: { isActive: false },
          });
        }
      } catch (err: any) {
        console.error('Failed to update Google quota count:', err.message);
      }
    }
  }

  const distanceToBoarding = boardingIdx >= busStopIdx
    ? computeDistanceKm(stops, busStopIdx, boardingIdx)
    : 0;

  const distanceToDestination = destinationIdx >= busStopIdx
    ? computeDistanceKm(stops, busStopIdx, destinationIdx)
    : 0;

  const distanceBetweenBoardingAndDestination = computeDistanceKm(stops, boardingIdx, destinationIdx);

  const trafficFactor = await getTrafficFactor();

  const minutesToBoarding = boardingIdx >= busStopIdx
    ? (minutesToBoardingGoogle !== null
        ? minutesToBoardingGoogle
        : (distanceToBoarding / AVERAGE_SPEED_KMH) * 60 * trafficFactor)
    : 0;

  const minutesToDestination = destinationIdx >= busStopIdx
    ? (minutesToDestinationGoogle !== null
        ? minutesToDestinationGoogle
        : (distanceToDestination / AVERAGE_SPEED_KMH) * 60 * trafficFactor)
    : 0;

  const eta: TripETA = {
    busId,
    boardingStopId,
    destinationStopId,
    boardingStopName: stops[boardingIdx].name,
    destinationStopName: stops[destinationIdx].name,
    etaToBoarding: toIsoFromMinutes(minutesToBoarding),
    etaToDestination: toIsoFromMinutes(minutesToDestination),
    distanceKm: Number(distanceBetweenBoardingAndDestination.toFixed(2)),
    distanceToBoardingKm: Number(distanceToBoarding.toFixed(2)),
    distanceToDestinationKm: Number(distanceToDestination.toFixed(2)),
    stopsToBoarding: Math.max(boardingIdx - busStopIdx, 0),
    stopsToDestination: Math.max(destinationIdx - busStopIdx, 0),
    trafficFactor,
    trafficDescription: getTrafficLabel(trafficFactor),
    routeProgress: {
      completedStops: busStopIdx,
      totalStops: stops.length,
      percentComplete: Number(((busStopIdx / Math.max(stops.length - 1, 1)) * 100).toFixed(1)),
    },
  };

  await setETACache(busId, boardingStopId, destinationStopId, eta, 30);
  return eta;
}
