# API Integration Blueprint: SendGrid, Twilio, Shopify & Apollo Federation

## Executive Summary

This blueprint provides a comprehensive integration pattern for the three priority API services:

1. **Shopify** - E-commerce platform integration with GraphQL API
2. **Twilio** - SMS and communication services  
3. **SendGrid** - Email delivery and marketing automation

Each service is prioritized for immediate implementation with focus on robust webhook handling, multi-tenant architecture, and Apollo Federation integration.

```json
{
  "name": "mycelium-api-integration",
  "version": "1.0.0",
  "dependencies": {
    "@apollo/gateway": "^2.8.0",
    "@apollo/subgraph": "^2.8.0",
    "@sendgrid/mail": "^8.1.6",
    "@sendgrid/eventwebhook": "^8.1.6",
    "twilio": "^5.10.1",
    "@shopify/shopify-api": "^12.0.0",
    "graphql": "^16.11.0",
    "graphql-tag": "^2.12.6"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## Supergraph Configuration

```yaml
# infrastructure/supergraph-config.yaml
federation_version: 2
subgraphs:
  sendgrid:
    routing_url: http://localhost:4001/graphql
    schema:
      file: ./cartridges/sendgrid/schema.graphql
  twilio:
    routing_url: http://localhost:4002/graphql
    schema:
      file: ./cartridges/twilio/schema.graphql
  shopify:
    routing_url: http://localhost:4003/graphql
    schema:
      file: ./cartridges/shopify/schema.graphql
  neo4j:
    routing_url: http://localhost:4004/graphql
    schema:
      file: ./services/neo4j-graphql/schema.graphql
```

## Webhook Router Service

```typescript
// services/webhook-router/src/index.ts
import express from 'express';
import bodyParser from 'body-parser';
import { CartridgeRegistry } from './registry';

export class WebhookRouter {
  private app: express.Application;
  private registry: CartridgeRegistry;

  constructor() {
    this.app = express();
    this.registry = new CartridgeRegistry();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    // Use raw body for SendGrid (ECDSA signature verification)
    this.app.use('/webhooks/sendgrid/*', bodyParser.raw({ type: 'application/json' }));
    
    // Use JSON body for Twilio and Shopify
    this.app.use('/webhooks/twilio/*', bodyParser.urlencoded({ extended: true }));
    this.app.use('/webhooks/shopify/*', bodyParser.raw({ type: 'application/json' }));
    
    // Default JSON for everything else
    this.app.use(bodyParser.json());
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', service: 'webhook-router' });
    });

    // SendGrid webhooks (ECDSA verification required)
    this.app.post('/webhooks/sendgrid/:tenantId', async (req, res) => {
      try {
        const tenantId = req.params.tenantId;
        const cartridge = await this.registry.getCartridge(tenantId, 'sendgrid');
        
        await cartridge.handleWebhook({
          rawBody: req.body,
          headers: req.headers
        });
        
        res.status(200).send('OK');
      } catch (error: any) {
        console.error('SendGrid webhook error:', error);
        res.status(error.message === 'Invalid webhook signature' ? 401 : 500).send(error.message);
      }
    });

    // Twilio webhooks (HMAC-SHA1 verification)
    this.app.post('/webhooks/twilio/:tenantId/:type', async (req, res) => {
      try {
        const tenantId = req.params.tenantId;
        const type = req.params.type; // 'sms', 'status', etc.
        
        const cartridge = await this.registry.getCartridge(tenantId, 'twilio');
        
        await cartridge.handleWebhook({
          body: req.body,
          headers: req.headers,
          path: req.path
        });
        
        // Twilio expects TwiML response for SMS webhooks
        if (type === 'sms') {
          res.type('text/xml');
          res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        } else {
          res.status(200).send('OK');
        }
      } catch (error: any) {
        console.error('Twilio webhook error:', error);
        res.status(error.message === 'Invalid webhook signature' ? 401 : 500).send(error.message);
      }
    });

    // Shopify webhooks (HMAC-SHA256 verification)
    this.app.post('/webhooks/shopify/:tenantId/:topic', async (req, res) => {
      try {
        const tenantId = req.params.tenantId;
        const topic = req.headers['x-shopify-topic'];
        
        const cartridge = await this.registry.getCartridge(tenantId, 'shopify');
        
        await cartridge.handleWebhook({
          rawBody: req.body,
          headers: req.headers
        });
        
        res.status(200).send('OK');
      } catch (error: any) {
        console.error('Shopify webhook error:', error);
        res.status(error.message === 'Invalid webhook signature' ? 401 : 500).send(error.message);
      }
    });
  }

  async start(port: number = 3000) {
    this.app.listen(port, () => {
      console.log(`🪝 Webhook Router listening on port ${port}`);
    });
  }
}

// Start the webhook router
const router = new WebhookRouter();
router.start(parseInt(process.env.WEBHOOK_PORT || '3000'));
```

## Cartridge Registry Service

```typescript
// services/registry/src/index.ts
import { BaseCartridge } from '@mycelium/cartridge-sdk';
import { SendGridCartridge } from '../../cartridges/sendgrid';
import { TwilioCartridge } from '../../cartridges/twilio';
import { ShopifyCartridge } from '../../cartridges/shopify';
import { Neo4jClient, VaultClient, KafkaProducer, RedisClient } from './clients';

export class CartridgeRegistry {
  private cartridges = new Map<string, typeof BaseCartridge>();
  private instances = new Map<string, BaseCartridge>();
  
  // Infrastructure clients
  private neo4j: Neo4jClient;
  private vault: VaultClient;
  private kafka: KafkaProducer;
  private redis: RedisClient;

  constructor() {
    this.initializeClients();
    this.registerBuiltInCartridges();
  }

  private async initializeClients() {
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
  }

  private registerBuiltInCartridges() {
    this.register('sendgrid', SendGridCartridge);
    this.register('twilio', TwilioCartridge);
    this.register('shopify', ShopifyCartridge);
  }

  register(id: string, cartridgeClass: typeof BaseCartridge) {
    this.cartridges.set(id, cartridgeClass);
  }

  async install(tenantId: string, cartridgeId: string, config: any) {
    const CartridgeClass = this.cartridges.get(cartridgeId);
    if (!CartridgeClass) {
      throw new Error(`Cartridge ${cartridgeId} not found`);
    }

    const context = await this.buildContext(tenantId);
    const cartridge = new CartridgeClass(context);
    
    // Initialize the cartridge
    await cartridge.initialize(config);
    
    // Validate it's working
    const isValid = await cartridge.validate();
    if (!isValid) {
      throw new Error(`Cartridge ${cartridgeId} validation failed`);
    }

    // Store instance
    const instanceKey = `${tenantId}:${cartridgeId}`;
    this.instances.set(instanceKey, cartridge);

    // Register with gateway
    await this.registerWithGateway(tenantId, cartridge);

    // Store installation record
    await this.neo4j.run(
      `
      MERGE (t:Tenant {id: $tenantId})
      MERGE (c:CartridgeInstallation {
        tenantId: $tenantId,
        cartridgeId: $cartridgeId
      })
      SET c.installedAt = datetime(),
          c.status = 'active',
          c.version = $version
      MERGE (t)-[:HAS_INSTALLED]->(c)
      `,
      {
        tenantId,
        cartridgeId,
        version: cartridge.config.version
      }
    );

    return { 
      success: true, 
      cartridgeId,
      version: cartridge.config.version
    };
  }

