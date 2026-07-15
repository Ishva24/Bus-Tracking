import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db/prisma';

jest.mock('../db/prisma', () => ({
  __esModule: true,
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    authLog: {
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
  default: null,
}));

describe('Auth Endpoints Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /v1/auth/register', () => {
    it('creates a new user and returns tokens on valid request', async () => {
      // Mock existing user check -> returns null (user doesn't exist yet)
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      // Mock user creation -> returns created user
      const createdUser = {
        id: 'mock-user-uuid',
        email: 'newuser@example.com',
        name: 'New User',
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.user.create as jest.Mock).mockResolvedValueOnce(createdUser);

      const response = await request(app)
        .post('/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          name: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('returns 409 Conflict if email is already registered', async () => {
      // Mock existing user check -> returns an existing user record
      const existingUser = {
        id: 'existing-uuid',
        email: 'duplicate@example.com',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(existingUser);

      const response = await request(app)
        .post('/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePassword123!',
          name: 'Existing User',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
      expect(response.body.error.message).toContain('already registered');
    });

    it('returns 400 Bad Request on invalid inputs (password too weak)', async () => {
      const response = await request(app)
        .post('/v1/auth/register')
        .send({
          email: 'bad@example.com',
          password: 'weak',
          name: 'Too Short',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
