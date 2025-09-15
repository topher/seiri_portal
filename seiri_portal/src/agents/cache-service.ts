import "server-only";

import Redis from 'ioredis';

export interface CacheConfig {
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultTTL: number;
  keyPrefix: string;
}

export interface CacheStats {
  totalKeys: number;
  hitRate: number;
  memoryUsage: string;
  uptime: number;
}

// Default configuration
const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 300, // 5 minutes
  keyPrefix: 'agent:',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  }
};

export class CacheService {
  private redis?: Redis;
  private memoryCache: Map<string, { value: any; expires: number }>;
  private config: CacheConfig;
  private hits: number = 0;
  private misses: number = 0;
  private useRedis: boolean;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memoryCache = new Map();
    
    // Try to connect to Redis, fall back to memory cache
    this.useRedis = this.initializeRedis();
    
    if (!this.useRedis) {
      console.warn('Redis not available, using in-memory cache. Consider setting up Redis for production.');
      this.startMemoryCleanup();
    }
  }

  private initializeRedis(): boolean {
    try {
      if (!this.config.redis) return false;

      this.redis = new Redis({
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
        db: this.config.redis.db,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      // Handle Redis connection events
      this.redis.on('connect', () => {
        console.log('Redis connected for agent caching');
      });

      this.redis.on('error', (error) => {
        console.error('Redis connection error:', error);
        this.useRedis = false;
      });

      this.redis.on('close', () => {
        console.warn('Redis connection closed, falling back to memory cache');
        this.useRedis = false;
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      return false;
    }
  }

  private startMemoryCleanup(): void {
    // Clean up expired entries every minute
    setInterval(() => {
      const now = Date.now();
      this.memoryCache.forEach((entry, key) => {
        if (now > entry.expires) {
          this.memoryCache.delete(key);
        }
      });
    }, 60000);
  }

  private buildKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);

    try {
      if (this.useRedis && this.redis) {
        const value = await this.redis.get(fullKey);
        if (value !== null) {
          this.hits++;
          return JSON.parse(value) as T;
        }
      } else {
        // Use memory cache
        const entry = this.memoryCache.get(fullKey);
        if (entry && Date.now() <= entry.expires) {
          this.hits++;
          return entry.value as T;
        } else if (entry) {
          // Remove expired entry
          this.memoryCache.delete(fullKey);
        }
      }

      this.misses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.misses++;
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const ttl = ttlSeconds ?? this.config.defaultTTL;

    try {
      if (this.useRedis && this.redis) {
        await this.redis.setex(fullKey, ttl, JSON.stringify(value));
      } else {
        // Use memory cache
        const expires = Date.now() + (ttl * 1000);
        this.memoryCache.set(fullKey, { value, expires });
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.buildKey(key);

    try {
      if (this.useRedis && this.redis) {
        await this.redis.del(fullKey);
      } else {
        this.memoryCache.delete(fullKey);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);

    try {
      if (this.useRedis && this.redis) {
        const result = await this.redis.exists(fullKey);
        return result === 1;
      } else {
        const entry = this.memoryCache.get(fullKey);
        if (entry && Date.now() <= entry.expires) {
          return true;
        } else if (entry) {
          this.memoryCache.delete(fullKey);
        }
        return false;
      }
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Clear all cache entries with the configured prefix
   */
  async clear(): Promise<void> {
    try {
      if (this.useRedis && this.redis) {
        const keys = await this.redis.keys(`${this.config.keyPrefix}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        // Clear memory cache entries with our prefix
        const keysToDelete: string[] = [];
        this.memoryCache.forEach((_, key) => {
          if (key.startsWith(this.config.keyPrefix)) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach(key => this.memoryCache.delete(key));
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      if (this.useRedis && this.redis) {
        const info = await this.redis.info();
        const keyspace = await this.redis.info('keyspace');
        
        // Parse Redis info
        const dbInfo = keyspace.match(/db0:keys=(\d+)/);
        const totalKeys = dbInfo ? parseInt(dbInfo[1]) : 0;
        
        const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
        const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';
        
        const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
        const uptime = uptimeMatch ? parseInt(uptimeMatch[1]) : 0;

        return {
          totalKeys,
          hitRate: this.calculateHitRate(),
          memoryUsage,
          uptime
        };
      } else {
        // Memory cache stats
        return {
          totalKeys: this.memoryCache.size,
          hitRate: this.calculateHitRate(),
          memoryUsage: 'in-memory',
          uptime: 0 // Not applicable for memory cache
        };
      }
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        totalKeys: 0,
        hitRate: 0,
        memoryUsage: 'error',
        uptime: 0
      };
    }
  }

  /**
   * Get or set a value with a function (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch the value
    const value = await fetcher();
    
    // Store in cache
    await this.set(key, value, ttlSeconds);
    
    return value;
  }

  /**
   * Increment a counter in cache (useful for rate limiting)
   */
  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const fullKey = this.buildKey(key);
    const ttl = ttlSeconds ?? this.config.defaultTTL;

    try {
      if (this.useRedis && this.redis) {
        const result = await this.redis.incr(fullKey);
        if (result === 1) {
          // First increment, set TTL
          await this.redis.expire(fullKey, ttl);
        }
        return result;
      } else {
        // Memory cache increment
        const entry = this.memoryCache.get(fullKey);
        const currentValue = (entry && Date.now() <= entry.expires) ? entry.value : 0;
        const newValue = currentValue + 1;
        
        const expires = Date.now() + (ttl * 1000);
        this.memoryCache.set(fullKey, { value: newValue, expires });
        
        return newValue;
      }
    } catch (error) {
      console.error('Cache increment error:', error);
      return 1; // Default to 1 on error
    }
  }

  /**
   * Set multiple values at once
   */
  async setMultiple<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    const promises = entries.map(entry => 
      this.set(entry.key, entry.value, entry.ttl)
    );
    
    await Promise.all(promises);
  }

  /**
   * Get multiple values at once
   */
  async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    const promises = keys.map(async key => {
      const value = await this.get<T>(key);
      return { key, value };
    });
    
    const results = await Promise.all(promises);
    
    return results.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, T | null>);
  }

  /**
   * Get cache hit rate
   */
  private calculateHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.useRedis && !!this.redis;
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();