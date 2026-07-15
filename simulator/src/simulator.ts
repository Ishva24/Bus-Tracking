import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  connectTimeout: 2000,
});

let useInMemory = false;
redis.on('error', (err) => {
  if (!useInMemory) {
    console.warn('⚠️ Simulator: Redis connection failed, running in log-only/offline mode:', err.message);
    useInMemory = true;
  }
});

const POSITION_CHANNEL = 'bus:position:update';
const TICK_INTERVAL_MS = Number(process.env.TICK_INTERVAL_MS ?? 3000);

type StopPoint = {
  id: string;
  latitude: number;
  longitude: number;
};

type SimulatedBus = {
  busId: string;
  routeId: string;
  busNumber: string;
  vehicleNo: string;
  stops: StopPoint[];
  segmentIndex: number;
  segmentProgress: number;
  direction: 1 | -1;
};

function interpolate(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

async function loadBuses(): Promise<SimulatedBus[]> {
  const buses = await prisma.bus.findMany({
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
    where: { status: 'ACTIVE' },
  });

  return buses
    .filter((bus) => bus.route.routeStops.length >= 2)
    .map((bus) => ({
      busId: bus.id,
      routeId: bus.routeId,
      busNumber: bus.busNumber,
      vehicleNo: bus.vehicleNo,
      stops: bus.route.routeStops.map((routeStop) => ({
        id: routeStop.stop.id,
        latitude: routeStop.stop.latitude,
        longitude: routeStop.stop.longitude,
      })),
      segmentIndex: Math.floor(Math.random() * (bus.route.routeStops.length - 1)),
      segmentProgress: Math.random(),
      direction: Math.random() > 0.5 ? 1 : -1,
    }));
}

function stepBus(bus: SimulatedBus) {
  const current = bus.stops[bus.segmentIndex];
  const next = bus.stops[bus.segmentIndex + 1];

  bus.segmentProgress += 0.18 + Math.random() * 0.08;

  if (bus.segmentProgress >= 1) {
    bus.segmentProgress = 0;
    bus.segmentIndex += bus.direction;

    if (bus.segmentIndex >= bus.stops.length - 1) {
      bus.segmentIndex = bus.stops.length - 2;
      bus.direction = -1;
    }
    if (bus.segmentIndex < 0) {
      bus.segmentIndex = 0;
      bus.direction = 1;
    }
  }

  return {
    busId: bus.busId,
    vehicleNo: bus.vehicleNo,
    busNumber: bus.busNumber,
    routeId: bus.routeId,
    lat: Number(interpolate(current.latitude, next.latitude, bus.segmentProgress).toFixed(6)),
    lon: Number(interpolate(current.longitude, next.longitude, bus.segmentProgress).toFixed(6)),
    speed: Math.round(18 + Math.random() * 24),
    bearing: Math.round(calculateBearing(current.latitude, current.longitude, next.latitude, next.longitude)),
    lastUpdated: new Date().toISOString(),
    currentStopId: bus.segmentProgress < 0.2 ? current.id : null,
  };
}

async function publish(simulatedBuses: SimulatedBus[]) {
  const overriddenBusIds = new Set<string>();

  if (!useInMemory) {
    try {
      const keys = await redis.keys('bus:position:*');
      if (keys.length > 0) {
        const values = await redis.mget(...keys);
        values.forEach((v) => {
          if (v) {
            const pos = JSON.parse(v);
            if (pos.isOverride || pos.isMock) {
              overriddenBusIds.add(pos.busId);
            }
          }
        });
      }
    } catch (err: any) {
      console.warn('⚠️ Simulator: Failed to check overrides in Redis:', err.message);
    }
  } else {
    try {
      const res = await fetch('http://localhost:3000/v1/buses');
      const result = (await res.json()) as any;
      if (result.success && Array.isArray(result.data)) {
        result.data.forEach((b: any) => {
          if (b.currentPosition?.isOverride || b.currentPosition?.isMock) {
            overriddenBusIds.add(b.id);
          }
        });
      }
    } catch (err) {
      // Suppress network errors
    }
  }

  for (const bus of simulatedBuses) {
    if (overriddenBusIds.has(bus.busId)) {
      // Skip simulating this bus to respect manual/friend GPS location overrides
      continue;
    }

    const position = stepBus(bus);
    if (!useInMemory) {
      try {
        await redis.set(`bus:position:${bus.busId}`, JSON.stringify(position), 'EX', 30);
        await redis.publish(POSITION_CHANNEL, JSON.stringify(position));
      } catch (err: any) {
        console.warn('⚠️ Simulator: Failed to write to Redis, falling back to offline/http-sync mode.');
        useInMemory = true;
      }
    }
    
    if (useInMemory) {
      try {
        await fetch('http://localhost:3000/v1/buses/positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(position),
        });
      } catch (err: any) {
        // Suppress network errors if the backend server is starting up or reloading
      }
    }
    
    console.log(`🚌 Bus ${position.busNumber} (${position.vehicleNo}) -> Lat: ${position.lat}, Lon: ${position.lon}, Speed: ${position.speed} km/h`);
  }
}

async function main() {
  await prisma.$connect();
  const buses = await loadBuses();
  if (buses.length === 0) {
    throw new Error('No active buses found. Seed the database first.');
  }

  console.log(`Simulator loaded ${buses.length} active buses`);
  await publish(buses);
  setInterval(() => {
    publish(buses).catch((error) => console.error('Simulation tick failed', error));
  }, TICK_INTERVAL_MS);
}

main().catch(async (error) => {
  console.error('Simulator failed to start', error);
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(1);
});