  async uninstall(tenantId: string, cartridgeId: string) {
    const instanceKey = `${tenantId}:${cartridgeId}`;
    const cartridge = this.instances.get(instanceKey);
    
    if (!cartridge) {
      throw new Error(`Cartridge ${cartridgeId} not installed for tenant ${tenantId}`);
    }

    // Teardown cartridge
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
      {
        tenantId,
        cartridgeId
      }
    );

    return { success: true };
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
        RETURN c
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
      
      // Note: You'd need to reload config from vault
      // This is simplified for example
      
      this.instances.set(instanceKey, cartridge);
    }
    
    return cartridge;
  }

  async listInstalled(tenantId: string) {
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

  async listAvailable() {
    const available = [];
    
    for (const [id, CartridgeClass] of this.cartridges) {
      const tempInstance = new CartridgeClass(await this.buildContext('temp'));
      available.push({
        id,
        name: tempInstance.config.name,
        version: tempInstance.config.version,
        capabilities: tempInstance.config.capabilities,
        configSchema: tempInstance.config.configSchema
      });
    }
    
    return available;
  }

  private async buildContext(tenantId: string) {
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
    // This would register the cartridge's schema with Apollo Gateway
    // In practice, you might:
    // 1. Deploy a new subgraph service for this cartridge instance
    // 2. Update the gateway's service list
    // 3. Trigger schema composition
    
    const schema = cartridge.buildFederatedSchema();
    
    // Store schema for the gateway to use
    await this.redis.set(
      `schema:${tenantId}:${cartridge.config.id}`,
      JSON.stringify({
        typeDefs: cartridge.getTypeDefs(),
        endpoint: `http://cartridges:4000/${tenantId}/${cartridge.config.id}`
      })
    );
  }
}
```

## **Environment Configuration**

```bash
# .env.example

# Node Environment
NODE_ENV=development

# API URLs
API_URL=http://localhost:4000
WEBHOOK_URL=http://localhost:3000

# JWT Secret
JWT_SECRET=your-secret-key-here

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=mycelium123

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_BROKER=localhost:9092

# PostgreSQL
DATABASE_URL=postgresql://mycelium:mycelium123@localhost:5432/mycelium

# Vault
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=mycelium-root-token

# SendGrid (for development/testing)
SENDGRID_API_KEY=SG.xxxxx

# Twilio (for development/testing)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx

# Shopify (for development/testing)
SHOPIFY_API_KEY=xxxxx
SHOPIFY_API_SECRET=xxxxx

# Multi-tenant mode
MULTI_TENANT=true
```

## **Deployment Scripts**

### **Rover Composition Script**

```bash
#!/bin/bash
# infrastructure/rover.sh

# Install Rover if not present
if ! command -v rover &> /dev/null; then
    curl -sSL https://rover.apollo.dev/nix/latest | sh
fi

# Compose the supergraph
rover supergraph compose \
  --config ./supergraph-config.yaml \
  --output ./supergraph.graphql

# Validate composition
if [ $? -eq 0 ]; then
    echo "✅ Supergraph composed successfully"
    
    # In production, you'd publish to Apollo Studio
    if [ "$NODE_ENV" = "production" ]; then
        rover subgraph publish mycelium-graph@current \
          --schema ./supergraph.graphql \
          --routing-url https://api.mycelium.io/graphql
    fi
else
    echo "❌ Supergraph composition failed"
    exit 1
fi
```

### **Database Migration Script**

```typescript
// scripts/migrate.ts
import neo4j from 'neo4j-driver';

async function migrate() {
  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USER || 'neo4j',
      process.env.NEO4J_PASSWORD || 'mycelium123'
    )
  );

  const session = driver.session();

  try {
    // Create constraints
    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (t:Tenant) REQUIRE t.id IS UNIQUE
    `);

    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (d:Diner) REQUIRE d.id IS UNIQUE
    `);

    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (p:ShopifyProduct) REQUIRE p.id IS UNIQUE
    `);

    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (c:ShopifyCustomer) REQUIRE c.id IS UNIQUE
    `);

    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (e:EmailEvent) REQUIRE e.messageId IS UNIQUE
    `);

    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (s:SMSMessage) REQUIRE s.sid IS UNIQUE
    `);

    // Create indexes
    await session.run(`
      CREATE INDEX IF NOT EXISTS FOR (d:Diner) ON (d.email)
    `);

    await session.run(`
      CREATE INDEX IF NOT EXISTS FOR (d:Diner) ON (d.phone)
    `);

    await session.run(`
      CREATE INDEX IF NOT EXISTS FOR (p:ShopifyProduct) ON (p.tenantId)
    `);

    console.log('✅ Neo4j migrations completed');
  } finally {
    await session.close();
    await driver.close();
  }
}

migrate().catch(console.error);
```

## **Example Usage**

```typescript
// examples/usage.ts

// 1. Install cartridges for a tenant
async function setupTenant(tenantId: string) {
  const registry = new CartridgeRegistry();

  // Install SendGrid
  await registry.install(tenantId, 'sendgrid', {
    apiKey: 'SG.xxxxx',
    fromEmail: 'hello@restaurant.com',
    fromName: 'Restaurant Name',
    webhookPublicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQg...'
  });

  // Install Twilio with subaccount
  await registry.install(tenantId, 'twilio', {
    accountSid: 'ACxxxxx',
    authToken: 'xxxxx',
    fromNumber: '+15551234567',
    useSubaccount: true
  });

  // Install Shopify
  await registry.install(tenantId, 'shopify', {
    shop: 'wine-store.myshopify.com',
    accessToken: 'shpat_xxxxx',
    webhookSecret: 'whsec_xxxxx'
  });
}

// 2. Query across cartridges using GraphQL
const FEDERATED_QUERY = `
  query GetDinerProfile($dinerId: ID!) {
    diner(id: $dinerId) {
      id
      email
      phone
      
      # From SendGrid cartridge
      emailPreferences {
        subscribed
        frequency
      }
      emailStats {
        totalSent
        openRate
      }
      
      # From Twilio cartridge
      phoneVerified
      smsPreferences {
        enabled
        quietHours {
          start
          end
        }
      }
      
      # From Shopify integration
      shopifyCustomer {
        totalSpent {
          amount
          currencyCode
        }
        ordersCount
      }
    }
  }
`;

// 3. Send communications
const SEND_EMAIL_MUTATION = `
  mutation SendWineRecommendation($input: SendEmailInput!) {
    sendEmail(input: $input) {
      success
      messageId
      error
    }
  }
`;

