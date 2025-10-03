# Mycelium vs Hasura: Competitive Analysis

## Executive Summary

Mycelium and Hasura both provide GraphQL data access layers, but target different markets with fundamentally different approaches. Hasura is a metadata-driven universal data platform; Mycelium is a domain-specific integration gateway with semantic intelligence.

---

## Core Positioning Comparison

| Aspect | Mycelium | Hasura |
|--------|----------|--------|
| **Tagline** | "Semantic Federation for Domain-Specific Integrations" | "Universal Data Access Layer for Next-Gen Apps" |
| **Core Value** | Pre-built connectors with business logic | Auto-generated APIs from any database |
| **Primary Market** | Vertical SaaS (Restaurants, Healthcare) | Horizontal platform (Any industry) |
| **Technical Approach** | GraphQL Federation + Semantic Mapping | Metadata-driven API generation |
| **Setup Time** | Minutes (pre-built connectors) | Minutes (auto-generated from DB) |
| **Customization** | Domain-specific workflows | Generic CRUD + custom business logic |

---

## Business Model Comparison

### **Mycelium Business Model**

```yaml
Target Segments:
  Restaurants:
    - TAM: $2.3B (650K restaurants × avg $3,600/year)
    - Pricing: $99-999/month
    - Value Prop: "Never write another integration"
    
  Healthcare:
    - TAM: $8.5B (6,000 hospitals × $1.4M/year)
    - Pricing: $2.5K-50K/month
    - Value Prop: "HIPAA-compliant semantic federation"
    
Revenue Streams:
  - SaaS subscriptions (80%)
  - Implementation services (15%)
  - Custom connectors (5%)
  
Unit Economics:
  - CAC: $1,500 (restaurants) / $15,000 (healthcare)
  - LTV: $18,000 (restaurants) / $180,000 (healthcare)
  - Gross Margin: 85%
```

### **Hasura Business Model**

```yaml
Target Segments:
  Enterprises:
    - Fortune 500 companies
    - Digital transformation initiatives
    - API modernization projects
    
  Scale-ups:
    - High-growth tech companies
    - Real-time applications
    - AI/ML platforms
    
Revenue Streams:
  - Cloud subscriptions (60%)
    - Free tier: $0
    - Pro: $100/month
    - Enterprise: Custom pricing
  - Self-hosted licenses (30%)
  - Professional services (10%)
  
Unit Economics:
  - CAC: $5,000-50,000
  - LTV: $50,000-500,000
  - Gross Margin: 80%+
```

---

## Vertical Market Comparison

### **Restaurant/Hospitality Vertical**

| Capability | Mycelium | Hasura |
|------------|----------|---------|
| **TOAST POS Integration** | ✅ Pre-built connector | ❌ Manual implementation |
| **Stripe Payments** | ✅ Native with workflows | ⚠️ Generic DB connection |
| **SMS/Email Orchestration** | ✅ Built-in Twilio/SMTP | ❌ Requires custom code |
| **Guest Profile Unification** | ✅ Semantic matching | ❌ Manual joins |
| **Receipt Workflows** | ✅ One-click setup | ❌ Custom development |
| **Reservation Management** | ✅ OpenTable/Resy ready | ❌ Build from scratch |
| **Time to Value** | **1 hour** | **2-4 weeks** |

**Winner: Mycelium** - Purpose-built for restaurant operations

### **Healthcare Vertical**

| Capability | Mycelium | Hasura |
|------------|----------|---------|
| **Epic/Cerner Integration** | ✅ FHIR-native connectors | ⚠️ Database direct (if allowed) |
| **HIPAA Compliance** | ✅ Built-in audit trails | ⚠️ Requires configuration |
| **Semantic Field Mapping** | ✅ RDF/ML-powered | ❌ Manual mapping |
| **Cross-Organization Federation** | ✅ Patent-protected approach | ⚠️ Complex to implement |
| **Clinical Decision Support** | ✅ AI cartridge system | ❌ External integration |
| **HEDIS/Quality Measures** | ✅ Automated reporting | ❌ Custom queries |
| **Time to Value** | **3 weeks** | **3-6 months** |

**Winner: Mycelium** - Healthcare-specific compliance and semantics

### **Generic Enterprise**

| Capability | Mycelium | Hasura |
|------------|----------|---------|
| **Any Database Support** | ❌ Connector required | ✅ 20+ databases |
| **Real-time Subscriptions** | ✅ Via GraphQL | ✅ Native |
| **Row-Level Security** | ⚠️ Basic | ✅ Advanced |
| **Custom Business Logic** | ⚠️ Orchestrations only | ✅ Actions, Remote Schemas |
| **Performance at Scale** | ✅ Good (federated) | ✅ Excellent (compiled) |
| **Multi-Region Deployment** | ⚠️ Manual setup | ✅ Hasura Cloud |
| **Time to Value** | **N/A - Not targeted** | **Minutes to hours** |

