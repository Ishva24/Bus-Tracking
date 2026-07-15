import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db/prisma';

jest.mock('../db/prisma', () => ({
  __esModule: true,
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    bus: {
      findUnique: jest.fn(),
    },
    stop: {
      findUnique: jest.fn(),
    },
    proximityAlert: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
  default: null,
}));

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.userId = 'mock-user-id';
    req.userEmail = 'user@example.com';
    next();
  },
  optionalAuthMiddleware: (req: any, res: any, next: any) => {
    req.userId = 'mock-user-id';
    req.userEmail = 'user@example.com';
    next();
  },
}));

describe('Users / Alerts Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /v1/users/me/alerts', () => {
    it('returns list of proximity alerts', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          busId: 'bus-1',
          boardingStopId: 'stop-1',
          stopsThreshold: 2,
          triggered: false,
          createdAt: new Date(),
          bus: { busNumber: '47C', vehicleNo: 'TN01AB1234' },
          stop: { name: 'Tambaram' },
        },
      ];
      (prisma.proximityAlert.findMany as jest.Mock).mockResolvedValueOnce(mockAlerts);

      const response = await request(app)
        .get('/v1/users/me/alerts')
        .set('Authorization', 'Bearer mock-jwt-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].busNumber).toBe('47C');
      expect(response.body.data[0].boardingStopName).toBe('Tambaram');
    });
  });

  describe('POST /v1/users/me/alerts', () => {
    it('creates or updates a proximity alert', async () => {
      (prisma.bus.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'bus-1' });
      (prisma.stop.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'stop-1' });
      (prisma.proximityAlert.upsert as jest.Mock).mockResolvedValueOnce({
        id: 'new-alert-id',
        busId: 'bus-1',
        boardingStopId: 'stop-1',
        stopsThreshold: 3,
        triggered: false,
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/v1/users/me/alerts')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          busId: 'bus-1',
          boardingStopId: 'stop-1',
          stopsThreshold: 3,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.stopsThreshold).toBe(3);
    });

    it('returns 404 if bus or stop is not found', async () => {
      (prisma.bus.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/v1/users/me/alerts')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          busId: 'invalid-bus',
          boardingStopId: 'stop-1',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
