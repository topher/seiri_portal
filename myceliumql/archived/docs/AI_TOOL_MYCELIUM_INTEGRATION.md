# **VinoVoyage + MyceliumQL Integration Strategy**

## **Executive Summary**

The ai-tool-nextjs-main (VinoVoyage) is **perfectly positioned** for MyceliumQL integration. It's a sophisticated restaurant wine management system with exactly the data federation needs that MyceliumQL addresses. Here's where and how to integrate MyceliumQL federation into your existing VinoVoyage system.

---

## **1. Current VinoVoyage Architecture Analysis**

### **Existing Data Sources**
```typescript
// Current data architecture in VinoVoyage
const currentDataSources = {
  elasticsearch: {
    purpose: "Wine catalog search",
    indices: ["wines", "restaurants", "wine-ratings", "user-profiles"],
    location: "Internal ES cluster"
  },
  
  neo4j: {
    purpose: "User relationships and recommendations",
    data: ["user-wine-interactions", "taste-profiles", "social-connections"],
    location: "Internal Neo4j instance"
  },
  
  clerk: {
    purpose: "User authentication and organizations",
    data: ["users", "organizations", "restaurant-staff"],
    location: "External SaaS"
  },
  
  // Missing external integrations that MyceliumQL would provide:
  // - Toast POS (for real-time order data)
  // - Shopify (for wine purchasing)
  // - Stripe (for payment processing)
  // - Wine distributor APIs (for inventory)
  // - OpenTable/Resy (for reservation sync)
}
```

### **Key Integration Points Identified**

**1. Restaurant Admin Components** (`src/components/restaurant-admin/`)
- **PrepTicketView.tsx**: Perfect for federated order data from Toast POS
- **OrderHistoryManager.tsx**: Needs real-time POS integration
- **DrinkingHistoryTracker.tsx**: Should federate across multiple systems

**2. Wine Management** (`src/components/restaurant-wines/`)
- **RestaurantWineTable.tsx**: Needs inventory sync from distributors
- **RestaurantWineWrapper.tsx**: Perfect for federated wine data

**3. Organization Management** (`src/components/organization/`)
- **RestaurantWineInteractions.tsx**: Needs cross-system guest data
- **MultiRestaurantDashboard.tsx**: Perfect for federated analytics

---

## **2. MyceliumQL Integration Architecture**

### **Integration Layer Design**

```typescript
// New: MyceliumQL Federation Layer
// src/lib/mycelium/
const myceliumIntegration = {
  federationClient: new MyceliumQLClient({
    endpoint: "https://api.myceliumql.com/graphql",
    tenantId: process.env.VINOVOYAGE_TENANT_ID,
    cartridges: ["toast-pos", "shopify", "stripe", "wine-distributors"]
  }),
  
  // Federation queries for existing components
  schemas: {
    toast: {
      orders: gql`
        query GetRestaurantOrders($restaurantId: ID!, $date: String!) {
          restaurant(id: $restaurantId) @source(name: "toast") {
            orders(date: $date) {
              id
              timestamp
              guest { email phone }
              items {
                wineId
                quantity
                price
                modifiers
              }
              payment {
                method
                total
                tip
              }
            }
          }
        }
      `
    },
    
    shopify: {
      products: gql`
        query GetWineProducts($restaurantId: ID!) {
          restaurant(id: $restaurantId) @source(name: "shopify") {
            wineProducts {
              id
              title
              variants {
                sku
                price
                inventoryQuantity
              }
              collections
            }
          }
        }
      `
    }
  }
}
```

---

## **3. Component Integration Examples**

### **Enhanced PrepTicketView with Toast POS Federation**

