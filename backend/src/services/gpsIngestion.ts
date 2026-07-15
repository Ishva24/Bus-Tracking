import { redis } from '../db/redis';
import { prisma } from '../db/prisma';
import { BusPosition } from '@bustrack/shared';

// Cache of vehicleNo -> { busId, routeId, busNumber } to avoid querying the DB for every single GPS packet
const vehicleCache = new Map<string, { busId: string; routeId: string; busNumber: string }>();

export async function processGpsTelemetry(payload: {
  vehicleNo: string;
  lat: number;
  lon: number;
  speed?: number;
  bearing?: number;
  timestamp?: string;
}) {
  const { vehicleNo, lat, lon, speed = 0, bearing = 0, timestamp = new Date().toISOString() } = payload;

  let busInfo = vehicleCache.get(vehicleNo);
  if (!busInfo) {
    // Find active bus by vehicle number
    const bus = await prisma.bus.findUnique({
      where: { vehicleNo, status: 'ACTIVE' },
      select: { id: true, routeId: true, busNumber: true },
    });

    if (!bus) {
      console.warn(`[GPS Ingestion] Received telemetry for unknown/inactive vehicle: ${vehicleNo}`);
      return;
    }

    busInfo = { busId: bus.id, routeId: bus.routeId, busNumber: bus.busNumber };
    vehicleCache.set(vehicleNo, busInfo);
  }

  const busPosition: BusPosition = {
    busId: busInfo.busId,
    vehicleNo,
    busNumber: busInfo.busNumber,
    routeId: busInfo.routeId,
    lat,
    lon,
    speed,
    bearing,
    lastUpdated: timestamp,
    currentStopId: null, // Computed dynamically during ETA or client side
  };

  // 1. Write to Redis (bus:position:{busId})
  await redis.setex(`bus:position:${busInfo.busId}`, 30, JSON.stringify(busPosition));

  // 2. Publish to Redis channel (bus:position:update) for Socket.IO broadcast
  await redis.publish('bus:position:update', JSON.stringify(busPosition));

  console.log(`[GPS Ingestion] Telemetry processed for ${vehicleNo} -> Lat: ${lat}, Lon: ${lon}, Speed: ${speed} km/h`);
}
