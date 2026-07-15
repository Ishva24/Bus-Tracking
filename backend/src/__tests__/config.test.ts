import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db/prisma';

jest.mock('../db/prisma', () => ({
  __esModule: true,
  prisma: {
    mapProviderConfig: {
      findFirst: jest.fn(),
    },
  },
  default: null,
}));

describe('Config Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /v1/config/map-provider', () => {
    it('returns OSM provider when no config is in db', async () => {
      (prisma.mapProviderConfig.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app).get('/v1/config/map-provider');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.providerName).toBe('osm');
      expect(response.body.data.apiKey).toBeNull();
    });

    it('returns google details if active in db', async () => {
      (prisma.mapProviderConfig.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'some-id',
        providerName: 'google',
        apiKey: 'google-key-123',
        isActive: true,
      });

      const response = await request(app).get('/v1/config/map-provider');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.providerName).toBe('google');
      expect(response.body.data.apiKey).toBe('google-key-123');
    });
  });
});
