# MyceliumQL Restaurant/Wine Platform

A federated GraphQL platform for restaurant and wine business APIs, focusing on Shopify e-commerce, Twilio SMS, and SendGrid email integrations.

## Priority API Integrations

1. **Shopify E-commerce** - Wine inventory, orders, customer management
2. **Twilio SMS** - Order notifications, customer alerts  
3. **SendGrid Email** - Wine recommendations, marketing campaigns

## Architecture

- **Apollo Federation v2** - Unified GraphQL API
- **Multi-tenant Cartridges** - API integration modules
- **Real-time Webhooks** - Event-driven updates
- **Neo4j Graph Storage** - Semantic data relationships
- **Redis Caching** - Performance optimization

## Quick Start

```bash
# Start development environment
npm run dev

# Compose federated schema
npm run compose:schema

# View GraphQL playground
open http://localhost:4000/graphql
```

## VinoVoyage Integration

This platform specifically supports VinoVoyage wine management app integration with unified commerce across restaurant dining and online wine sales.

## Status

✅ Infrastructure and base cartridge SDK  
✅ Shopify wine e-commerce cartridge  
🚧 Twilio SMS cartridge (in progress)  
🚧 SendGrid email cartridge (planned)  
🚧 VinoVoyage integration examples (planned)  

---

*Built for restaurant and wine industry federation*