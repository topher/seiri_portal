# **MyceliumQL Testing Setup Strategy**

## **Testing Architecture: Layered Approach**

You need **both** system accounts and dummy restaurant accounts, but implemented in phases for optimal development flow.

---

## **Phase 1: Mock Data Foundation (Start Here)**

### **Internal Mock Accounts for Each System**

Create MyceliumQL-owned accounts in each target system:

```yaml
Toast POS Mock Account:
  Restaurant Name: "MyceliumQL Test Kitchen"
  Location: "123 Dev Street, Test City, CA 94102"
  Phone: "+1-555-TEST-POS"
  Email: "toast-test@myceliumql.com"
  Purpose: API testing, schema discovery, webhook testing

Shopify Mock Store:
  Store Name: "MyceliumQL Wine Cellar"
  Domain: "myceliumql-test.myshopify.com"
  Email: "shopify-test@myceliumql.com"
  Purpose: Product sync testing, order webhook testing

Stripe Mock Account:
  Business Name: "MyceliumQL Test Restaurant LLC"
  Email: "stripe-test@myceliumql.com"
  Mode: Test mode (no real money)
  Purpose: Payment processing testing, webhook validation
```

### **Benefits of Mock Accounts**
- ✅ **Full API access** for development
- ✅ **Webhook testing** without customer impact
- ✅ **Schema discovery** and field mapping
- ✅ **Error handling** development
- ✅ **Performance testing** with controlled data

---

## **Phase 2: Dummy Restaurant Accounts (Parallel Development)**

### **Create Realistic Restaurant Personas**

```yaml
Dummy Restaurant #1:
  Name: "Vine & Dine Bistro"
  Domain: "vine-dine-test.com"
  Email: "admin@vine-dine-test.com"
  Type: Fine dining with extensive wine list
  Systems: Toast POS + Shopify + Stripe
  
Dummy Restaurant #2:
  Name: "Cork & Fork Wine Bar"  
  Domain: "cork-fork-test.com"
  Email: "admin@cork-fork-test.com"
  Type: Wine bar with small plates
  Systems: Shopify + Stripe (no POS)

Dummy Restaurant #3:
  Name: "Harvest Table Restaurant"
  Domain: "harvest-table-test.com" 
  Email: "admin@harvest-table-test.com"
  Type: Farm-to-table with local wines
  Systems: Toast POS + Square + Shopify
```

### **Benefits of Dummy Restaurants**
- ✅ **Multi-tenant testing** (different restaurant configurations)
- ✅ **Data isolation** validation
- ✅ **Identity resolution** across different system combinations
- ✅ **Realistic federation** scenarios
- ✅ **Performance testing** with multiple data sources

---

## **Recommended Implementation Order**

### **Week 1: System Mock Accounts**
```bash
# Priority order for account creation
1. Shopify Developer Account (easiest to set up)
2. Stripe Test Account (free, instant)
3. Toast POS Sandbox (may require sales contact)
4. Square Sandbox (backup for Toast)
```

### **Week 2: Basic Integration Testing**
```typescript
// Test with MyceliumQL-owned accounts first
const mockIntegrationTests = {
  shopify: {
    account: 'myceliumql-test.myshopify.com',
    testProducts: generateMockWineProducts(50),
    testOrders: generateMockOrders(20)
  },
  
  stripe: {
    account: 'acct_test_myceliumql',
    testPayments: generateMockPayments(20),
    testCustomers: generateMockCustomers(30)
  },
  
  toast: {
    account: 'myceliumql-test-restaurant',
    testMenuItems: generateMockMenuItems(100),
    testOrders: generateMockToastOrders(25)
  }
};
```

### **Week 3: Dummy Restaurant Setup**
```typescript
// Create multi-tenant test scenarios
const dummyRestaurants = [
  {
    id: 'vine-dine-bistro',
    name: 'Vine & Dine Bistro',
    systems: ['toast', 'shopify', 'stripe'],
    wineCount: 200,
    avgOrderValue: 85
  },
  {
    id: 'cork-fork-wine-bar', 
    name: 'Cork & Fork Wine Bar',
    systems: ['shopify', 'stripe'],
    wineCount: 150,
    avgOrderValue: 45
  }
];
```

---

## **Detailed Account Setup Guide**

### **1. Shopify Developer Account Setup**

```yaml
Account Type: Partner Development Store
Store Name: "MyceliumQL Wine Cellar"
Industry: Food & Drink
Store Address: 123 Dev Street, Test City, CA

Required Apps to Install:
- GraphQL Admin API
- Storefront API
- Webhook API

Test Data to Create:
- 50-100 wine products
- Product variants (vintage, size)
- Collections (red, white, sparkling)
- Mock customers (20-30)
- Test orders (10-20)
```

### **2. Toast POS Sandbox Account**

```yaml
Account Request Process:
1. Contact Toast Developer Relations
2. Request sandbox access for integration
3. Provide business case (restaurant data federation)

Sandbox Features Needed:
- Menu management API
- Order management API  
- Customer API
- Webhook endpoints
- Payment processing (test mode)

Test Data Requirements:
- Mock menu with wine list
- Test orders with wine selections
- Customer profiles
- Payment transactions
```

### **3. Stripe Test Account**

```yaml
Account Setup:
- Create Stripe account in test mode
- Generate API keys (publishable & secret)
- Set up webhook endpoints

Test Scenarios:
- Payment processing
- Customer creation
- Subscription billing (for MyceliumQL SaaS)
- Refunds and disputes
- International payments

Mock Data:
- Test credit cards
- Customer payment methods
- Transaction history
```