```typescript
// src/components/restaurant-admin/PrepTicketView.tsx
import { useMyceliumQuery } from '@/lib/mycelium/hooks';

export function PrepTicketView({ reservationId }: PrepTicketViewProps) {
  // Existing VinoVoyage data
  const [ticketData, setTicketData] = useState<PrepTicketData | null>(null);
  
  // NEW: Federated real-time order data from Toast POS
  const { data: liveOrderData, loading } = useMyceliumQuery(
    GET_LIVE_ORDER_DATA,
    { 
      variables: { reservationId },
      federationSources: ["toast-pos", "stripe"]
    }
  );

  return (
    <div className="prep-ticket-container">
      {/* Existing guest preferences from internal DB */}
      <GuestPreferences preferences={ticketData?.preferences} />
      
      {/* NEW: Live order status from Toast POS */}
      <LiveOrderStatus 
        orderData={liveOrderData?.restaurant?.activeOrder}
        paymentStatus={liveOrderData?.stripe?.paymentIntent?.status}
      />
      
      {/* Enhanced wine suggestions with distributor pricing */}
      <WinePairingSuggestions 
        guestProfile={ticketData?.guestProfile}
        availableWines={liveOrderData?.distributor?.availableWines}
        currentInventory={liveOrderData?.shopify?.inventory}
      />
    </div>
  );
}

// NEW: Live order status component
function LiveOrderStatus({ orderData, paymentStatus }) {
  if (!orderData) return null;
  
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <h3 className="text-green-800 font-semibold">Live Order Status</h3>
      <div className="mt-2 space-y-1">
        <div>Table: {orderData.tableNumber}</div>
        <div>Order Total: ${orderData.total}</div>
        <div>Payment: {paymentStatus}</div>
        <div>Wine Items: {orderData.items.filter(item => item.category === 'wine').length}</div>
      </div>
    </div>
  );
}
```

### **Enhanced RestaurantWineTable with Federated Inventory**

```typescript
// src/components/restaurant-wines/RestaurantWineTable.tsx  
import { useMyceliumQuery } from '@/lib/mycelium/hooks';

export function RestaurantWineTable({ restaurantId }: RestaurantWineTableProps) {
  // Existing wine data from Elasticsearch
  const [wines, setWines] = useState<Wine[]>([]);
  
  // NEW: Federated inventory and pricing data
  const { data: federatedData } = useMyceliumQuery(
    GET_RESTAURANT_WINE_FEDERATION,
    {
      variables: { restaurantId },
      federationSources: ["shopify", "wine-distributors", "toast-pos"]
    }
  );

  const enhancedWines = useMemo(() => {
    return wines.map(wine => ({
      ...wine,
      // Add federated data
      shopifyInventory: federatedData?.shopify?.findProduct(wine.sku)?.inventory,
      distributorPrice: federatedData?.distributor?.getPricing(wine.sku),
      posAvailability: federatedData?.toast?.checkAvailability(wine.id),
      lastSoldDate: federatedData?.toast?.getLastSaleDate(wine.id)
    }));
  }, [wines, federatedData]);

  return (
    <div className="wine-table-container">
      <WineTableHeader />
      
      {enhancedWines.map(wine => (
        <WineTableRow 
          key={wine.id}
          wine={wine}
          // NEW: Federated actions
          onPurchaseFromDistributor={() => handleDistributorPurchase(wine)}
          onUpdateShopifyInventory={() => handleShopifySync(wine)}
          onMarkUnavailableInPOS={() => handlePOSUpdate(wine)}
        />
      ))}
    </div>
  );
}

// NEW: Enhanced wine row with federation actions
function WineTableRow({ wine, onPurchaseFromDistributor, onUpdateShopifyInventory }) {
  return (
    <tr className="wine-row">
      <td>{wine.name}</td>
      <td>{wine.price}</td>
      
      {/* NEW: Federated inventory status */}
      <td>
        <InventoryStatusBadge 
          shopifyStock={wine.shopifyInventory}
          distributorAvailable={wine.distributorPrice ? true : false}
          posActive={wine.posAvailability}
        />
      </td>
      
      {/* NEW: Quick federation actions */}
      <td>
        <div className="flex space-x-2">
          {wine.distributorPrice && (
            <button 
              onClick={onPurchaseFromDistributor}
              className="btn-sm btn-blue"
            >
              Reorder (${wine.distributorPrice})
            </button>
          )}
          
          {wine.shopifyInventory !== wine.currentStock && (
            <button 
              onClick={onUpdateShopifyInventory}
              className="btn-sm btn-orange"
            >
              Sync Shopify
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
```

