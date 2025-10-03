// Shopify E-commerce Integration Cartridge
// Priority #1 API for wine store federation

import { DocumentNode, gql } from 'graphql';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BaseCartridge, CartridgeMetadata, WebhookPayload, CartridgeConfig } from '../../base/src/BaseCartridge';
import { ShopifyClient } from './client';
import { ShopifyWebhookHandler } from './webhooks';
import { WineProductMapper } from './mappers/wine-product-mapper';

export interface ShopifyCartridgeConfig extends CartridgeConfig {
  shop: string; // e.g., 'wine-store.myshopify.com'
  accessToken: string;
  webhookSecret: string;
  apiVersion?: string; // defaults to '2025-01'
}

export class ShopifyCartridge extends BaseCartridge {
  private client: ShopifyClient;
  private webhookHandler: ShopifyWebhookHandler;
  private wineMapper: WineProductMapper;

  constructor(context: any) {
    super(context);
  }

  getMetadata(): CartridgeMetadata {
    return {
      id: 'shopify',
      name: 'Shopify E-commerce Integration',
      version: '1.0.0',
      description: 'Complete Shopify integration for wine commerce with inventory sync, order management, and customer analytics',
      capabilities: [
        'product-management',
        'inventory-sync',
        'order-processing',
        'customer-analytics',
        'wine-specific-metadata',
        'webhook-processing',
        'pos-integration'
      ],
      configSchema: {
        type: 'object',
        required: ['shop', 'accessToken', 'webhookSecret'],
        properties: {
          shop: {
            type: 'string',
            description: 'Shopify shop domain (e.g., wine-store.myshopify.com)',
            pattern: '^[a-zA-Z0-9-]+\\.myshopify\\.com$'
          },
          accessToken: {
            type: 'string',
            description: 'Shopify Admin API access token',
            minLength: 32
          },
          webhookSecret: {
            type: 'string',
            description: 'Webhook secret for signature validation',
            minLength: 16
          },
          apiVersion: {
            type: 'string',
            description: 'Shopify API version',
            default: '2025-01',
            enum: ['2025-01', '2024-10', '2024-07']
          }
        }
      }
    };
  }

  getTypeDefs(): DocumentNode {
    // Load schema from file
    const schemaPath = join(__dirname, 'schema.graphql');
    const schemaString = readFileSync(schemaPath, 'utf-8');
    return gql(schemaString);
  }

