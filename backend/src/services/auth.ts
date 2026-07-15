import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { hash, compare } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { prisma } from '../db/prisma';

const SALT_ROUNDS = 12;

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  iat: number;
  exp: number;
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

export function generateAccessToken(userId: string, email: string): string {
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign({ sub: userId, email }, config.jwt.accessSecret as Secret, options);
}

export function generateRefreshToken(userId: string): { token: string; tokenId: string } {
  const tokenId = uuidv4();
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn as SignOptions['expiresIn'],
  };
  const token = jwt.sign({ sub: userId, tokenId }, config.jwt.refreshSecret as Secret, options);
  return { token, tokenId };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwt.accessSecret as Secret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret as Secret) as RefreshTokenPayload;
}

export async function storeRefreshToken(userId: string, tokenId: string, token: string): Promise<void> {
  const decoded = jwt.decode(token) as RefreshTokenPayload;
  const expiresAt = new Date(decoded.exp * 1000);

  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      token,
      userId,
      expiresAt,
    },
  });
}

export async function validateRefreshToken(token: string): Promise<string | null> {
  try {
    const decoded = verifyRefreshToken(token);
    const stored = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!stored || stored.userId !== decoded.sub) {
      return null;
    }

    if (new Date() > stored.expiresAt) {
      await prisma.refreshToken.delete({ where: { token } });
      return null;
    }

    return decoded.sub;
  } catch {
    return null;
  }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

export function getTokenExpirySeconds(): number {
  const expiresIn = config.jwt.accessExpiresIn;
  // Parse the expiry string (e.g., "15m", "1h", "1d")
  const match = expiresIn.match(/^(\d+)([mhd])$/);
  if (!match) return 900; // Default to 15 minutes

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 900;
  }
}