### **Enhanced Organization Dashboard with Cross-Restaurant Federation**

```typescript
// src/components/organizations/MultiRestaurantDashboard.tsx
import { useMyceliumQuery } from '@/lib/mycelium/hooks';

export function MultiRestaurantDashboard({ organizationId }: DashboardProps) {
  // NEW: Federated analytics across all restaurant systems
  const { data: federatedAnalytics } = useMyceliumQuery(
    GET_ORGANIZATION_ANALYTICS,
    {
      variables: { organizationId },
      federationSources: ["toast-pos", "shopify", "stripe", "internal"]
    }
  );

  return (
    <div className="dashboard-grid">
      {/* Existing restaurant cards */}
      <RestaurantCards restaurants={federatedAnalytics?.restaurants} />
      
      {/* NEW: Cross-system analytics */}
      <FederatedAnalyticsPanel analytics={federatedAnalytics} />
      
      {/* NEW: Unified guest tracking */}
      <CrossRestaurantGuestActivity 
        guestActivities={federatedAnalytics?.guestActivities}
      />
    </div>
  );
}

// NEW: Federated analytics component
function FederatedAnalyticsPanel({ analytics }) {
  const metrics = {
    totalRevenue: analytics?.stripe?.totalRevenue || 0,
    wineRevenue: analytics?.toast?.wineRevenue || 0,
    onlineOrders: analytics?.shopify?.orderCount || 0,
    repeatGuests: analytics?.internal?.repeatGuestCount || 0
  };

  return (
    <div className="analytics-panel bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Unified Analytics</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <MetricCard 
          title="Total Revenue"
          value={`$${metrics.totalRevenue.toLocaleString()}`}
          source="Stripe"
        />
        
        <MetricCard 
          title="Wine Revenue"
          value={`$${metrics.wineRevenue.toLocaleString()}`}
          source="Toast POS"
        />
        
        <MetricCard 
          title="Online Orders"
          value={metrics.onlineOrders}
          source="Shopify"
        />
        
        <MetricCard 
          title="Repeat Guests"
          value={metrics.repeatGuests}
          source="VinoVoyage"
        />
      </div>
    </div>
  );
}
```

---

## **4. MyceliumQL Hooks and Services**

### **Custom React Hooks for Federation**

```typescript
// src/lib/mycelium/hooks/useMyceliumQuery.ts
import { useQuery } from '@apollo/client';
import { myceliumClient } from '../client';

export function useMyceliumQuery(query: DocumentNode, options: MyceliumQueryOptions) {
  return useQuery(query, {
    client: myceliumClient,
    context: {
      federationSources: options.federationSources,
      tenantId: options.tenantId || process.env.VINOVOYAGE_TENANT_ID
    },
    ...options
  });
}

export function useMyceliumMutation(mutation: DocumentNode) {
  return useMutation(mutation, {
    client: myceliumClient,
    onCompleted: (data) => {
      // Invalidate relevant caches
      myceliumClient.cache.evict({ 
        fieldName: 'restaurant' 
      });
    }
  });
}

// Real-time federation subscription
export function useMyceliumSubscription(subscription: DocumentNode, options: SubscriptionOptions) {
  return useSubscription(subscription, {
    client: myceliumClient,
    context: {
      federationSources: options.federationSources
    }
  });
}
```

### **Federation Services**

