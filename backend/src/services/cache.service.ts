import { getRedis } from '../config/redis';

const DEFAULT_TTL = 300; // 5 minutes

export class CacheService {
  private prefix = 'cache';

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Get cached value.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedis();
      const data = await redis.get(this.getKey(key));
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached value with TTL.
   */
  async set(key: string, value: unknown, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
      const redis = getRedis();
      await redis.setex(this.getKey(key), ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete cached value.
   */
  async del(key: string): Promise<void> {
    try {
      const redis = getRedis();
      await redis.del(this.getKey(key));
    } catch (error) {
      console.error('Cache del error:', error);
    }
  }

  /**
   * Delete all cached values matching a pattern.
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const redis = getRedis();
      const keys = await redis.keys(this.getKey(pattern));
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  // ─── Specific Cache Methods ────────────────────────────────────

  /**
   * Cache organization data (TTL: 5 minutes).
   */
  async getOrganization(orgId: string) {
    return this.get(`org:${orgId}`);
  }

  async setOrganization(orgId: string, data: unknown) {
    return this.set(`org:${orgId}`, data, 300);
  }

  async invalidateOrganization(orgId: string) {
    await this.del(`org:${orgId}`);
    await this.invalidatePattern(`org:${orgId}:*`);
  }

  /**
   * Cache project lists (TTL: 2 minutes).
   */
  async getProjectList(orgId: string, page: number = 1) {
    return this.get(`org:${orgId}:projects:page:${page}`);
  }

  async setProjectList(orgId: string, page: number, data: unknown) {
    return this.set(`org:${orgId}:projects:page:${page}`, data, 120);
  }

  async invalidateProjectList(orgId: string) {
    return this.invalidatePattern(`org:${orgId}:projects:*`);
  }
}

export const cacheService = new CacheService();