  getResolvers(): Record<string, any> {
    return {
      Query: {
        // Product queries
        shopifyProduct: async (_, { id }) => {
          return await this.client.getProduct(id);
        },

        shopifyProducts: async (_, args) => {
          return await this.client.getProducts(args);
        },

        winesByVarietal: async (_, { varietal, first }) => {
          const query = `tag:wine AND tag:${varietal.toLowerCase()}`;
          return await this.client.getProducts({ query, first });
        },

        winesByRegion: async (_, { region, first }) => {
          const query = `tag:wine AND tag:region-${region.toLowerCase().replace(/\s+/g, '-')}`;
          return await this.client.getProducts({ query, first });
        },

        winesByVintage: async (_, { vintage, first }) => {
          const query = `tag:wine AND tag:vintage-${vintage}`;
          return await this.client.getProducts({ query, first });
        },

        wineStockLevels: async () => {
          return await this.client.getInventoryLevels({ productTags: ['wine'] });
        },

        // Order queries
        shopifyOrder: async (_, { id }) => {
          return await this.client.getOrder(id);
        },

        shopifyOrders: async (_, args) => {
          return await this.client.getOrders(args);
        },

        // Customer queries
        shopifyCustomer: async (_, { id }) => {
          return await this.client.getCustomer(id);
        },

        shopifyCustomers: async (_, args) => {
          return await this.client.getCustomers(args);
        },

        wineCustomerInsights: async (_, { customerId }) => {
          return await this.generateWineCustomerInsights(customerId);
        }
      },

      Mutation: {
        createWineProduct: async (_, { input }) => {
          try {
            const shopifyInput = this.wineMapper.mapWineProductToShopify(input);
            const product = await this.client.createProduct(shopifyInput);
            
            // Store wine-specific metadata in graph
            await this.storeWineMetadata(product.id, input.wineDetails);
            
            return {
              product,
              userErrors: []
            };
          } catch (error) {
            this.log('error', 'Failed to create wine product', { error, input });
            return {
              product: null,
              userErrors: [{ 
                message: error instanceof Error ? error.message : 'Unknown error',
                field: ['input']
              }]
            };
          }
        },

        updateWineProduct: async (_, { id, input }) => {
          try {
            const shopifyInput = this.wineMapper.mapWineProductUpdateToShopify(input);
            const product = await this.client.updateProduct(id, shopifyInput);
            
            // Update wine-specific metadata
            if (input.wineDetails) {
              await this.storeWineMetadata(id, input.wineDetails);
            }
            
            return {
              product,
              userErrors: []
            };
          } catch (error) {
            this.log('error', 'Failed to update wine product', { error, id, input });
            return {
              product: null,
              userErrors: [{ 
                message: error instanceof Error ? error.message : 'Unknown error',
                field: ['input']
              }]
            };
          }
        },

        updateWineInventory: async (_, { input }) => {
          try {
            const inventoryLevels = await this.client.updateInventory(input);
            
            // Publish inventory change event
            await this.publishEvent('inventory.updated', {
              productIds: input.items.map(item => item.productId),
              changes: input.items
            });
            
            return {
              success: true,
              inventoryLevels,
              userErrors: []
            };
          } catch (error) {
            this.log('error', 'Failed to update wine inventory', { error, input });
            return {
              success: false,
              inventoryLevels: [],
              userErrors: [{ 
                message: error instanceof Error ? error.message : 'Unknown error',
                field: ['input']
              }]
            };
          }
        },

        createWineOrder: async (_, { input }) => {
          try {
            const shopifyOrderInput = this.wineMapper.mapWineOrderToShopify(input);
            const order = await this.client.createOrder(shopifyOrderInput);
            
            // Store wine order context
            if (input.wineOrderDetails) {
              await this.storeWineOrderDetails(order.id, input.wineOrderDetails);
            }
            
            // Publish order created event
            await this.publishEvent('wine-order.created', {
              orderId: order.id,
              customerId: order.customer?.id,
              totalValue: order.totalPrice
            });
            
            return {
              order,
              userErrors: []
            };
          } catch (error) {
            this.log('error', 'Failed to create wine order', { error, input });
            return {
              order: null,
              userErrors: [{ 
                message: error instanceof Error ? error.message : 'Unknown error',
                field: ['input']
              }]
            };
          }
        },

        syncInventoryWithPOS: async (_, { restaurantId }) => {
          try {
            // This would integrate with restaurant POS system
            // For VinoVoyage integration
            const syncResult = await this.syncWithRestaurantPOS(restaurantId);
            
            return {
              success: syncResult.success,
              syncedProducts: syncResult.products,
              userErrors: syncResult.errors || []
            };
          } catch (error) {
            this.log('error', 'Failed to sync inventory with POS', { error, restaurantId });
            return {
              success: false,
              syncedProducts: [],
              userErrors: [{ 
                message: error instanceof Error ? error.message : 'Unknown error',
                field: ['restaurantId']
              }]
            };
          }
        }
      },

      // Type resolvers for wine-specific fields
      ShopifyProduct: {
        wineDetails: async (product) => {
          return await this.getWineMetadata(product.id);
        }
      },

      ShopifyOrder: {
        wineOrderDetails: async (order) => {
          return await this.getWineOrderDetails(order.id);
        }
      },

      ShopifyCustomer: {
        wineProfile: async (customer) => {
          return await this.getWineCustomerProfile(customer.id);
        }
      },

      ShopifyLineItem: {
        wineItemDetails: async (lineItem) => {
          return await this.getWineLineItemDetails(lineItem.id);
        }
      }
    };
  }

  validateConfig(config: ShopifyCartridgeConfig): boolean {
    const required = ['shop', 'accessToken', 'webhookSecret'];
    
    for (const field of required) {
      if (!config[field]) {
        this.log('error', `Missing required configuration: ${field}`);
        return false;
      }
    }

    // Validate shop domain format
    if (!config.shop.endsWith('.myshopify.com')) {
      this.log('error', 'Invalid shop domain format');
      return false;
    }

    return true;
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    await this.webhookHandler.handle(payload);
  }

  protected async onInitialize(): Promise<void> {
    const config = this.config as ShopifyCartridgeConfig;
    
    // Initialize Shopify client
    this.client = new ShopifyClient({
      shop: config.shop,
      accessToken: config.accessToken,
      apiVersion: config.apiVersion || '2025-01'
    });

    // Initialize webhook handler
    this.webhookHandler = new ShopifyWebhookHandler(
      config.webhookSecret,
      this.client,
      this.context
    );

    // Initialize wine product mapper
    this.wineMapper = new WineProductMapper();

    // Store encrypted credentials
    await this.storeSecret('accessToken', config.accessToken);
    await this.storeSecret('webhookSecret', config.webhookSecret);

    this.log('info', 'Shopify cartridge initialized', {
      shop: config.shop,
      apiVersion: config.apiVersion
    });
  }

  protected async onValidate(): Promise<void> {
    // Test Shopify API connection
    try {
      await this.client.getShop();
      this.log('info', 'Shopify API connection validated');
    } catch (error) {
      throw new Error(`Shopify API validation failed: ${error}`);
    }
  }

