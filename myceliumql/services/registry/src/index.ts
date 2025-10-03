// MyceliumQL Cartridge Registry Service
// Manages installation, configuration, and lifecycle of API cartridges

import { BaseCartridge } from './BaseCartridge';
import { Neo4jClient, VaultClient, KafkaProducer, RedisClient } from './clients';
import { logger } from './utils/logger';

export interface CartridgeInstallationConfig {
  cartridgeId: string;
  tenantId: string;
  config: Record<string, any>;
  version?: string;
}

export interface CartridgeContext {
  tenantId: string;
  isMultiTenant: boolean;
  vault: VaultClient;
  neo4j: Neo4jClient;
  kafka: KafkaProducer;
  redis: RedisClient;
}

export class CartridgeRegistry {
  private cartridges = new Map<string, typeof BaseCartridge>();
  private instances = new Map<string, BaseCartridge>();
  
  // Infrastructure clients
  private neo4j: Neo4jClient;
  private vault: VaultClient;
  private kafka: KafkaProducer;
  private redis: RedisClient;

  constructor() {
    // Infrastructure clients will be initialized in initialize()
  }

  async initialize() {
    await this.initializeClients();
    this.registerBuiltInCartridges();
    logger.info('CartridgeRegistry initialized successfully');
  }

  private async initializeClients() {
    try {
      this.neo4j = new Neo4jClient({
        uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        user: process.env.NEO4J_USER || 'neo4j',
        password: process.env.NEO4J_PASSWORD || 'mycelium123'
      });

      this.vault = new VaultClient({
        endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
        token: process.env.VAULT_TOKEN || 'mycelium-root-token'
      });

      this.kafka = new KafkaProducer({
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
        clientId: 'mycelium-registry'
      });

      this.redis = new RedisClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      });