**Winner: Hasura** - Universal database connectivity

---

## Technical Architecture Comparison

### **Mycelium Architecture**

```yaml
Approach: Federation-First
  
Stack:
  - Apollo GraphQL Federation
  - Node.js/TypeScript
  - Docker/Kubernetes
  - Redis (caching)
  - Vault (secrets)
  
Architecture:
  Gateway Layer:
    - GraphQL federation router
    - Authentication/authorization
    - Rate limiting
    
  Connector Layer:
    - Pre-built subgraphs (TOAST, Stripe, etc.)
    - Semantic mapping engine
    - Webhook handlers
    
  Intelligence Layer:
    - Orchestration workflows
    - Identity resolution
    - AI-powered insights
    
Deployment:
  - Docker containers
  - Cloud or self-hosted
  - Horizontal scaling
```

### **Hasura Architecture**

```yaml
Approach: Metadata-Driven
  
Stack:
  - Haskell (core engine)
  - PostgreSQL (metadata)
  - GraphQL compiler
  - WebSockets (subscriptions)
  
Architecture:
  Engine Layer:
    - Query parser/compiler
    - Execution engine
    - Authorization engine
    
  Metadata Layer:
    - Table tracking
    - Relationships
    - Permissions
    - Actions/Remote schemas
    
  Data Layer:
    - Direct DB connections
    - Connection pooling
    - Query optimization
    
Deployment:
  - Hasura Cloud (managed)
  - Docker (self-hosted)
  - Kubernetes (enterprise)
```

---

## Developer Experience Comparison

### **Mycelium DX**

```javascript
// Setup: 5 minutes
const mycelium = new MyceliumClient({
  apiKey: 'your-api-key',
  connectors: ['toast', 'stripe', 'twilio']
});

// Query: Business-focused
const result = await mycelium.query(`
  query TodaysRevenue {
    insights {
      revenue { today, mtd, ytd }
      topSellingItems(limit: 5) { name, quantity, revenue }
      guestSegments { vip, regular, new }
    }
  }
`);

// Orchestration: One line
await mycelium.orchestrate('dinner-service-complete', { orderId });
```

**Pros:**
- Zero configuration for domain operations
- Business-level abstractions
- Pre-built workflows

**Cons:**
- Limited to supported connectors
- Less flexibility for custom logic
- Vendor lock-in risk

### **Hasura DX**

```javascript
// Setup: Connect database
const hasura = new HasuraClient({
  url: 'https://your-app.hasura.app/v1/graphql',
  adminSecret: 'your-secret'
});

// Query: Database-focused
const result = await hasura.query(`
  query GetOrders {
    orders(where: {created_at: {_gte: "2024-01-01"}}) {
      id
      total
      customer { name, email }
      items { product_id, quantity, price }
    }
  }
`);

// Custom logic: Via Actions
await hasura.action('processPayment', { orderId, amount });
```

**Pros:**
- Works with any database schema
- Powerful query capabilities
- Real-time subscriptions out-of-box

**Cons:**
- Requires database access
- No domain-specific features
- Manual integration work needed

---

## Pricing & Cost Comparison

### **Mycelium Pricing**

| Tier | Monthly Price | Included | Target |
|------|--------------|----------|---------|
| **Starter** | $99 | 10K API calls, 1 location | Small restaurants |
| **Professional** | $299 | 100K API calls, 5 locations | Restaurant groups |
| **Enterprise** | $999+ | Unlimited, custom connectors | Chains, Healthcare |

**TCO Example (Restaurant Chain, 10 locations):**
- Mycelium: $299/month = **$3,588/year**
- Build in-house: $150K development + $50K/year maintenance
- **ROI: 97% cost reduction**

### **Hasura Pricing**

| Tier | Monthly Price | Included | Target |
|------|--------------|----------|---------|
| **Free** | $0 | 1M API calls, 1 project | Developers |
| **Pro** | $100 | 10M API calls, 3 projects | Startups |
| **Enterprise** | Custom | Unlimited, SLA, support | Large companies |

**TCO Example (Enterprise SaaS):**
- Hasura Enterprise: ~$5,000/month = **$60,000/year**
- Build in-house: $500K development + $200K/year maintenance
- **ROI: 91% cost reduction**

---

## Competitive Advantages

### **Mycelium Advantages**

1. **Domain Expertise**
   - Pre-built connectors for specific industries
   - Business workflows out-of-the-box
   - Compliance (HIPAA, PCI) built-in

2. **Semantic Intelligence**
   - Automatic field mapping
   - Identity resolution across systems
   - AI-powered insights

3. **Time to Value**
   - Minutes to production for supported use cases
   - No database schema design needed
   - Zero backend code required

### **Hasura Advantages**