// 4. Create Shopify order with wine details
const CREATE_ORDER_MUTATION = `
  mutation CreateWineOrder($input: CreateOrderInput!, $wineDetails: WineDetailsInput!) {
    createShopifyOrder(input: $input) {
      success
      order {
        id
        name
        totalPrice {
          amount
          currencyCode
        }
      }
    }
    
    mapProductToWine(productId: $productId, wineDetails: $wineDetails) {
      id
      wineDetails {
        vintage
        varietal
        region
      }
    }
  }
`;
```

## **Summary**

This complete updated implementation includes:

1. **Apollo Federation v2** with proper `@link` directives and Gateway v2.x
2. **SendGrid ECDSA webhook validation** using the EventWebhook class
3. **Twilio subaccounts** for multi-tenant isolation
4. **Shopify GraphQL-first** approach with 2025-01 API
5. **DataLoader integration** for N+1 query prevention
6. **Proper webhook validation** for all three services
7. **Docker Compose** setup for local development
8. **Neo4j graph storage** with proper constraints and indexes
9. **Comprehensive GraphQL schemas** with Federation v2 directives
10. **Production-ready patterns** for secrets management and multi-tenancy

The architecture is now fully aligned with the latest API versions and best practices, ready for pilot deployment while maintaining flexibility for future growth.


The Mycelium federation layer can successfully integrate with SendGrid, Twilio, and Shopify using current APIs, but **Apollo Federation v1 has reached end-of-life and requires immediate architectural consideration**. This report verifies latest implementations, identifies critical deprecations, and provides integration patterns for a multi-tenant federation architecture.

## Critical architectural finding: Federation v1 deprecation

Apollo Gateway v0.x (Federation v1) was officially deprecated November 15, 2022 and **reached end-of-life September 22, 2023**. Apollo Router v1.60+ no longer supports Federation v1 supergraphs. However, **Apollo Gateway v2.x remains fully supported and is backward compatible with Federation v1 subgraphs**, providing a migration path. For the Mycelium architecture, upgrading to Gateway v2.x enables continued use of Federation patterns while maintaining compatibility with existing v1 schemas during gradual migration to Federation 2.

The good news: Your proposed architecture using Apollo Gateway for federation, Neo4j for graph storage, and RDF for schema mappings remains viable with Gateway v2.x. The gateway acts as the unified query layer, while Neo4j and RDF handle data modeling and semantic relationships independently.

## SendGrid: Email delivery and event tracking

### Current implementation status

SendGrid's Node.js SDK (@sendgrid/mail v8.1.6) provides production-ready email delivery with comprehensive event tracking. The **major v7 breaking change migrated from the deprecated `request` library to `axios`**, affecting HTTP client internals but maintaining API compatibility for standard operations. The SDK supports Node.js 6, 8, and 10+, with LTS versions recommended.

**Authentication uses exclusively API keys** (69-character Bearer tokens) with granular permissions. SendGrid requires two-factor authentication as of Q4 2020. API keys support three permission levels: Full Access (all endpoints except billing), Restricted Access (custom per-endpoint permissions), and Billing Access. For multi-tenant deployments, create separate API keys per tenant or use the subuser account pattern for complete isolation.

### Email sending patterns

The SDK provides four primary sending methods. **Single emails** use the straightforward `send()` method with message objects containing `to`, `from`, `subject`, `text`, and `html` fields. For **multiple individual emails** where recipients shouldn't see each other, use `sendMultiple()` or pass `true` as the second parameter to `send()`. **Dynamic templates** replace legacy substitution patterns—use `dynamicTemplateData` with Handlebars syntax rather than deprecated `substitutions`. **Personalized batch emails** leverage the `personalizations` array for per-recipient customization including subject lines and template variables.

Rate limits and best practices require managing throughput per API key. SendGrid supports up to 1,000 messages per API call when batching, with event batching occurring at approximately 30 seconds or 768KB intervals.

### Webhook event architecture

SendGrid delivers 12 webhook event types across three categories. **Delivery events** include `processed` (message queued), `delivered` (successfully delivered), `deferred` (temporarily rejected), `dropped` (permanently rejected), and `bounce` (receiving server rejection). **Engagement events** track `open` (requires Open Tracking), `click` (requires Click Tracking), `spamreport`, `unsubscribe`, `group_unsubscribe`, and `group_resubscribe`. **Account events** notify of `account_status_change` due to compliance issues.

All webhook payloads include standard fields: `email`, `timestamp`, `event`, `sg_event_id` (for deduplication), and `sg_message_id`. Event-specific fields provide context—bounces include `bounce_classification` (Invalid Address, Mailbox Unavailable, etc.), clicks include `url` and `url_offset`, and opens include `sg_machine_open` flag indicating Apple Mail Privacy Protection.

**Webhook validation requires ECDSA signature verification** using the @sendgrid/eventwebhook package. Critical implementation detail: You must use raw body parsing (Buffer or string) before verification—parsing JSON first breaks signature validation. SendGrid includes signatures in `X-Twilio-Email-Event-Webhook-Signature` and `X-Twilio-Email-Event-Webhook-Timestamp` headers. Express implementations should use `bodyParser.raw({type: 'application/json'})` exclusively for webhook endpoints.

### Multi-tenant patterns

SendGrid offers two primary multi-tenant approaches. **Subuser accounts** (recommended for large-scale) create separate child accounts under a parent, providing isolated suppression lists, independent API keys, separate webhook endpoints, per-tenant domain authentication, and individual statistics. Each customer gets complete isolation with manageable overhead through the Subuser Management API.

For simpler deployments, **multiple API keys with single account** works effectively at smaller scale. Create distinct API keys per tenant with appropriate scopes, but note this shares suppression lists and statistics across tenants. Implementation requires tenant-to-API-key mapping in your database with encrypted storage, using secrets management services like AWS Secrets Manager or HashiCorp Vault in production.

Best practice for Mycelium: Store tenant API keys encrypted, include `tenant_id` in custom arguments for webhook routing, implement per-tenant rate limiting, and use categories tagged with `tenant_${tenantId}` for analytics segmentation.

## Twilio: SMS and phone verification

### Current implementation status

Twilio's Node.js SDK (v5.10.1, published September 2024) represents a major TypeScript rewrite with **31% smaller bundle size** through reduced dependencies and lazy loading enabled by default. The SDK supports Node.js 14, 16, 18, 20, and 22 LTS with TypeScript 2.9+. Version 5.x adopted OpenAPI specifications for automatic serialization/deserialization and enhanced error typing.

**Authentication supports three methods**: Account SID + Auth Token (legacy, local testing only), API Keys (recommended for production with Standard or Main access levels), and Access Tokens (JWT-based, short-lived for client SDKs). Production deployments should exclusively use API Keys, creating separate keys per application/environment with regular rotation. API Keys consist of a SID (SKxxxxxxxx) and secret, requiring the account SID parameter: `require('twilio')(apiKey, apiSecret, {accountSid})`.

### SMS and messaging implementation

Twilio's Programmable Messaging API provides SMS, MMS, and WhatsApp messaging through a unified interface. **Basic SMS sending** uses `client.messages.create()` with `body`, `to` (E.164 format), and `from` (your Twilio number) parameters. Enhanced features include `statusCallback` for delivery tracking, `mediaUrl` arrays for MMS, `scheduleType: 'fixed'` with `sendAt` for scheduled messages, and `shortenUrls: true` when using Messaging Services.

Message objects include critical properties: `status` (queued, sending, sent, delivered, undelivered, failed), `numSegments` for billing calculations, `price` for cost tracking, and `errorCode`/`errorMessage` for failure debugging. The SDK supports fetching individual messages, listing with filters (`to`, `dateSent`, `limit`), updating messages (primarily for redaction), and streaming large result sets with lazy loading.

**Messaging Services** provide advanced functionality including sender pool management, intelligent sender selection, link shortening, and sticky sender optimization. Send via Messaging Service using `messagingServiceSid` instead of `from` parameter, enabling features like automatic failover and compliance management.

### Verify API for phone verification

Twilio Verify implements secure phone number verification across multiple channels: SMS, voice calls, email, WhatsApp, Passkeys, Silent Network Auth (SNA), TOTP, push notifications, and silent device approval. The **three-step verification process** begins with creating a Verification Service, initiating verification with `verifications.create({to, channel})`, and checking codes with `verificationChecks.create({to, code})`.

Verification responses include `status` ('pending', 'approved', 'canceled', 'max_attempts_reached', 'failed', 'expired') and `valid` boolean. **Advanced features** include configurable code lengths (4-10 digits), custom messages with `{code}` placeholders, locale-specific templates, rate limiting per service, and Silent Network Auth with automatic SMS fallback via `channel: 'auto'`.

Best practice for Mycelium: Create one Verify Service per tenant for isolated rate limits and configurations, implement phone number lookup before verification to validate carrier and type, and use SNA with SMS fallback for optimal user experience and conversion rates.

### Webhook configuration and validation

Twilio supports two webhook types: **incoming message webhooks** triggered when SMS/MMS received (configured per phone number or Messaging Service), and **status callback webhooks** tracking message delivery status changes (configured per message or service-wide).

**Incoming SMS webhooks** receive parameters including `MessageSid`, `From`, `To`, `Body`, `NumMedia`, with media items indexed as `MediaContentType0`, `MediaUrl0`, etc. **Status callbacks** provide `MessageStatus` (delivered, undelivered, failed), `ErrorCode`, and channel-specific metadata. WhatsApp adds `ChannelPrefix: 'whatsapp'` and `EventType` fields.

**Signature validation uses HMAC-SHA1** with the `X-Twilio-Signature` header. Implementation: `twilio.validateRequest(authToken, twilioSignature, url, params)` where `url` must be the full webhook URL and `params` the raw request body. Critical: Use Twilio SDK validation functions rather than custom implementations to avoid security vulnerabilities. For JSON payloads, use `validateRequestWithBody()` with stringified body.

Webhook requirements demand responding with `200 OK` within 5 seconds. Twilio retries failed webhooks 8 times over 4 hours before auto-deletion. Best practice: Queue webhook processing immediately, use persistent queues (Redis/RabbitMQ), enable HTTP Keep-Alive, and build reconciliation jobs for missed events.

### Multi-tenant architecture with subaccounts

Twilio Subaccounts provide ideal multi-tenant isolation—child accounts under a parent with separate phone numbers, independent configurations, isolated opt-out lists, and individual usage tracking. All billing flows to the main account with per-subaccount usage reports. Each subaccount receives its own credentials and can have dedicated API keys.

**Creating subaccounts** uses `client.api.accounts.create({friendlyName})`, returning separate SID and auth token. Default limit: 1,000 subaccounts per main account (contact support for increases). **Managing subaccounts** supports updating friendly names and status (active, suspended, closed), with closed subaccounts auto-deleted after 30 days.

**Three implementation patterns** support subaccount usage: dedicated clients per subaccount using subaccount credentials, main account access with subaccount SID path parameters (`client.api.v2010.account(subaccountSid).calls.list()`), or API keys created at subaccount level for enhanced security.

**Multi-tenancy traffic management** (Public Beta) enables algorithmic throughput distribution: No Multi-Tenancy (first-come-first-served), Even Multi-Tenancy (equal throughput per subaccount), or Weighted Multi-Tenancy (proportional allocation). Configuration requires contacting Twilio Support with Market Throughput onboarding.

For Mycelium federation: Map each tenant to a subaccount, store subaccount credentials encrypted per tenant, create separate API keys per subaccount for security isolation, use subaccount-specific webhook URLs with tenant identifiers, and implement per-subaccount rate limiting and cost tracking.

## Shopify: E-commerce integration and Admin API

### Current API versions and major shift

Shopify released **API version 2025-01 on January 1, 2025** as the latest stable version, following quarterly releases (2024-10, 2024-07, 2024-04). Each version receives minimum 12-month support with 9-month overlap periods, using date-based versioning (YYYY-MM).

**Critical announcement from October 2024**: GraphQL is now the primary API, with REST Admin API marked as legacy. **All new App Store submissions after April 1, 2025 must use GraphQL exclusively**. REST continues functioning but receives no new features. This shift reflects GraphQL's advantages: single endpoint, no over/under-fetching, doubled rate limits (2000 cost points/second vs 1000 for REST), 75% reduction in connection query costs, strong typing, and built-in introspection.

### GraphQL Admin API implementation

The **base endpoint** follows the pattern `POST https://{store}.myshopify.com/admin/api/2025-01/graphql.json` with authentication via `X-Shopify-Access-Token` header. GraphQL queries use pagination with `edges`, `node`, and `pageInfo` structures.

