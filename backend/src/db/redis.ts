import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { config } from '../config';

export class InMemoryRedis extends EventEmitter {
  private static store = new Map<string, { value: string; expiresAt?: number }>();
  private static globalEmitter = new EventEmitter();

  constructor() {
    super();
  }

  async get(key: string): Promise<string | null> {
    const item = InMemoryRedis.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      InMemoryRedis.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string): Promise<'OK'> {
    InMemoryRedis.store.set(key, { value });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    InMemoryRedis.store.set(key, {
      value,
      expiresAt: Date.now() + seconds * 1000,
    });
    return 'OK';
  }

  async keys(pattern: string): Promise<string[]> {
    const cleanPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${cleanPattern}$`);
    const results: string[] = [];
    const now = Date.now();
    for (const [key, item] of InMemoryRedis.store.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        InMemoryRedis.store.delete(key);
        continue;
      }
      if (regex.test(key)) {
        results.push(key);
      }
    }
    return results;
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    const results: (string | null)[] = [];
    for (const key of keys) {
      results.push(await this.get(key));
    }
    return results;
  }

  async incr(key: string): Promise<number> {
    const valStr = await this.get(key);
    const val = valStr ? parseInt(valStr, 10) : 0;
    const newVal = val + 1;
    await this.set(key, String(newVal));
    return newVal;
  }

  async pexpire(key: string, milliseconds: number): Promise<number> {
    const item = InMemoryRedis.store.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + milliseconds;
    return 1;
  }

  async publish(channel: string, message: string): Promise<number> {
    InMemoryRedis.globalEmitter.emit(channel, message);
    return 1;
  }

  async subscribe(channel: string): Promise<string> {
    InMemoryRedis.globalEmitter.on(channel, (message: string) => {
      this.emit('message', channel, message);
    });
    return channel;
  }

  duplicate(): InMemoryRedis {
    return new InMemoryRedis();
  }

  async disconnect() {}
  async quit() {}
}

class ResilientRedisClient extends EventEmitter {
  private redisClient: Redis | null = null;
  private inMemoryClient = new InMemoryRedis();
  private useInMemory = true;

  constructor() {
    super();
    this.inMemoryClient.on('message', (channel, message) => {
      this.emit('message', channel, message);
    });
    this.inMemoryClient.on('pmessage', (pattern, channel, message) => {
      this.emit('pmessage', pattern, channel, message);
    });
    this.connectRedis();
  }

  private connectRedis() {
    try {
      this.redisClient = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        connectTimeout: 2000,
      });

      this.redisClient.on('message', (channel, message) => {
        this.emit('message', channel, message);
      });
      this.redisClient.on('pmessage', (pattern, channel, message) => {
        this.emit('pmessage', pattern, channel, message);
      });

      this.redisClient.on('connect', () => {
        console.log('📡 Redis connected successfully');
        this.useInMemory = false;
        this.emit('connect');
      });

      this.redisClient.on('error', (err) => {
        if (this.useInMemory === false) {
          console.warn('⚠️ Redis error, switching to In-Memory mode:', err.message);
        }
        this.useInMemory = true;
      });

      this.redisClient.connect().catch((err) => {
        console.warn('⚠️ Redis connection failed, running in resilient In-Memory mode:', err.message);
        this.useInMemory = true;
      });
    } catch (err: any) {
      console.warn('⚠️ Redis initialization failed, running in resilient In-Memory mode');
      this.useInMemory = true;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.useInMemory || !this.redisClient) {
      return this.inMemoryClient.get(key);
    }
    try {
      return await this.redisClient.get(key);
    } catch {
      return this.inMemoryClient.get(key);
    }
  }

  async set(key: string, value: string): Promise<string> {
    if (this.useInMemory || !this.redisClient) {
      return this.inMemoryClient.set(key, value);
    }
    try {
      return await this.redisClient.set(key, value);
    } catch {
      return this.inMemoryClient.set(key, value);
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<string> {
    if (this.useInMemory || !this.redisClient) {
      return this.inMemoryClient.setex(key, seconds, value);
    }
    try {
      return await this.redisClient.setex(key, seconds, value);
    } catch {
      return this.inMemoryClient.setex(key, seconds, value);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.useInMemory || !this.redisClient) {
      return this.inMemoryClient.keys(pattern);
    }
    try {
      return await this.redisClient.keys(pattern);
    } catch {
      return this.inMemoryClient.keys(pattern);
    }
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    if (this.useInMemory || !this.redisClient) {
      return this.inMemoryClient.mget(...keys);
    }
    try {
      return await this.redisClient.mget(...keys);
    } catch {
      return this.inMemoryClient.mget(...keys);
    }
  }

  async incr(key: string): Promise<number> {
    if (this.useInMemory || !this.redisClient) {
      return this.inMemoryClient.incr(key);
    }
    try {
      return await this.redisClient.incr(key);
    } catch {
      return this.inMemoryClient.incr(key);
    }
  }

  async pexpire(key: string, milliseconds: number): Promise<number> {
    if (this.useInMemory || !this.redisClient) {
      return this.inMemoryClient.pexpire(key, milliseconds);
    }
    try {
      return await this.redisClient.pexpire(key, milliseconds);
    } catch {
      return this.inMemoryClient.pexpire(key, milliseconds);
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    await this.inMemoryClient.publish(channel, message);
    if (this.useInMemory || !this.redisClient) {
      return 1;
    }
    try {
      return await this.redisClient.publish(channel, message);
    } catch {
      return 1;
    }
  }

  async subscribe(channel: string): Promise<any> {
    if (this.useInMemory || !this.redisClient) {
      return this.inMemoryClient.subscribe(channel);
    }
    try {
      return await this.redisClient.subscribe(channel);
    } catch {
      return this.inMemoryClient.subscribe(channel);
    }
  }

  duplicate(): ResilientRedisClient {
    return new ResilientRedisClient();
  }

  async connect() {
    // Connection is managed in constructor, resolve immediately for startup compatibility
  }

  async disconnect() {
    if (this.redisClient) {
      await this.redisClient.disconnect();
    }
  }
}

// Single exported client instance
export const redis = new ResilientRedisClient();

// Helper functions for bus positions
export async function getBusPosition(busId: string) {
  const data = await redis.get(`bus:position:${busId}`);
  return data ? JSON.parse(data) : null;
}

export async function setBusPosition(busId: string, position: object, ttlSeconds = 30) {
  await redis.setex(`bus:position:${busId}`, ttlSeconds, JSON.stringify(position));
}

export async function getAllBusPositions() {
  const keys = await redis.keys('bus:position:*');
  if (keys.length === 0) return [];

  const values = await redis.mget(...keys);
  return values
    .filter((v): v is string => v !== null)
    .map((v) => JSON.parse(v));
}

// Helper functions for ETA cache
export async function getETACache(busId: string, boardingStopId: string, destinationStopId: string) {
  const key = `bus:eta:${busId}:${boardingStopId}:${destinationStopId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setETACache(
  busId: string,
  boardingStopId: string,
  destinationStopId: string,
  eta: object,
  ttlSeconds = 30
) {
  const key = `bus:eta:${busId}:${boardingStopId}:${destinationStopId}`;
  await redis.setex(key, ttlSeconds, JSON.stringify(eta));
}

// Helper for session/rate limiting
export async function incrementRateLimit(key: string, windowMs: number): Promise<number> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.pexpire(key, windowMs);
  }
  return current;
}

export default redis;