  protected async onHealthCheck(): Promise<void> {
    // Check Shopify API health
    await this.client.getShop();
    
    // Check rate limits
    const rateLimitOk = await this.checkRateLimit('api-calls', 1000, 3600);
    if (!rateLimitOk) {
      throw new Error('Shopify API rate limit exceeded');
    }
  }

  // Wine-specific helper methods
  private async storeWineMetadata(productId: string, wineDetails: any): Promise<void> {
    const cypher = `
      MERGE (p:WineProduct {shopifyId: $productId, tenantId: $tenantId})
      SET p.vintage = $vintage,
          p.varietal = $varietal,
          p.region = $region,
          p.country = $country,
          p.alcoholContent = $alcoholContent,
          p.tastingNotes = $tastingNotes,
          p.pairingNotes = $pairingNotes,
          p.updatedAt = datetime()
    `;

    await this.storeGraphData(cypher, {
      productId,
      vintage: wineDetails.vintage,
      varietal: wineDetails.varietal,
      region: wineDetails.region,
      country: wineDetails.country,
      alcoholContent: wineDetails.alcoholContent,
      tastingNotes: wineDetails.tastingNotes || [],
      pairingNotes: wineDetails.pairingNotes || []
    });
  }

  private async getWineMetadata(productId: string): Promise<any> {
    const cached = await this.cacheGet(`wine-metadata:${productId}`);
    if (cached) return cached;

    const cypher = `
      MATCH (p:WineProduct {shopifyId: $productId, tenantId: $tenantId})
      RETURN p
    `;

    const result = await this.storeGraphData(cypher, { productId });
    const metadata = result.records[0]?.get('p').properties;

    if (metadata) {
      await this.cacheSet(`wine-metadata:${productId}`, metadata, 1800); // 30 min cache
    }

    return metadata;
  }

  private async generateWineCustomerInsights(customerId: string): Promise<any> {
    // Complex analytics query combining Shopify and wine data
    const cypher = `
      MATCH (c:Customer {shopifyId: $customerId, tenantId: $tenantId})
      OPTIONAL MATCH (c)-[:PURCHASED]->(o:Order)-[:CONTAINS]->(li:LineItem)-[:FOR_PRODUCT]->(p:WineProduct)
      RETURN c, 
             collect(DISTINCT p.varietal) as varietals,
             collect(DISTINCT p.region) as regions,
             sum(li.totalPrice) as totalSpent,
             count(DISTINCT o) as orderCount,
             max(o.createdAt) as lastOrderDate
    `;

    const result = await this.storeGraphData(cypher, { customerId });
    
    // Transform to GraphQL response format
    return this.wineMapper.mapCustomerInsights(result.records[0]);
  }

  private async syncWithRestaurantPOS(restaurantId: string): Promise<any> {
    // This would integrate with VinoVoyage or other restaurant POS systems
    // Implementation depends on specific POS API
    
    this.log('info', 'Syncing inventory with restaurant POS', { restaurantId });
    
    // Placeholder implementation
    return {
      success: true,
      products: [],
      errors: []
    };
  }

  private async storeWineOrderDetails(orderId: string, details: any): Promise<void> {
    const cypher = `
      MERGE (o:WineOrder {shopifyOrderId: $orderId, tenantId: $tenantId})
      SET o.specialInstructions = $specialInstructions,
          o.deliveryDate = $deliveryDate,
          o.giftMessage = $giftMessage,
          o.cellarLocation = $cellarLocation,
          o.updatedAt = datetime()
    `;

    await this.storeGraphData(cypher, {
      orderId,
      ...details
    });
  }

  private async getWineOrderDetails(orderId: string): Promise<any> {
    const cypher = `
      MATCH (o:WineOrder {shopifyOrderId: $orderId, tenantId: $tenantId})
      RETURN o
    `;

    const result = await this.storeGraphData(cypher, { orderId });
    return result.records[0]?.get('o').properties;
  }

  private async getWineCustomerProfile(customerId: string): Promise<any> {
    const cypher = `
      MATCH (c:Customer {shopifyId: $customerId, tenantId: $tenantId})
      OPTIONAL MATCH (c)-[:HAS_PROFILE]->(wp:WineProfile)
      RETURN wp
    `;

    const result = await this.storeGraphData(cypher, { customerId });
    return result.records[0]?.get('wp')?.properties;
  }

  private async getWineLineItemDetails(lineItemId: string): Promise<any> {
    const cypher = `
      MATCH (li:LineItem {shopifyId: $lineItemId, tenantId: $tenantId})
      OPTIONAL MATCH (li)-[:HAS_WINE_DETAILS]->(wd:WineLineItemDetails)
      RETURN wd
    `;

    const result = await this.storeGraphData(cypher, { lineItemId });
    return result.records[0]?.get('wd')?.properties;
  }
}

export default ShopifyCartridge;