**Product queries** retrieve products with variants, pricing, inventory, and metadata. Example structure requests `products(first: $first, after: $after)` with nested `variants(first: 100)` to fetch SKU, price, inventory quantity, and barcode data. The cursor-based pagination uses `pageInfo { hasNextPage, endCursor }` for efficient traversal.

**Order queries** access order data including financial status, fulfillment status, line items, and customer information. Query filters support the `query: String` parameter using Shopify's search syntax for date ranges, status filtering, and field-specific searches.

### GraphQL mutations for orders and products

**Product creation** uses the `productCreate` mutation with `ProductInput` containing `title` (required), `descriptionHtml`, `vendor`, `productType`, `tags`, `status` (ACTIVE, DRAFT, ARCHIVED), and `productOptions` for variant configuration. Mutations return `product` data and `userErrors` array for validation feedback—always include `userErrors { field, message, code }` for proper error handling.

**Product updates** use `productUpdate` with the product's `id` (global ID format `gid://shopify/Product/{id}`) and updated fields. Shopify supports partial updates—only include changed fields.

**Order creation** through `orderCreate` requires `OrderCreateOrderInput` with `lineItems` (array of `{variantId, quantity}`), optional `customer` object with `toUpsert` for customer creation/matching, `financialStatus`, and shipping/billing addresses. Important limitation: Only one discount code per order.

**Order updates** for major changes (adding/removing line items) require the `orderEditBegin` mutation workflow rather than direct `orderUpdate`. Standard updates handle email, note, and tags modifications.

### Webhook topics and validation