---

## **Federation Testing Scenarios**

### **Single Restaurant Federation Test**

```graphql
# Test query across all systems for one restaurant
query TestRestaurantFederation($restaurantId: ID!) {
  restaurant(id: $restaurantId) {
    id
    name
    
    # From Shopify
    wineProducts {
      id
      name
      price
      inventory
    }
    
    # From Toast POS
    recentOrders {
      id
      timestamp
      items {
        name
        quantity
        price
      }
    }
    
    # From Stripe
    revenue {
      daily
      monthly
      yearToDate
    }
    
    # Federated calculation
    popularWines {
      wine {
        name
        timesOrdered
      }
    }
  }
}
```

### **Multi-Restaurant Federation Test**

```graphql
# Test cross-restaurant analytics
query TestMultiRestaurantFederation {
  restaurants {
    id
    name
    
    metrics {
      totalRevenue
      averageOrderValue
      topSellingWine
    }
  }
  
  # Aggregated insights
  platformMetrics {
    totalRestaurants
    totalRevenue
    mostPopularWines {
      name
      restaurantCount
      totalSales
    }
  }
}
```

---

## **Data Generation Strategy**

### **Realistic Mock Data Patterns**

```typescript
// Wine product data generation
const generateMockWineData = () => ({
  wines: [
    {
      name: "2020 Pinot Noir Reserve",
      producer: "Test Valley Winery", 
      region: "Sonoma County",
      vintage: 2020,
      varietal: "Pinot Noir",
      price: 85.00,
      inventory: 24,
      shopifyId: "wine_001",
      toastMenuId: "menu_wine_001"
    },
    // ... generate 100+ wines
  ],
  
  orders: [
    {
      id: "order_001",
      timestamp: "2024-01-15T19:30:00Z",
      customerId: "customer_001", 
      items: [
        { wineId: "wine_001", quantity: 2, price: 85.00 },
        { foodId: "food_001", quantity: 1, price: 32.00 }
      ],
      total: 202.00,
      paymentMethod: "stripe",
      source: "toast_pos"
    }
    // ... generate realistic order patterns
  ]
});
```

### **Customer Identity Testing**

```typescript
// Test identity resolution across systems
const testCustomers = [
  {
    // Same customer across different systems
    shopifyCustomer: {
      id: "shopify_customer_001",
      email: "john.doe@email.com",
      phone: "+1-555-0123"
    },
    toastCustomer: {
      id: "toast_guest_001", 
      email: "john.doe@email.com",
      phone: "555-0123"
    },
    stripeCustomer: {
      id: "cus_stripe_001",
      email: "john.doe@email.com"
    },
    
    // Expected resolved identity
    expectedMyceliumId: "diner_uuid5_generated_from_email_phone"
  }
];
```

---

## **Testing Environment Setup**

### **Docker Compose for Local Testing**

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  mycelium-gateway:
    build: ./gateway
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=test
      - SHOPIFY_TEST_STORE=myceliumql-test
      - STRIPE_TEST_KEY=sk_test_...
      - TOAST_SANDBOX_URL=...

  mock-data-generator:
    build: ./tools/mock-data
    environment:
      - GENERATE_WINES=100
      - GENERATE_ORDERS=50
      - GENERATE_CUSTOMERS=30
    
  test-runner:
    build: ./tests
    depends_on:
      - mycelium-gateway
    command: npm run test:federation
```

### **Test Data Seeding Script**

```bash
#!/bin/bash
# setup-test-data.sh

echo "🌱 Seeding test data for MyceliumQL..."

# Shopify test products
node scripts/seed-shopify-wines.js

# Toast POS menu items  
node scripts/seed-toast-menu.js

# Stripe test customers
node scripts/seed-stripe-customers.js

# Generate cross-system orders
node scripts/generate-test-orders.js

echo "✅ Test data seeding complete!"
```

---

## **Timeline & Budget Considerations**

### **Account Setup Costs**
```yaml
Shopify Partner Account: Free
Stripe Test Account: Free  
Toast POS Sandbox: Free (may require sales discussion)
Domain Registration: ~$50/year for test domains
Total Setup Cost: ~$50-100

Time Investment:
Week 1: System account setup (8-12 hours)
Week 2: Mock data generation (12-16 hours)  
Week 3: Federation testing (16-20 hours)
Total Time: ~40-50 hours
```

### **Ongoing Testing Costs**
```yaml
Monthly Costs:
- Test domains: ~$5/month
- Sandbox maintenance: $0
- Mock data storage: ~$10/month
- Testing tools: ~$20/month

Total Monthly: ~$35/month
```

---

## **Recommended Action Plan**

### **This Week (Week 1)**
1. **Create Shopify Partner account** (2 hours)
2. **Set up Stripe test account** (1 hour)  
3. **Contact Toast for sandbox access** (1 hour + waiting)
4. **Register test domains** (30 minutes)
5. **Plan mock data structure** (4 hours)

### **Next Week (Week 2)**  
1. **Generate realistic wine catalog** (6 hours)
2. **Create mock customer data** (4 hours)
3. **Build data seeding scripts** (6 hours)
4. **Test individual system integrations** (8 hours)

### **Week 3**
1. **Set up dummy restaurant accounts** (4 hours)
2. **Test federation queries** (8 hours)
3. **Validate identity resolution** (6 hours)
4. **Performance testing** (6 hours)

This approach gives you **controlled testing environments** first, then **realistic multi-tenant scenarios** - the perfect foundation for building production-ready federation.