1. **Universal Compatibility**
   - Works with any PostgreSQL, MySQL, SQL Server, etc.
   - GraphQL for existing databases
   - No migration required

2. **Performance at Scale**
   - Compiled queries for speed
   - Automatic query optimization
   - Proven at massive scale (NASA, etc.)

3. **Developer Flexibility**
   - Full control over schema
   - Custom business logic via Actions
   - Extensive authorization system

---

## Market Positioning Strategy

### **Mycelium: The Vertical Play**

```yaml
Positioning: "Stripe for [Industry] Data"
  
Message by Audience:
  Restaurant Owners:
    "Connect TOAST, Stripe, and everything else in 5 minutes"
    
  Healthcare CIOs:
    "HIPAA-compliant Epic/Cerner federation without moving data"
    
  Developers:
    "Stop writing integrations. Focus on your product."
    
Go-to-Market:
  - Industry conferences (NRA Show, HIMSS)
  - Vertical SaaS partnerships
  - Industry-specific content marketing
  
Competitive Moat:
  - Pre-built connector library
  - Industry compliance certifications
  - Domain-specific AI models
```

### **Hasura: The Platform Play**

```yaml
Positioning: "Instant GraphQL for Any Database"
  
Message by Audience:
  CTOs:
    "Modernize your API layer without touching the database"
    
  Developers:
    "Ship 10x faster with auto-generated APIs"
    
  Enterprises:
    "Unified data access with enterprise governance"
    
Go-to-Market:
  - Developer communities
  - Open-source adoption
  - Enterprise sales
  
Competitive Moat:
  - Metadata-driven architecture
  - Database compatibility
  - Enterprise features
```

---

## Coexistence & Integration Opportunities

### **Where They Complement**

```yaml
Hybrid Architecture:
  
  Hasura Layer:
    - Core application database
    - User management
    - Internal operations
    - Real-time features
    
  Mycelium Layer:
    - External integrations
    - Third-party connectors
    - Industry-specific workflows
    - Semantic federation
    
  Integration:
    - Hasura Remote Schema → Mycelium endpoints
    - Mycelium webhooks → Hasura Events
    - Shared authentication/authorization
```

### **Potential Partnership**

1. **Mycelium as Hasura Remote Schema Provider**
   - Hasura users add Mycelium for industry connectors
   - Revenue sharing on referrals

2. **Hasura as Mycelium's Database Layer**
   - Mycelium uses Hasura for internal data
   - Reduces Mycelium's database development

3. **Joint Go-to-Market**
   - Target enterprises needing both capabilities
   - "Hasura + Mycelium" reference architectures

---

## Strategic Recommendations

### **For Mycelium**

1. **Double Down on Vertical Depth**
   - Don't try to be Hasura (horizontal platform)
   - Build the deepest restaurant/healthcare integrations
   - Become the "must-have" for your verticals

2. **Partner, Don't Compete**
   - Position as complementary to Hasura
   - Focus on external integrations they don't want to build
   - Potentially build Hasura Remote Schemas

3. **Build Network Effects**
   - Each customer improves semantic mappings
   - Shared templates and workflows
   - Industry benchmarking data

### **For Customers Choosing**

| Choose Mycelium If: | Choose Hasura If: |
|-------------------|------------------|
| You're a restaurant or healthcare org | You need database flexibility |
| You need TOAST/Epic/Stripe TODAY | You have complex authorization needs |
| You want zero-code integrations | You want full control |
| Compliance is critical | Performance is critical |
| You need industry workflows | You need real-time subscriptions |

---

## 5-Year Outlook

### **Mycelium Trajectory**
- **Year 1**: 100 restaurants, $1M ARR
- **Year 2**: Add healthcare, $5M ARR
- **Year 3**: 1,000 customers, $15M ARR
- **Year 4**: New vertical (financial services), $30M ARR
- **Year 5**: Acquisition by Toast/Oracle/Microsoft for $200M+

### **Hasura Trajectory**
- **Current**: $30M+ ARR (estimated)
- **Year 1**: IPO or late-stage funding at $1B+
- **Year 3**: $100M+ ARR
- **Year 5**: Major cloud acquisition or independent public company

### **Market Evolution**
- Integration platforms become more specialized
- Vertical depth beats horizontal breadth for SMB/mid-market
- Semantic/AI capabilities become table stakes
- Federation and composability win over monoliths

---

## Conclusion

**Mycelium and Hasura are not direct competitors** - they solve different problems for different audiences:

- **Hasura** = Universal database API platform for developers
- **Mycelium** = Domain-specific integration gateway for businesses

The winning strategy for Mycelium is to:
1. **Own the vertical** (restaurants, then healthcare)
2. **Partner with horizontal platforms** like Hasura
3. **Build deep moats** through domain expertise and pre-built connectors

The market is large enough for both to succeed, with Hasura owning the platform layer and Mycelium owning the industry-specific integration layer.