Shopify provides extensive webhook coverage across domains. **Product webhooks**: `PRODUCTS_CREATE`, `PRODUCTS_UPDATE`, `PRODUCTS_DELETE`. **Order webhooks**: `ORDERS_CREATE`, `ORDERS_UPDATED`, `ORDERS_PAID`, `ORDERS_CANCELLED`, `ORDERS_FULFILLED`, `ORDERS_PARTIALLY_FULFILLED`. **Customer webhooks**: `CUSTOMERS_CREATE`, `CUSTOMERS_UPDATE`, `CUSTOMERS_DELETE`, `CUSTOMERS_ENABLE`, `CUSTOMERS_DISABLE`. **Inventory webhooks**: `INVENTORY_ITEMS_CREATE`, `INVENTORY_ITEMS_UPDATE`, `INVENTORY_LEVELS_UPDATE`. **Mandatory GDPR webhooks**: `CUSTOMERS_DATA_REQUEST`, `CUSTOMERS_REDACT`, `SHOP_REDACT`.

**Webhook configuration** uses the `shopify.app.toml` file for declarative setup, specifying `api_version`, topics array, and URI endpoints. This ensures consistent webhook registration across environments.

**Webhook payloads** include `admin_graphql_api_id` (global ID format) alongside legacy REST IDs for backward compatibility. Headers provide metadata: `X-Shopify-Topic` (event type), `X-Shopify-Hmac-SHA256` (signature), `X-Shopify-Shop-Domain`, `X-Shopify-API-Version`, and `X-Shopify-Webhook-Id` (unique delivery ID).

**HMAC validation requires raw body parsing** before signature verification. Manual validation: `crypto.createHmac('sha256', apiSecret).update(body, 'utf8').digest('base64')` compared with timing-safe equality. Using @shopify/shopify-api: `shopify.webhooks.validate({rawBody, rawRequest, rawResponse})`.

Critical webhook requirements: Respond with `200 OK` within 5 seconds (1-second connection timeout), retries occur 8 times over 4 hours on failure, and webhooks auto-delete after 8 consecutive failures. Best practice: Queue immediately using persistent storage, enable HTTP Keep-Alive, and build reconciliation jobs for missed events.

### Authentication patterns

Shopify supports three OAuth 2.0 flow types. **Token Exchange** (recommended for embedded apps) uses session tokens from App Bridge without page redirects, requiring Shopify CLI configuration and App Bridge integration. Client-side: `getSessionToken(app)` retrieves JWT tokens for API requests. Server-side: `authenticate.admin(request)` validates tokens and provides admin API clients.

**Authorization Code Grant** (legacy) implements traditional OAuth with redirects—navigate users to `/admin/oauth/authorize` with `client_id`, `scope`, `redirect_uri`, and `state` (nonce) parameters, then exchange authorization code for access token via POST to `/admin/oauth/access_token`.

**Access token types** include Online (24-hour lifetime, user-specific, for individual actions) and Offline (long-lived, no expiration, store-level permissions for background jobs and webhooks). For multi-tenant deployments, store offline access tokens per shop for webhook processing and scheduled tasks.

**Scope configuration** in `shopify.app.toml` uses comma-separated format: `scopes = "read_products,write_products,read_orders,write_orders,read_customers"`. Common scopes include inventory access (`read_inventory`, `write_inventory`), customer access, and `read_all_orders` for comprehensive order access regardless of sales channel.

### Node.js SDK: @shopify/shopify-api

The official **@shopify/shopify-api package (v12.0.0+)** provides comprehensive Shopify integration. Installation: `npm install @shopify/shopify-api`. Configuration requires runtime adapter imports matching deployment environment: `@shopify/shopify-api/adapters/node`, `@shopify/shopify-api/adapters/cf-worker`, or `@shopify/shopify-api/adapters/web-api`.

**Initialization** uses `shopifyApi()` with configuration object: `apiKey`, `apiSecretKey`, `scopes` array, `hostName`, `apiVersion` (use `LATEST_API_VERSION` constant), `isEmbeddedApp` boolean, and `sessionStorage` adapter. Available storage adapters include Memory (development only), Redis, PostgreSQL, MySQL, MongoDB, and Prisma ORM integration.

**Making API requests** uses GraphQL or REST clients. GraphQL client: `new shopify.clients.Graphql({session})` with `query({data: {query}})` method. REST client: `new shopify.clients.Rest({session})` with `get({path, query})`, `post({path, data})`, and other HTTP methods.

**Framework integrations** available: @shopify/shopify-app-remix (full Remix integration), @shopify/shopify-app-express (Express middleware), @shopify/admin-api-client (lightweight standalone), and @shopify/storefront-api-client (Storefront API).

### Breaking changes and deprecations

