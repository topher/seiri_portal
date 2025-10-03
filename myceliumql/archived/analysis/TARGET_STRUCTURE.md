# MyceliumQL Target Directory Structure

Based on the API Integration Blueprint with priority focus on Shopify, SMS (Twilio), and Email (SendGrid).

## Target Structure

```
myceliumql/
├── .env.example                          # Environment configuration template
├── package.json                          # Main package dependencies
├── README.md                             # Project documentation
│
├── infrastructure/                       # Infrastructure configuration
│   ├── supergraph-config.yaml           # Apollo Federation v2 configuration
│   ├── docker-compose.yml               # Local development stack
│   └── rover.sh                         # Schema composition script
│
├── services/                            # Core services
│   ├── webhook-router/                  # Central webhook ingestion
│   │   ├── src/
│   │   │   ├── index.ts                 # WebhookRouter service
│   │   │   ├── registry.ts              # Service for cartridge routing
│   │   │   └── middleware.ts            # Authentication & validation
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── registry/                        # Cartridge registry & management
│   │   ├── src/
│   │   │   ├── index.ts                 # CartridgeRegistry service
│   │   │   ├── clients.ts               # Infrastructure clients (Neo4j, Redis, etc.)
│   │   │   └── context.ts               # Multi-tenant context builder
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── gateway/                         # Apollo Gateway v2
│   │   ├── src/
│   │   │   ├── index.ts                 # Gateway configuration
│   │   │   ├── auth.ts                  # Authentication context
│   │   │   └── datasources.ts           # Authenticated data sources
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── neo4j-graphql/                   # Graph data layer
│       ├── src/
│       │   ├── index.ts                 # Neo4j GraphQL service
│       │   ├── schema.graphql           # Graph schema
│       │   └── resolvers.ts             # Custom resolvers
│       ├── package.json
│       └── Dockerfile
│
├── cartridges/                          # Priority API cartridges
│   ├── shopify/                         # Priority #1: E-commerce
│   │   ├── src/
│   │   │   ├── index.ts                 # ShopifyCartridge implementation
│   │   │   ├── schema.graphql           # Shopify federated schema
│   │   │   ├── resolvers.ts             # GraphQL resolvers
│   │   │   ├── client.ts                # Shopify GraphQL API client
│   │   │   └── webhooks.ts              # Webhook handlers
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── twilio/                          # Priority #2: SMS
│   │   ├── src/
│   │   │   ├── index.ts                 # TwilioCartridge implementation
│   │   │   ├── schema.graphql           # SMS federated schema
│   │   │   ├── resolvers.ts             # GraphQL resolvers
│   │   │   ├── client.ts                # Twilio SDK client
│   │   │   └── webhooks.ts              # SMS webhook handlers
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── sendgrid/                        # Priority #3: Email
│   │   ├── src/
│   │   │   ├── index.ts                 # SendGridCartridge implementation
│   │   │   ├── schema.graphql           # Email federated schema
│   │   │   ├── resolvers.ts             # GraphQL resolvers
│   │   │   ├── client.ts                # SendGrid SDK client
│   │   │   └── webhooks.ts              # Email webhook handlers
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── base/                            # Shared cartridge SDK
│       ├── src/
│       │   ├── BaseCartridge.ts         # Abstract base class
│       │   ├── types.ts                 # Shared interfaces
│       │   └── utils.ts                 # Common utilities
│       └── package.json
│
├── scripts/                             # Development & deployment scripts
│   ├── migrate.ts                       # Database migrations
│   ├── compose-schema.sh                # Schema composition
│   ├── dev-setup.sh                     # Development environment setup
│   └── docker-build.sh                  # Build all services
│
├── examples/                            # Usage examples
│   ├── usage.ts                         # Basic federation usage
│   ├── wine-app-integration.ts          # VinoVoyage specific examples
│   └── multi-tenant-setup.ts            # Multi-tenant configuration
│
├── tests/                               # Test suites
│   ├── integration/                     # Integration tests
│   ├── e2e/                            # End-to-end tests
│   └── unit/                           # Unit tests
│
├── docs/                               # Documentation
│   ├── 01-quickstart/                  # Getting started guides
│   ├── 02-architecture/                # System architecture
│   ├── 03-api-reference/               # API documentation
│   ├── 04-cartridge-development/       # Cartridge development guide
│   └── 05-deployment/                  # Production deployment
│
└── supergraph.graphql                  # Composed federated schema (generated)
```

## Key Changes from Current Structure

### New Additions Needed:
1. **infrastructure/** - Configuration files for deployment
2. **services/webhook-router/** - Centralized webhook handling
3. **services/registry/** - Cartridge management
4. **services/gateway/** - Apollo Gateway v2 setup
5. **cartridges/shopify/** - Shopify e-commerce integration
6. **cartridges/twilio/** - SMS communication
7. **cartridges/sendgrid/** - Email marketing
8. **scripts/** - Automation and deployment scripts

### Current Structure to Preserve:
1. **docs/** - Existing documentation (reorganize as needed)
2. **src/semantic-discovery/** - Core semantic capabilities
3. **src/compliance/** - Compliance and governance
4. **src/federation/** - Federation utilities
5. **myceliumql-ui/** - UI components (separate from backend services)

### Migration Strategy:
1. **Phase 1**: Create new directory structure
2. **Phase 2**: Implement priority cartridges (Shopify → Twilio → SendGrid)
3. **Phase 3**: Migrate existing src/ components into services/
4. **Phase 4**: Add infrastructure and deployment automation

This structure follows microservices patterns with clear separation of concerns while maintaining the existing MyceliumQL capabilities.