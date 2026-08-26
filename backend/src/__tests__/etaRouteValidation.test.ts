import { prisma } from '../db/prisma';
import { getETACache } from '../db/redis';
import { computeETA } from '../services/eta';

jest.mock('../db/prisma', () => ({
  __esModule: true,
  prisma: {
    bus: { findUnique: jest.fn() },
    mapProviderConfig: { findFirst: jest.fn() },
  },
}));

jest.mock('../db/redis', () => ({
  getETACache: jest.fn(),
  setETACache: jest.fn(),
  incrementRateLimit: jest.fn(),
}));

jest.mock('../services/busPosition', () => ({
  getBusPositionById: jest.fn(),
}));

describe('ETA route validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getETACache as jest.Mock).mockResolvedValue(null);
  });

  it('rejects ETA requests for a route without stops', async () => {
    (prisma.bus.findUnique as jest.Mock).mockResolvedValue({
      id: 'bus-1',
      route: { routeStops: [] },
    });

    await expect(computeETA('bus-1', 'stop-1', 'stop-2')).rejects.toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Cannot calculate an ETA for a route without stops',
    });
  });
});