**Product API deprecation (2024-04)**: REST `/products` and `/variants` endpoints deprecated with migration deadline February 1, 2025. New GraphQL product model supports 2,048 variants (vs REST's 100-variant limit).

**Checkout API deprecation (2024-04)**: Storefront API Checkout mutations deprecated, sunset April 1, 2025. Migration path: Cart API or Checkout Kit (UI extensions).

**Recent 2025-01 changes**: `metafieldDelete` mutation renamed to `metafieldsDelete` (bulk operations), product handle uniqueness validation enforced strictly, multiple fulfillment holds per order supported, and metafield admin access field now optional.

Shopify communicates deprecations through Developer Changelog (primary source), API Health Report in Partner Dashboard, GraphQL Explorer inline warnings, API Reference documentation updates, emergency developer emails, and `X-Shopify-API-Deprecated-Reason` response header.

**Migration strategies**: Monitor API Health at `partners.shopify.com/{partner_id}/apps/{app_id}/api_health`, use version-aware requests specifying `apiVersion` parameter, test against Developer Preview for upcoming versions, and log deprecation headers for proactive maintenance.

### Multi-tenant considerations

Shopify apps inherently serve multiple stores (tenants). **Use shop domain as tenant identifier** consistently throughout your system. Database schema should include `shop_domain` as foreign key across all app-specific tables, with indexes for performance.

**Session storage per store**: Sessions keyed by `${shop}_${userId}` or shop domain alone for offline tokens. Store structure: `shop_domain | access_token | scope | installed_at | uninstalled_at`.

**Middleware pattern** validates shop parameter from query string or headers, loads shop context from database (shop domain, access token, scope), and attaches to request object for downstream handlers. Always filter database queries by shop domain to prevent cross-tenant data access.

**Handle app lifecycle events**: Installation creates/updates shop record with access token and scope, registers webhooks specific to that shop. Uninstallation (via `APP_UNINSTALLED` webhook) marks shop as uninstalled with timestamp, cleans up shop-specific data, and optionally nullifies access tokens.

**Data isolation critical**: Every database query must include `shop_domain` filter to prevent accidental cross-shop data leaks. Example: `db.orders.findOne({where: {id: orderId, shop_domain: shop}})` with explicit shop verification.

**API rate limiting per store**: Track GraphQL cost points per shop from response extensions (`response.extensions.cost.actualQueryCost`), implementing per-shop rate limit tracking with 2000 points/second ceiling.

**Background jobs per tenant**: Queue jobs with shop context (`{shop, jobData}`), load shop credentials in worker processes, create shop-specific API clients for each job execution.

**Recommended architecture**: Pattern 2 (Shared Database, Shared Schema) works best for most Shopify apps—single database with `shop_domain` column isolation. This provides cost-effective scaling, easier management, and good performance versus separate schemas (Pattern 1) or separate databases per tenant (Pattern 3).

## Apollo Federation patterns for Mycelium architecture

### Critical update: Federation v1 deprecation status

**Apollo Gateway v0.x (Federation v1) reached end-of-life September 22, 2023** after deprecation announcement November 15, 2022. Apollo Router v1.60+ does not support Federation v1.x supergraphs. However, **Apollo Gateway v2.x remains fully supported and is backward compatible with Federation v1 subgraphs**, providing essential migration flexibility.

For Mycelium's architecture using Apollo Gateway, Neo4j graph storage, and RDF schema mappings: **Upgrade to @apollo/gateway v2.x immediately**. This maintains federation capabilities while supporting gradual subgraph migration to Federation 2 syntax. Gateway v2.x works transparently with v1 subgraphs, enabling incremental modernization without breaking changes.

### Gateway v2.x setup (backward compatible)

**Primary package**: `@apollo/gateway` (use version 2.x, not deprecated 0.x). Installation: `npm install @apollo/gateway apollo-server graphql`. Related packages include `@apollo/subgraph` (replaces deprecated `@apollo/federation`), `@apollo/server` (current Apollo Server v4/v5), and `graphql` v16.11.0+.

**Basic initialization** uses static supergraph schema approach (recommended for production):

```javascript
const { ApolloServer } = require('apollo-server');
const { ApolloGateway } = require('@apollo/gateway');
const { readFileSync } = require('fs');

const supergraphSdl = readFileSync('./supergraph.graphql').toString();

const gateway = new ApolloGateway({
  supergraphSdl,
});

const server = new ApolloServer({
  gateway,
});
```

**Configuration options** include `supergraphSdl` (string, function, or SupergraphManager—preferred over deprecated `serviceList`), `introspectionHeaders` (for subgraph introspection), `buildService` (customize subgraph data sources for authentication/headers), `debug` (development logging), and `logger` (custom logger implementation).

### IntrospectAndCompose pattern (development only)

For development environments, `IntrospectAndCompose` provides dynamic schema fetching:

```javascript
const { ApolloGateway, IntrospectAndCompose } = require('@apollo/gateway');

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'sendgrid', url: 'http://localhost:4001' },
      { name: 'twilio', url: 'http://localhost:4002' },
      { name: 'shopify', url: 'http://localhost:4003' },
    ],
    introspectionHeaders: {
      Authorization: 'Bearer development-token'
    },
    pollIntervalInMs: 10000,
    subgraphHealthCheck: true,
  }),
});
```

**Critical limitation**: IntrospectAndCompose NOT recommended for production. Composition can fail at startup causing downtime, gateway instances may differ during rolling deployments (composition timing), fetches schemas dynamically adding network dependency, and creates startup latency.

### Managed Federation for production

**Managed Federation** (Apollo Studio integration) provides production-grade schema management:

```javascript
const gateway = new ApolloGateway({
  // No supergraphSdl or serviceList - fetches from Apollo Studio
});

// Configure via environment variables
process.env.APOLLO_KEY = 'service:your-graph-id:your-api-key';
process.env.APOLLO_GRAPH_REF = 'your-graph-id@current';
```

Benefits: Zero-downtime schema updates, centralized schema registry, schema validation and composition checks, automatic gateway updates via Apollo Uplink, and rollback capabilities for failed deployments.

### Federated schema structure for connector subgraphs

**Entity design** for service connectors. SendGrid subgraph defines email entities:

```graphql
type Email @key(fields: "id") {
  id: ID!
  messageId: String!
  to: String!
  from: String!
  subject: String
  status: EmailStatus!
  events: [EmailEvent!]!
}

enum EmailStatus {
  QUEUED
  DELIVERED
  BOUNCED
  FAILED
}

type EmailEvent {
  type: String!
  timestamp: Int!
  reason: String
}

type Query {
  email(id: ID!): Email
  emailsByRecipient(to: String!): [Email!]!
}
```

Twilio subgraph extends with SMS entities:

```graphql
type SMSMessage @key(fields: "sid") {
  sid: ID!
  to: String!
  from: String!
  body: String!
  status: SMSStatus!
  direction: MessageDirection!
  dateCreated: String!
  price: String
  errorCode: Int
}

enum SMSStatus {
  QUEUED
  SENDING
  SENT
  DELIVERED
  UNDELIVERED
  FAILED
}

type Query {
  smsMessage(sid: ID!): SMSMessage
  smsMessagesByRecipient(to: String!): [SMSMessage!]!
}
```

Shopify subgraph provides e-commerce entities:

```graphql
type Product @key(fields: "id") {
  id: ID!
  title: String!
  handle: String!
  status: ProductStatus!
  variants: [ProductVariant!]!
}

type Order @key(fields: "id") {
  id: ID!
  orderNumber: Int!
  customer: Customer
  lineItems: [LineItem!]!
  totalPrice: Money!
  financialStatus: String
  fulfillmentStatus: String
}

type Query {
  product(id: ID!): Product
  order(id: ID!): Order
}
```

### Key directive patterns

**Single primary key** designates entity identity: `@key(fields: "id")` or `@key(fields: "upc")`. **Multiple primary keys** (repeatable @key) support different identifier systems: `@key(fields: "upc") @key(fields: "sku")` enables different subgraphs to reference same entity using their preferred identifiers.

**Compound primary keys** handle multi-field identifiers: `@key(fields: "userId organizationId")`. Important: When key field has subfields, must include at least one subfield in key: `@key(fields: "organization { id }")`.

**Key field requirements**: Must uniquely identify entity instances, must be resolvable in originating subgraph, cannot include fields returning unions or interfaces, support deeply nested fields (`contact { email }`).

### Entity references and __resolveReference

**Reference resolvers** fetch full entity data from minimal representations. Implementation pattern with DataLoader for N+1 prevention:

```javascript
import DataLoader from 'dataloader';

const createLoaders = () => ({
  productLoader: new DataLoader(async (ids) => {
    const products = await fetchProductsByIds(ids);
    return ids.map(id => products.find(p => p.id === id));
  }),
});

const resolvers = {
  Product: {
    __resolveReference(product, { loaders }) {
      // product = { __typename: "Product", id: "123" }
      return loaders.productLoader.load(product.id);
    },
  },
};
```

**Entity representations** are minimal objects: `{__typename: "Product", id: "123"}` containing only `__typename` and all `@key` fields. The `_entities` query enables gateway to fetch entities: `_entities(representations: [_Any!]!): [_Entity]!`.

### External API integration patterns

**Pattern 1: REST API wrapper subgraph** for SendGrid:

```javascript
const { RESTDataSource } = require('apollo-datasource-rest');

class SendGridAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = 'https://api.sendgrid.com/v3/';
  }

  willSendRequest(request) {
    request.headers.set('Authorization', `Bearer ${this.context.sendgridApiKey}`);
  }

  async getEmailActivity(messageId) {
    return this.get(`messages/${messageId}`);
  }
}

const resolvers = {
  Email: {
    __resolveReference(email, { dataSources }) {
      return dataSources.sendgridAPI.getEmailActivity(email.id);
    },
  },
};
```

**Pattern 2: Database-backed connector** with caching:

```javascript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const resolvers = {
  Order: {
    async __resolveReference(order) {
      // Check cache first
      let cached = await redis.get(`order:${order.id}`);
      if (cached) return JSON.parse(cached);

      // Fetch from Shopify if not cached
      const orderData = await shopifyClient.order(order.id).get();
      
      // Cache for 5 minutes
      await redis.setex(`order:${order.id}`, 300, JSON.stringify(orderData));
      
      return orderData;
    },
  },
};
```

**Pattern 3: Event-driven connector** for real-time updates:

```javascript
// Webhook handler updates local cache
app.post('/webhooks/shopify/orders', async (req, res) => {
  if (!validateShopifyWebhook(req)) {
    return res.status(401).send();
  }

  const order = req.body;
  
  // Update local graph storage (Neo4j)
  await neo4jSession.run(
    `MERGE (o:Order {id: $id})
     SET o.status = $status, o.updatedAt = timestamp()`,
    { id: order.id, status: order.financial_status }
  );

  // Publish to event bus for federation awareness
  await pubsub.publish('ORDER_UPDATED', { order });
  
  res.status(200).send();
});
```

### Authentication and authorization patterns

**Gateway-level authentication** validates tokens and creates context:

```javascript
const server = new ApolloServer({
  gateway,
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await verifyJWT(token);
    
    if (!user) {
      throw new GraphQLError('Unauthenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    
    // Retrieve tenant-specific API keys
    const tenantKeys = await getTenantKeys(user.tenantId);
    
    return {
      userId: user.id,
      tenantId: user.tenantId,
      sendgridApiKey: tenantKeys.sendgrid,
      twilioAccountSid: tenantKeys.twilioSid,
      twilioAuthToken: tenantKeys.twilioToken,
      shopifyAccessToken: tenantKeys.shopifyToken,
    };
  },
});
```

**Header forwarding to subgraphs**:

```javascript
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    // Forward tenant context
    request.http.headers.set('x-tenant-id', context.tenantId);
    request.http.headers.set('x-user-id', context.userId);
    
    // Forward service-specific credentials
    if (context.sendgridApiKey) {
      request.http.headers.set('x-sendgrid-key', context.sendgridApiKey);
    }
  }
}

const gateway = new ApolloGateway({
  supergraphSdl,
  buildService({ url }) {
    return new AuthenticatedDataSource({ url });
  },
});
```

**Subgraph-level authorization**:

```javascript
const resolvers = {
  Query: {
    async orders(parent, args, context) {
      // Verify tenant access
      if (!context.tenantId) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHORIZED' },
        });
      }
      
      // Fetch only tenant's orders
      return await db.orders.findAll({
        where: { tenantId: context.tenantId }
      });
    },
  },
};
```

### Subgraph composition with Rover CLI

**Production composition workflow** uses Rover CLI (recommended over runtime composition):

```bash
# Install Rover
curl -sSL https://rover.apollo.dev/nix/latest | sh

# Compose supergraph
rover supergraph compose --config ./supergraph-config.yaml > supergraph.graphql
```

**supergraph-config.yaml** for Mycelium connectors:

```yaml
subgraphs:
  sendgrid:
    routing_url: https://sendgrid-connector.mycelium.internal/graphql
    schema:
      file: ./subgraphs/sendgrid/schema.graphql
  twilio:
    routing_url: https://twilio-connector.mycelium.internal/graphql
    schema:
      file: ./subgraphs/twilio/schema.graphql
  shopify:
    routing_url: https://shopify-connector.mycelium.internal/graphql
    schema:
      file: ./subgraphs/shopify/schema.graphql
  neo4j:
    routing_url: https://neo4j-graphql.mycelium.internal/graphql
    schema:
      file: ./subgraphs/neo4j/schema.graphql
```

**CI/CD integration** validates schemas before deployment:

```bash
# Validate schema changes
rover subgraph check your-graph@current --schema ./schema.graphql --name sendgrid

# Publish schema to Studio
rover subgraph publish your-graph@current --schema ./schema.graphql --name sendgrid --routing-url https://sendgrid-connector.mycelium.internal/graphql
```

### Neo4j and RDF integration patterns

**Neo4j subgraph** exposes graph data via GraphQL using neo4j-graphql-js or custom resolvers:

```graphql
type Entity @key(fields: "uri") {
  uri: ID!
  type: String!
  properties: [Property!]!
  relationships: [Relationship!]!
}

type Property {
  key: String!
  value: String!
}

type Relationship {
  type: String!
  target: Entity!
}

type Query {
  entity(uri: ID!): Entity
  entitiesByType(type: String!): [Entity!]!
}
```

**RDF schema mapping layer** translates between external API schemas and internal graph model. Implementation uses JSON-LD context or custom transformation:

```javascript
const resolvers = {
  Query: {
    async entity(parent, { uri }, context) {
      // Fetch from Neo4j
      const result = await neo4jSession.run(
        'MATCH (e:Entity {uri: $uri}) RETURN e',
        { uri }
      );
      
      const entity = result.records[0].get('e');
      
      // Apply RDF mappings
      return applyRDFContext(entity, context.rdfMappings);
    },
  },
  
  Entity: {
    async relationships(parent, args, context) {
      // Query Neo4j relationships
      const result = await neo4jSession.run(
        'MATCH (e:Entity {uri: $uri})-[r]->(target) RETURN r, target',
        { uri: parent.uri }
      );
      
      return result.records.map(record => ({
        type: record.get('r').type,
        target: record.get('target'),
      }));
    },
  },
};
```

**Cross-service entity linking** via shared identifiers:

```graphql
# Shopify subgraph extends Neo4j entity
extend type Entity @key(fields: "uri") {
  uri: ID! @external
  shopifyProduct: Product
}

# Resolver links via URI mapping
const resolvers = {
  Entity: {
    async shopifyProduct(entity, args, context) {
      // Extract Shopify product ID from entity URI
      const productId = extractShopifyId(entity.uri);
      
      if (!productId) return null;
      
      // Fetch product
      return await shopifyClient.product(productId).get();
    },
  },
};
```

### Performance optimization

**DataLoader batching** prevents N+1 queries across all subgraphs. **Response caching** at gateway level using APQ (Automatic Persisted Queries) reduces network overhead. **Entity caching** with Redis stores frequently accessed entities with TTL. **Query plan analysis** identifies expensive federation hops for optimization.

**Rate limiting per tenant** critical for multi-tenant federation:

```javascript
const rateLimiters = new Map();

class RateLimitedDataSource extends RemoteGraphQLDataSource {
  async willSendRequest({ request, context }) {
    const tenantId = context.tenantId;
    const limiter = rateLimiters.get(tenantId) || createRateLimiter(tenantId);
    
    await limiter.removeTokens(1);
    
    // Forward tenant context
    request.http.headers.set('x-tenant-id', tenantId);
  }
}
```

### Federation compatibility considerations

**Supported GraphQL servers** include Apollo Server (reference), Mercurius (Fastify), GraphQL Yoga, gqlgen (Go), DGS (Java/Netflix), Hot Chocolate (.NET), Ariadne/Strawberry (Python), graphql-ruby, async-graphql (Rust), and many others.

**Requirements for compatibility**: Implement federation schema spec (_Entity, _Any, _Service), support `_entities` and `_service` queries, implement reference resolvers (__resolveReference), return SDL with federation directives.

**Limitations**: Federation v1 does NOT support GraphQL subscriptions (implement separately per subgraph), file uploads not automatically federated (implement in specific subgraph), custom scalars must be defined in all subgraphs using them, interfaces and unions cannot be entities.

## Mycelium architecture recommendations

### Immediate action items

**1. Upgrade Apollo Gateway to v2.x** immediately—this is non-negotiable given v1 EOL. Gateway 2.x maintains full backward compatibility with v1 subgraphs while enabling gradual Federation 2 migration.

**2. Use static supergraph composition** via Rover CLI in production. Avoid IntrospectAndCompose except in development. Generate supergraph during CI/CD, store as deployment artifact, configure gateway with static schema.

**3. Implement Managed Federation** via Apollo Studio for production deployments. Benefits include zero-downtime updates, centralized registry, validation, and rollback capabilities.

### Connector subgraph architecture

**Organize by service domain** rather than by data type. Create four connector subgraphs: sendgrid-connector (email entities, events, templates), twilio-connector (SMS messages, phone verification, call logs), shopify-connector (products, orders, customers, inventory), neo4j-graphql (semantic graph layer, entity relationships, RDF mappings).

**Each connector manages**:
- Authentication per tenant (API keys, tokens stored encrypted)
- Rate limiting specific to external service
- Caching strategy for responses
- Webhook receipt and processing
- Entity resolution via __resolveReference
- Error handling and retries

**Data flow pattern**: External webhooks → Connector webhook endpoint → Validate signature → Update Neo4j graph → Publish federation event → GraphQL query returns fresh data.

### Multi-tenant implementation

**Gateway context** loads tenant configuration:

```javascript
context: async ({ req }) => {
  const tenantId = await extractTenantId(req);
  const config = await loadTenantConfig(tenantId);
  
  return {
    tenantId,
    sendgridKey: config.sendgrid.apiKey,
    twilioSid: config.twilio.accountSid,
    twilioToken: config.twilio.authToken,
    shopifyToken: config.shopify.accessToken,
    shopifyDomain: config.shopify.shopDomain,
  };
}
```

**Subgraphs receive tenant context** via headers, filter all queries by tenant, use tenant-specific API credentials, and implement per-tenant rate limiting.

**Neo4j tenant isolation** uses labels or property-based filtering:

```cypher
// Tenant-specific queries
MATCH (e:Entity {tenantId: $tenantId})
WHERE e.type = 'Product'
RETURN e

// Or dedicated tenant subgraphs
MATCH (e:Tenant {id: $tenantId})-[:OWNS]->(entity)
RETURN entity
```

### Schema versioning strategy

**API version management** per service: Store API version in tenant configuration, pass version to subgraph connectors, handle multiple API versions simultaneously during migration, deprecate old versions with notification period.

**GraphQL schema evolution**: Use @deprecated directive for field deprecation, maintain backward compatibility for 6-12 months, version federation schema independently of underlying APIs, communicate breaking changes via changelog.

### Webhook architecture

**Centralized webhook ingestion**: Route all service webhooks through connector subgraphs (sendgrid-connector receives SendGrid events, twilio-connector receives Twilio events, shopify-connector receives Shopify events). Each connector validates signatures, queues events, updates Neo4j graph, and publishes to event bus.

**Event processing pipeline**: Webhook receipt (immediate 200 OK response) → Signature validation (reject invalid) → Queue persistence (Redis/RabbitMQ) → Async processing (worker pool) → Neo4j update (graph relationships) → Cache invalidation (Redis) → Federation publish (notify gateway).

**Webhook validation** per service using official libraries: SendGrid uses @sendgrid/eventwebhook with ECDSA, Twilio uses twilio.validateRequest with HMAC-SHA1, Shopify uses crypto HMAC-SHA256. Always use raw body parsing before validation.

### RDF and semantic layer

**RDF context mappings** translate between external schemas and internal ontology. Store mappings in Neo4j as configuration, apply during entity resolution, enable cross-service entity linking via URIs.

**Example mapping**:

```json
{
  "@context": {
    "Product": "schema:Product",
    "Order": "schema:Order",
    "Customer": "schema:Person",
    "email": "schema:email",
    "telephone": "schema:telephone"
  }
}
```

**URI strategy**: Use consistent URI patterns across federation: `mycelium://products/{shopify_id}`, `mycelium://emails/{sendgrid_message_id}`, `mycelium://sms/{twilio_sid}`. Map external IDs to URIs in Neo4j, use URIs as primary keys in federation layer.

### Monitoring and observability

**Track federation metrics**: Query plan execution time, subgraph response times, error rates per subgraph, cache hit ratios, rate limit consumption per tenant, external API latency.

**Apollo Studio integration** provides: Query performance insights, error tracking and alerting, schema usage analytics, composition validation history.

**Custom instrumentation**: Log all external API calls with tenant context, track webhook delivery failures, monitor Neo4j query performance, alert on rate limit approaches.

### Security considerations

**API credential storage**: Encrypt all API keys at rest (database encryption), use secrets management services (AWS Secrets Manager, Vault), rotate credentials regularly (90-day policy), audit credential access.

**Authentication flow**: Validate JWT at gateway, extract tenant ID from claims, load tenant credentials from secure storage, forward minimal context to subgraphs, implement field-level authorization in resolvers.

**Webhook security**: Always validate signatures before processing, use HTTPS endpoints exclusively, implement replay attack prevention (check webhook IDs), rate limit webhook endpoints, log suspicious activity.

## Implementation roadmap

### Phase 1: Foundation (Weeks 1-2)

Upgrade Apollo Gateway to v2.x, set up Rover CLI composition pipeline, implement basic connector subgraphs (SendGrid, Twilio, Shopify), configure static supergraph schema, establish Neo4j connection and basic schema.

### Phase 2: Authentication \u0026 Multi-tenancy (Weeks 3-4)

Implement gateway authentication layer, build tenant configuration management, set up encrypted credential storage, configure per-tenant API key routing, implement tenant isolation in Neo4j.

### Phase 3: Webhook Integration (Weeks 5-6)

Deploy webhook endpoints per connector, implement signature validation, set up event queue (Redis/RabbitMQ), build async webhook processors, update Neo4j on events, configure federation event publishing.

### Phase 4: RDF \u0026 Semantic Layer (Weeks 7-8)

Define RDF context mappings, implement URI strategy and entity linking, build cross-service relationship queries, configure semantic search capabilities.

### Phase 5: Optimization \u0026 Production (Weeks 9-10)

Implement DataLoader batching, configure response caching, set up monitoring and alerting, migrate to Managed Federation (Apollo Studio), load testing and performance tuning, documentation and runbook creation.

## Conclusion

The Mycelium federation architecture remains viable with immediate Gateway v2.x upgrade. SendGrid (v8.1.6), Twilio (v5.10.1), and Shopify (2025-01 API) provide production-ready integrations with comprehensive webhook systems and robust authentication. The connector pattern using Apollo Federation v2, Neo4j graph storage, and RDF mappings creates a flexible, scalable integration layer supporting multi-tenant deployments. Critical success factors include proper webhook validation, encrypted credential management, per-tenant rate limiting, and static supergraph composition for production reliability.