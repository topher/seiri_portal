// MyceliumQL Base Cartridge SDK
// Abstract base class for all API integration cartridges

import { DocumentNode } from 'graphql';

export interface CartridgeMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  configSchema: Record<string, any>;
}

export interface CartridgeContext {
  tenantId: string;
  isMultiTenant: boolean;
  vault: any; // VaultClient
  neo4j: any; // Neo4jClient
  kafka: any; // KafkaProducer
  redis: any; // RedisClient
}

export interface WebhookPayload {
  rawBody?: Buffer;
  body?: any;
  headers: Record<string, string>;
  path?: string;
  topic?: string;
  type?: string;
}

export interface CartridgeConfig {
  [key: string]: any;
}

export abstract class BaseCartridge {
  protected context: CartridgeContext;
  protected config: CartridgeConfig = {};
  protected initialized: boolean = false;

  constructor(context: CartridgeContext) {
    this.context = context;
  }

  // Abstract methods that must be implemented by cartridges
  abstract getMetadata(): CartridgeMetadata;
  abstract getTypeDefs(): DocumentNode;
  abstract getResolvers(): Record<string, any>;
  abstract validateConfig(config: CartridgeConfig): boolean;
  abstract handleWebhook(payload: WebhookPayload): Promise<void>;

  // Lifecycle methods
  async initialize(config: CartridgeConfig): Promise<void> {
    if (!this.validateConfig(config)) {
      throw new Error(`Invalid configuration for cartridge ${this.getMetadata().id}`);
    }

    this.config = config;
    await this.onInitialize();
    this.initialized = true;

    this.log('info', 'Cartridge initialized successfully', {
      cartridgeId: this.getMetadata().id,
      tenantId: this.context.tenantId
    });
  }

  async validate(): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Cartridge must be initialized before validation');
    }

    try {
      await this.onValidate();
      return true;
    } catch (error) {
      this.log('error', 'Cartridge validation failed', { error });
      return false;
    }
  }

  async teardown(): Promise<void> {
    await this.onTeardown();
    this.initialized = false;

    this.log('info', 'Cartridge torn down successfully', {
      cartridgeId: this.getMetadata().id,
      tenantId: this.context.tenantId
    });
  }

  // Hook methods for cartridge-specific logic (optional overrides)
  protected async onInitialize(): Promise<void> {
    // Override in subclasses for custom initialization
  }

  protected async onValidate(): Promise<void> {
    // Override in subclasses for custom validation
  }

  protected async onTeardown(): Promise<void> {
    // Override in subclasses for custom teardown
  }

  // Utility methods available to all cartridges

  protected async storeSecret(key: string, value: string): Promise<void> {
    // Store tenant-specific secrets in Vault
    const secretPath = `tenant/${this.context.tenantId}/${this.getMetadata().id}/${key}`;
    await this.context.vault.write(secretPath, { value });
  }

  protected async getSecret(key: string): Promise<string | null> {
    // Retrieve tenant-specific secrets from Vault
    const secretPath = `tenant/${this.context.tenantId}/${this.getMetadata().id}/${key}`;
    try {
      const result = await this.context.vault.read(secretPath);
      return result?.data?.value || null;
    } catch (error) {
      return null;
    }
  }

  protected async cacheSet(key: string, value: any, ttl: number = 3600): Promise<void> {
    // Store data in Redis with tenant prefix
    const cacheKey = `${this.context.tenantId}:${this.getMetadata().id}:${key}`;
    await this.context.redis.setex(cacheKey, ttl, JSON.stringify(value));
  }

  protected async cacheGet(key: string): Promise<any | null> {
    // Retrieve data from Redis with tenant prefix
    const cacheKey = `${this.context.tenantId}:${this.getMetadata().id}:${key}`;
    const result = await this.context.redis.get(cacheKey);
    return result ? JSON.parse(result) : null;
  }

  protected async cacheDel(key: string): Promise<void> {
    // Delete data from Redis with tenant prefix
    const cacheKey = `${this.context.tenantId}:${this.getMetadata().id}:${key}`;
    await this.context.redis.del(cacheKey);
  }

  protected async publishEvent(topic: string, event: any): Promise<void> {
    // Publish events to Kafka with tenant context
    await this.context.kafka.send({
      topic: `mycelium.${topic}`,
      messages: [{
        key: this.context.tenantId,
        value: JSON.stringify({
          cartridgeId: this.getMetadata().id,
          tenantId: this.context.tenantId,
          timestamp: new Date().toISOString(),
          event
        })
      }]
    });
  }

  protected async storeGraphData(cypher: string, params: Record<string, any> = {}): Promise<any> {
    // Execute Cypher query in Neo4j with tenant context
    const enrichedParams = {
      ...params,
      tenantId: this.context.tenantId,
      cartridgeId: this.getMetadata().id
    };

    return await this.context.neo4j.run(cypher, enrichedParams);
  }

  protected log(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta: any = {}): void {
    // Structured logging with cartridge and tenant context
    const logData = {
      level,
      message,
      cartridgeId: this.getMetadata().id,
      tenantId: this.context.tenantId,
      timestamp: new Date().toISOString(),
      ...meta
    };

    // In a real implementation, this would use a proper logger like Winston
    console.log(JSON.stringify(logData));
  }

  // GraphQL schema building helpers
  protected buildFederatedSchema(): DocumentNode {
    // Combine type definitions and resolvers into federated schema
    // This would use @apollo/subgraph utilities
    return this.getTypeDefs();
  }

  // Webhook signature validation helpers
  protected validateWebhookSignature(
    payload: WebhookPayload,
    secret: string,
    algorithm: 'hmac-sha1' | 'hmac-sha256' | 'ecdsa' = 'hmac-sha256'
  ): boolean {
    // Implement signature validation based on the service
    // Each cartridge can override this for service-specific validation
    return true; // Placeholder
  }

  // Rate limiting helpers
  protected async checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
    // Simple rate limiting using Redis
    const rateLimitKey = `ratelimit:${this.context.tenantId}:${this.getMetadata().id}:${key}`;
    
    const current = await this.context.redis.incr(rateLimitKey);
    if (current === 1) {
      await this.context.redis.expire(rateLimitKey, window);
    }
    
    return current <= limit;
  }

  // Health check method
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy', details?: any }> {
    try {
      if (!this.initialized) {
        return { status: 'unhealthy', details: 'Cartridge not initialized' };
      }

      // Override in subclasses for service-specific health checks
      await this.onHealthCheck();
      
      return { status: 'healthy' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  protected async onHealthCheck(): Promise<void> {
    // Override in subclasses for custom health checks
  }

  // Configuration management
  protected getConfigValue(key: string, defaultValue?: any): any {
    return this.config[key] ?? defaultValue;
  }

  protected requireConfigValue(key: string): any {
    const value = this.config[key];
    if (value === undefined || value === null) {
      throw new Error(`Required configuration value missing: ${key}`);
    }
    return value;
  }
}

export default BaseCartridge;