```typescript
// src/lib/mycelium/services/WineFederationService.ts
export class WineFederationService {
  static async syncWineAcrossSystems(wineId: string, restaurantId: string) {
    const mutation = gql`
      mutation SyncWineAcrossSystems($wineId: ID!, $restaurantId: ID!) {
        syncWine(wineId: $wineId, restaurantId: $restaurantId) {
          # Update in Toast POS
          toast: updateMenuItem(id: $wineId) {
            success
            availability
          }
          
          # Update in Shopify
          shopify: updateProduct(id: $wineId) {
            success
            inventory
          }
          
          # Update internal database
          internal: updateWine(id: $wineId) {
            success
            lastSynced
          }
        }
      }
    `;
    
    return await myceliumClient.mutate({
      mutation,
      variables: { wineId, restaurantId }
    });
  }

  static async getUnifiedWineData(wineId: string) {
    const query = gql`
      query GetUnifiedWineData($wineId: ID!) {
        wine(id: $wineId) {
          # Base wine data
          id
          name
          producer
          vintage
          
          # Toast POS data
          toast: posData {
            available
            lastSold
            totalSold
            averageRating
          }
          
          # Shopify data
          shopify: ecommerceData {
            inventoryLevel
            onlinePrice
            productUrl
            reviews
          }
          
          # Distributor data
          distributor: supplierData {
            wholesalePrice
            availability
            leadTime
            minimumOrder
          }
        }
      }
    `;
    
    return await myceliumClient.query({ query, variables: { wineId } });
  }
}
```

---

## **5. Real-Time Integration Examples**

### **Live Order Updates in PrepTickets**

```typescript
// src/components/restaurant-admin/LiveOrderTracker.tsx
import { useMyceliumSubscription } from '@/lib/mycelium/hooks';

export function LiveOrderTracker({ reservationId }: { reservationId: string }) {
  const { data: liveOrderData } = useMyceliumSubscription(
    LIVE_ORDER_UPDATES,
    {
      variables: { reservationId },
      federationSources: ["toast-pos"]
    }
  );

  useEffect(() => {
    if (liveOrderData?.orderUpdate) {
      toast.success(`Order updated: ${liveOrderData.orderUpdate.description}`);
    }
  }, [liveOrderData]);

  return (
    <div className="live-order-tracker">
      <h4>Live Order Status</h4>
      {liveOrderData?.restaurant?.activeOrder && (
        <OrderStatusTimeline 
          order={liveOrderData.restaurant.activeOrder}
        />
      )}
    </div>
  );
}

const LIVE_ORDER_UPDATES = gql`
  subscription LiveOrderUpdates($reservationId: ID!) {
    orderUpdate(reservationId: $reservationId) @source(name: "toast") {
      id
      status
      description
      timestamp
      items {
        id
        name
        status
        modifications
      }
    }
  }
`;
```

### **Unified Guest Profile with Cross-System Data**

```typescript
// src/components/profile/UnifiedGuestProfile.tsx
import { useMyceliumQuery } from '@/lib/mycelium/hooks';

export function UnifiedGuestProfile({ guestId }: { guestId: string }) {
  const { data: guestData } = useMyceliumQuery(
    GET_UNIFIED_GUEST_PROFILE,
    {
      variables: { guestId },
      federationSources: ["internal", "toast-pos", "shopify", "stripe"]
    }
  );

  return (
    <div className="unified-guest-profile">
      <GuestBasicInfo guest={guestData?.guest} />
      
      {/* VinoVoyage wine preferences */}
      <WinePreferences preferences={guestData?.guest?.internal?.preferences} />
      
      {/* Toast POS dining history */}
      <DiningHistory orders={guestData?.guest?.toast?.orderHistory} />
      
      {/* Shopify purchase history */}
      <PurchaseHistory purchases={guestData?.guest?.shopify?.purchases} />
      
      {/* Stripe payment preferences */}
      <PaymentPreferences methods={guestData?.guest?.stripe?.paymentMethods} />
    </div>
  );
}

const GET_UNIFIED_GUEST_PROFILE = gql`
  query GetUnifiedGuestProfile($guestId: ID!) {
    guest(id: $guestId) {
      id
      name
      email
      
      # VinoVoyage data
      internal: vinoVoyageData {
        preferences {
          favoriteVarietals
          tasteProfile
          servicePreferences
        }
        wineInteractions {
          wine { name }
          rating
          notes
          dateExperienced
        }
      }
      
      # Toast POS data
      toast: posData {
        orderHistory {
          date
          total
          items {
            name
            quantity
            price
          }
        }
        loyaltyPoints
        averageSpend
      }
      
      # Shopify data
      shopify: ecommerceData {
        purchases {
          date
          products { name price }
          total
        }
        wishlist
      }
      
      # Stripe data
      stripe: paymentData {
        paymentMethods {
          type
          lastFour
          preferred
        }
        lifetimeValue
      }
    }
  }