      logger.info('Infrastructure clients initialized');
    } catch (error) {
      logger.error('Failed to initialize infrastructure clients:', error);
      throw error;
    }
  }

  private registerBuiltInCartridges() {
    // These would import the actual cartridge classes
    // For now, we'll register them by name
    
    logger.info('Registering built-in cartridges', {
      cartridges: ['shopify', 'twilio', 'sendgrid']
    });
    
    // TODO: Import and register actual cartridge classes
    // this.register('shopify', ShopifyCartridge);
    // this.register('twilio', TwilioCartridge);
    // this.register('sendgrid', SendGridCartridge);
  }

  register(id: string, cartridgeClass: typeof BaseCartridge) {
    this.cartridges.set(id, cartridgeClass);
    logger.info(`Cartridge registered: ${id}`);
  }

  async install(config: CartridgeInstallationConfig): Promise<{success: boolean, cartridgeId: string, version: string}> {
    const { tenantId, cartridgeId } = config;
    
    try {
      logger.info(`Installing cartridge: ${cartridgeId} for tenant: ${tenantId}`);
      
      const CartridgeClass = this.cartridges.get(cartridgeId);
      if (!CartridgeClass) {
        throw new Error(`Cartridge ${cartridgeId} not found in registry`);
      }

      const context = await this.buildContext(tenantId);
      const cartridge = new CartridgeClass(context);
      
      // Initialize the cartridge with tenant-specific config
      await cartridge.initialize(config.config);
      
      // Validate the cartridge is working correctly
      const isValid = await cartridge.validate();
      if (!isValid) {
        throw new Error(`Cartridge ${cartridgeId} validation failed`);
      }

      // Store instance for future use
      const instanceKey = `${tenantId}:${cartridgeId}`;
      this.instances.set(instanceKey, cartridge);

      // Register with Apollo Gateway
      await this.registerWithGateway(tenantId, cartridge);

      // Store installation record in Neo4j
      await this.neo4j.run(
        `
        MERGE (t:Tenant {id: $tenantId})
        MERGE (c:CartridgeInstallation {
          tenantId: $tenantId,
          cartridgeId: $cartridgeId
        })
        SET c.installedAt = datetime(),
            c.status = 'active',
            c.version = $version,
            c.config = $config
        MERGE (t)-[:HAS_INSTALLED]->(c)
        `,
        {
          tenantId,
          cartridgeId,
          version: config.version || '1.0.0',
          config: JSON.stringify(config.config)
        }
      );

      logger.info(`Cartridge installed successfully`, { tenantId, cartridgeId });

      return { 
        success: true, 
        cartridgeId,
        version: config.version || '1.0.0'
      };
      
    } catch (error: any) {
      logger.error(`Failed to install cartridge`, { 
        tenantId, 
        cartridgeId, 
        error: error.message 
      });
      throw error;
    }
  }

  async uninstall(tenantId: string, cartridgeId: string): Promise<{success: boolean}> {
    try {
      logger.info(`Uninstalling cartridge: ${cartridgeId} for tenant: ${tenantId}`);
      
      const instanceKey = `${tenantId}:${cartridgeId}`;
      const cartridge = this.instances.get(instanceKey);
      
      if (!cartridge) {
        throw new Error(`Cartridge ${cartridgeId} not installed for tenant ${tenantId}`);
      }

      // Gracefully teardown cartridge
      await cartridge.teardown();

      // Remove from instances
      this.instances.delete(instanceKey);

      // Update installation record
      await this.neo4j.run(
        `
        MATCH (c:CartridgeInstallation {
          tenantId: $tenantId,
          cartridgeId: $cartridgeId
        })
        SET c.uninstalledAt = datetime(),
            c.status = 'inactive'
        `,
        { tenantId, cartridgeId }
      );

      logger.info(`Cartridge uninstalled successfully`, { tenantId, cartridgeId });

      return { success: true };
      
    } catch (error: any) {
      logger.error(`Failed to uninstall cartridge`, { 
        tenantId, 
        cartridgeId, 
        error: error.message 
      });
      throw error;
    }
  }

  async getCartridge(tenantId: string, cartridgeId: string): Promise<BaseCartridge> {
    const instanceKey = `${tenantId}:${cartridgeId}`;
    let cartridge = this.instances.get(instanceKey);
    
    if (!cartridge) {
      // Try to load from database
      const result = await this.neo4j.run(
        `
        MATCH (c:CartridgeInstallation {
          tenantId: $tenantId,
          cartridgeId: $cartridgeId,
          status: 'active'
        })
        RETURN c.config as config
        `,
        { tenantId, cartridgeId }
      );

      if (result.records.length === 0) {
        throw new Error(`Cartridge ${cartridgeId} not installed for tenant ${tenantId}`);
      }

      // Reinstantiate cartridge
      const CartridgeClass = this.cartridges.get(cartridgeId);
      if (!CartridgeClass) {
        throw new Error(`Cartridge ${cartridgeId} not found in registry`);
      }

      const context = await this.buildContext(tenantId);
      cartridge = new CartridgeClass(context);
      
      // Reload configuration
      const configJson = result.records[0].get('config');
      const config = JSON.parse(configJson);
      await cartridge.initialize(config);
      
      this.instances.set(instanceKey, cartridge);
    }
    
    return cartridge;
  }

  async listInstalled(tenantId: string): Promise<Array<{id: string, installedAt: string, version: string}>> {
    const result = await this.neo4j.run(
      `
      MATCH (c:CartridgeInstallation {
        tenantId: $tenantId,
        status: 'active'
      })
      RETURN c.cartridgeId as id, c.installedAt as installedAt, c.version as version
      ORDER BY c.installedAt DESC
      `,
      { tenantId }
    );

    return result.records.map(r => ({
      id: r.get('id'),
      installedAt: r.get('installedAt'),
      version: r.get('version')
    }));
  }

  async listAvailable(): Promise<Array<{id: string, name: string, version: string, capabilities: string[]}>> {
    const available = [];
    
    for (const [id, CartridgeClass] of this.cartridges) {
      // Create a temporary instance to get metadata
      const tempContext = await this.buildContext('temp');
      const tempInstance = new CartridgeClass(tempContext);
      
      available.push({
        id,
        name: tempInstance.getMetadata().name,
        version: tempInstance.getMetadata().version,
        capabilities: tempInstance.getMetadata().capabilities
      });
    }
    
    return available;
  }

  private async buildContext(tenantId: string): Promise<CartridgeContext> {
    return {
      tenantId,
      isMultiTenant: process.env.MULTI_TENANT === 'true',
      vault: this.vault,
      neo4j: this.neo4j,
      kafka: this.kafka,
      redis: this.redis
    };
  }

  private async registerWithGateway(tenantId: string, cartridge: BaseCartridge) {
    // Register the cartridge's schema with Apollo Gateway
    // In practice, this would:
    // 1. Deploy a new subgraph service for this cartridge instance
    // 2. Update the gateway's service list
    // 3. Trigger schema composition
    
    const schema = cartridge.getTypeDefs();
    
    // Store schema for the gateway to use
    await this.redis.set(
      `schema:${tenantId}:${cartridge.getMetadata().id}`,
      JSON.stringify({
        typeDefs: schema,
        endpoint: `http://cartridges:4000/${tenantId}/${cartridge.getMetadata().id}`
      }),
      'EX',
      3600 // 1 hour TTL
    );

    logger.info(`Cartridge schema registered with gateway`, {
      tenantId,
      cartridgeId: cartridge.getMetadata().id
    });
  }
}