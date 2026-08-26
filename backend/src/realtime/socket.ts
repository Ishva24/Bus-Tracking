import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { BusPosition } from '@bustrack/shared';
import { config } from '../config';
import { redis } from '../db/redis';
import { computeETA } from '../services/eta';
import { verifyAccessToken } from '../services/auth';
import { evaluateProximityAlerts } from '../services/notification';

const POSITION_CHANNEL = 'bus:position:update';

export function createSocketServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token =
      typeof socket.handshake.auth.token === 'string'
        ? socket.handshake.auth.token
        : typeof socket.handshake.query.token === 'string'
          ? socket.handshake.query.token
          : undefined;

    if (!token) {
      next();
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.emit('connected', {
      socketId: socket.id,
      userId: socket.data.userId ?? null,
    });

    socket.on('subscribe:bus', ({ busId }) => {
      if (typeof busId === 'string' && busId) {
        socket.join(`bus:${busId}`);
      }
    });

    socket.on('unsubscribe:bus', ({ busId }) => {
      if (typeof busId === 'string' && busId) {
        socket.leave(`bus:${busId}`);
      }
    });

    socket.on('subscribe:route', ({ routeId }) => {
      if (typeof routeId === 'string' && routeId) {
        socket.join(`route:${routeId}`);
      }
    });

    socket.on('unsubscribe:route', ({ routeId }) => {
      if (typeof routeId === 'string' && routeId) {
        socket.leave(`route:${routeId}`);
      }
    });

    socket.on('request:eta', async (payload) => {
      try {
        const eta = await computeETA(payload.busId, payload.boardingStopId, payload.destinationStopId);
        socket.emit('bus:eta', eta);
      } catch (error) {
        socket.emit('error', {
          code: 'ETA_ERROR',
          message: error instanceof Error ? error.message : 'Unable to compute ETA',
        });
      }
    });
  });

  const subscriber = redis.duplicate();
  subscriber.subscribe(POSITION_CHANNEL).catch((error) => {
    console.error('Failed to subscribe to Redis position channel', error);
  });

  subscriber.on('message', (_channel, message) => {
    try {
      const position = JSON.parse(message) as BusPosition;
      io.to(`bus:${position.busId}`).emit('bus:position', position);
      io.to(`route:${position.routeId}`).emit('bus:position', position);

      evaluateProximityAlerts(position).catch((error) => {
        console.error('Failed to process proximity alert evaluation', error);
      });
    } catch (error) {
      console.error('Failed to broadcast bus position update', error);
    }
  });

  return io;
}