`;
```

---

## **6. Integration Implementation Plan**

### **Phase 1: Core Federation Setup (Week 1-2)**

```typescript
// 1. Install MyceliumQL packages
npm install @myceliumql/client @myceliumql/react-hooks

// 2. Configure federation client
// src/lib/mycelium/client.ts
import { MyceliumQLClient } from '@myceliumql/client';

export const myceliumClient = new MyceliumQLClient({
  uri: 'https://api.myceliumql.com/graphql',
  tenantId: process.env.VINOVOYAGE_TENANT_ID,
  apiKey: process.env.MYCELIUMQL_API_KEY,
  cartridges: {
    'toast-pos': {
      enabled: true,
      config: {
        restaurantId: process.env.TOAST_RESTAURANT_ID,
        apiKey: process.env.TOAST_API_KEY
      }
    },
    'shopify': {
      enabled: true,
      config: {
        shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
        accessToken: process.env.SHOPIFY_ACCESS_TOKEN
      }
    }
  }
});

// 3. Add providers to layout
// src/app/layout.tsx
import { MyceliumProvider } from '@myceliumql/react-hooks';

export default function Layout({ children }) {
  return (
    <MyceliumProvider client={myceliumClient}>
      {/* Existing providers */}
      {children}
    </MyceliumProvider>
  );
}
```

### **Phase 2: Component Integration (Week 3-4)**

**Priority Integration Points:**
1. **PrepTicketView**: Add live Toast POS order data
2. **RestaurantWineTable**: Add Shopify inventory sync
3. **MultiRestaurantDashboard**: Add federated analytics
4. **OrderHistoryManager**: Add cross-system order tracking

### **Phase 3: Advanced Features (Week 5-6)**

1. **Real-time subscriptions** for live order updates
2. **Cross-system guest identity resolution**
3. **Unified analytics dashboard**
4. **Automated inventory sync workflows**

---

## **7. Expected Benefits**

### **For Restaurant Operators**
- **Unified view** of guest across all systems
- **Real-time inventory** sync between POS and e-commerce
- **Automated reordering** from wine distributors
- **Cross-platform analytics** in single dashboard

### **For Development Team**
- **Leverage existing VinoVoyage UI** (no major rewrites)
- **Add federation gradually** (component by component)
- **Maintain current functionality** while adding new capabilities
- **Future-proof architecture** for additional integrations

### **For Guests**
- **Seamless experience** across dining and online shopping
- **Personalized recommendations** based on complete history
- **Consistent preferences** across all touchpoints

---

## **Conclusion**

The VinoVoyage system is **perfectly positioned** for MyceliumQL integration. The existing component architecture, data flow patterns, and restaurant focus align exactly with MyceliumQL's federation capabilities. 

**Key Integration Strategy:**
1. **Start with PrepTicketView** - highest impact, most visible to restaurant staff
2. **Add RestaurantWineTable federation** - immediate inventory management value  
3. **Expand to organization dashboard** - provide unified analytics
4. **Build real-time subscriptions** - create seamless live experience

This integration would transform VinoVoyage from a standalone wine management system into a **comprehensive restaurant data federation platform** - exactly what the SHAPEUP_SPEC envisions.