import request from 'supertest';
import { app } from '../app';

jest.mock('../db/prisma', () => ({
  __esModule: true,
  prisma: {
    bus: { findUnique: jest.fn() },
    emergencyAlert: { create: jest.fn() },
  },
  default: null,
}));

jest.mock('../db/redis', () => ({
  redis: { setex: jest.fn(), publish: jest.fn() },
  getAllBusPositions: jest.fn(),
  getBusPosition: jest.fn(),
  getETACache: jest.fn(),
  setETACache: jest.fn(),
  incrementRateLimit: jest.fn(),
}));

describe('Bus ingestion validation', () => {
  it('rejects an out-of-range live position before accessing the database', async () => {
    const response = await request(app)
      .post('/v1/buses/positions')
      .send({ busId: 'bus-1', lat: 91, lon: 80.2 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects malformed SOS coordinates', async () => {
    const response = await request(app)
      .post('/v1/buses/sos')
      .send({
        busId: 'bus-1',
        busNumber: '47C',
        vehicleNo: 'TN01AB1234',
        latitude: 'not-a-coordinate',
        longitude: 80.2,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
