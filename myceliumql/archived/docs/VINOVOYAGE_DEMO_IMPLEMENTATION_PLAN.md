# VinoVoyage Demo Implementation Plan - Wine Transaction Flow

## Demo Architecture Overview

### Mock Data Strategy
- **Preloaded static data** in JSON files for consistent demos
- **Manual triggers** via admin UI buttons for state changes
- **Simulated timing** with configurable delays for realistic flow
- **Local state management** with localStorage persistence for demo sessions

## Implementation Plan

### Phase 1: Enhanced State Machine (No API Changes)

#### 1. Extended Mock Payment States

**File**: `src/types/WineTransactionStates.ts`
**Action**: ADD demo-specific payment states

```typescript
// ADD to existing enum
export enum WineTransactionPaymentStatus {
  UNPAID = 'unpaid',
  AUTHORIZED = 'authorized',           // 🆕 Card authorized, not charged
  PENDING_APPROVAL = 'pending_approval', // 🆕 Waiting admin approval
  READY_TO_CHARGE = 'ready_to_charge',   // 🆕 Approved, ready for payment
  PREPAID = 'prepaid',
  PENDING_PAYMENT = 'pending_payment',
  PAYMENT_COMPLETE = 'payment_complete',
  REFUNDED = 'refunded'                  // 🆕 Payment refunded
}

// ADD demo-specific interfaces
export interface MockPaymentData {
  cardLast4: string;
  authorizationCode: string;
  authorizationAmount: number;
  authorizationExpiresAt: string;
  paymentProcessor: 'stripe' | 'square' | 'mock';
  mockDelay?: number; // Seconds to simulate processing
}

export interface WineTransactionDemo extends WineTransactionState {
  // Demo-specific fields
  mockPaymentData?: MockPaymentData;
  adminNotes?: string;
  alternativeWineIds?: string[];
  counterOfferHistory?: CounterOfferEntry[];
  demoTimeline?: DemoTimelineEntry[];
}

export interface CounterOfferEntry {
  id: string;
  fromRole: 'diner' | 'admin';
  wineId: string;
  wineName: string;
  price: number;
  notes?: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface DemoTimelineEntry {
  timestamp: string;
  action: string;
  actor: 'diner' | 'admin' | 'system';
  description: string;
  metadata?: Record<string, any>;
}
```

#### 2. Demo State Machine Logic

**File**: `src/lib/demo/wine-transaction-demo-machine.ts`
**Action**: CREATE new demo state machine

```typescript
// 🆕 NEW FILE - Demo-specific state machine
export class WineTransactionDemoMachine {
  
  // Mock data for realistic demos
  static readonly MOCK_WINES = [
    { id: 'w1', name: '2019 Burgundian Dreams', price: 85, vintage: 2019 },
    { id: 'w2', name: '2020 Napa Valley Reserve', price: 120, vintage: 2020 },
    { id: 'w3', name: '2018 Tuscan Gold', price: 65, vintage: 2018 }
  ];

  static readonly MOCK_PAYMENT_CARDS = [
    { last4: '4242', type: 'Visa' },
    { last4: '5555', type: 'Mastercard' },
    { last4: '3782', type: 'Amex' }
  ];

  // Demo flow progression
  static async simulateWineRequest(
    wineId: string, 
    dinerId: string, 
    reservationId: string
  ): Promise<WineTransactionDemo> {
    
    const wine = this.MOCK_WINES.find(w => w.id === wineId);
    const mockCard = this.MOCK_PAYMENT_CARDS[0]; // Default card
    
    return {
      id: `wt_${Date.now()}`,
      wineId,
      wineName: wine?.name || 'Unknown Wine',
      quantity: 1,
      serviceStatus: WineTransactionServiceStatus.REQUESTED,
      paymentStatus: WineTransactionPaymentStatus.UNPAID,
      serviceStatusHistory: JSON.stringify([]),
      paymentStatusHistory: JSON.stringify([]),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Demo-specific data
      mockPaymentData: {
        cardLast4: mockCard.last4,
        authorizationCode: `auth_${Math.random().toString(36).substr(2, 9)}`,
        authorizationAmount: wine?.price || 0,
        authorizationExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        paymentProcessor: 'mock',
        mockDelay: 2 // 2 seconds for demo
      },
      
      demoTimeline: [{
        timestamp: new Date().toISOString(),
        action: 'WINE_REQUESTED',
        actor: 'diner',
        description: `Diner requested ${wine?.name}`,
        metadata: { wineId, price: wine?.price }
      }],
      
      counterOfferHistory: []
    };
  }

  // Manual state transitions for demo
  static async authorizePayment(transaction: WineTransactionDemo): Promise<WineTransactionDemo> {
    // Simulate payment authorization delay
    await this.sleep(transaction.mockPaymentData?.mockDelay || 1);
    
    return {
      ...transaction,
      paymentStatus: WineTransactionPaymentStatus.AUTHORIZED,
      serviceStatus: WineTransactionServiceStatus.PENDING_CONFIRMATION,
      updatedAt: new Date().toISOString(),
      demoTimeline: [
        ...transaction.demoTimeline || [],
        {
          timestamp: new Date().toISOString(),
          action: 'PAYMENT_AUTHORIZED',
          actor: 'system',
          description: `Payment authorized for $${transaction.mockPaymentData?.authorizationAmount}`,
          metadata: { 
            authCode: transaction.mockPaymentData?.authorizationCode,
            cardLast4: transaction.mockPaymentData?.cardLast4
          }
        }
      ]
    };
  }

  static async adminApprove(
    transaction: WineTransactionDemo, 
    adminId: string, 
    notes?: string
  ): Promise<WineTransactionDemo> {
    
    return {
      ...transaction,
      serviceStatus: WineTransactionServiceStatus.CONFIRMED,
      paymentStatus: WineTransactionPaymentStatus.READY_TO_CHARGE,
      adminNotes: notes,
      updatedAt: new Date().toISOString(),
      demoTimeline: [
        ...transaction.demoTimeline || [],
        {
          timestamp: new Date().toISOString(),
          action: 'ADMIN_APPROVED',
          actor: 'admin',
          description: `Admin approved wine selection${notes ? `: ${notes}` : ''}`,
          metadata: { adminId }
        }
      ]
    };
  }

  static async adminSuggestAlternative(
    transaction: WineTransactionDemo,
    alternativeWineId: string,
    adminId: string,
    notes?: string
  ): Promise<WineTransactionDemo> {
    
    const alternativeWine = this.MOCK_WINES.find(w => w.id === alternativeWineId);
    
    const counterOffer: CounterOfferEntry = {
      id: `co_${Date.now()}`,
      fromRole: 'admin',
      wineId: alternativeWineId,
      wineName: alternativeWine?.name || 'Alternative Wine',
      price: alternativeWine?.price || 0,
      notes,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    return {
      ...transaction,
      serviceStatus: WineTransactionServiceStatus.PENDING_CONFIRMATION,
      paymentStatus: WineTransactionPaymentStatus.AUTHORIZED, // Keep authorization
      alternativeWineIds: [...(transaction.alternativeWineIds || []), alternativeWineId],
      counterOfferHistory: [...(transaction.counterOfferHistory || []), counterOffer],
      updatedAt: new Date().toISOString(),
      demoTimeline: [
        ...transaction.demoTimeline || [],
        {
          timestamp: new Date().toISOString(),
          action: 'ALTERNATIVE_SUGGESTED',
          actor: 'admin',
          description: `Admin suggested ${alternativeWine?.name} as alternative`,
          metadata: { 
            adminId, 
            originalWine: transaction.wineName,
            alternativeWine: alternativeWine?.name,
            priceDiff: (alternativeWine?.price || 0) - (transaction.mockPaymentData?.authorizationAmount || 0)
          }
        }
      ]
    };
  }

  static async dinerAcceptAlternative(
    transaction: WineTransactionDemo,
    counterOfferId: string,
    dinerId: string
  ): Promise<WineTransactionDemo> {
    
    const counterOffer = transaction.counterOfferHistory?.find(co => co.id === counterOfferId);
    if (!counterOffer) throw new Error('Counter offer not found');

    return {
      ...transaction,
      wineId: counterOffer.wineId,
      wineName: counterOffer.wineName,
      serviceStatus: WineTransactionServiceStatus.CONFIRMED,
      paymentStatus: WineTransactionPaymentStatus.READY_TO_CHARGE,
      counterOfferHistory: transaction.counterOfferHistory?.map(co => 
        co.id === counterOfferId ? { ...co, status: 'accepted' as const } : co
      ),
      mockPaymentData: {
        ...transaction.mockPaymentData!,
        authorizationAmount: counterOffer.price
      },
      updatedAt: new Date().toISOString(),
      demoTimeline: [
        ...transaction.demoTimeline || [],
        {
          timestamp: new Date().toISOString(),
          action: 'ALTERNATIVE_ACCEPTED',
          actor: 'diner',
          description: `Diner accepted alternative: ${counterOffer.wineName}`,
          metadata: { dinerId, counterOfferId, newPrice: counterOffer.price }
        }
      ]
    };
  }

  static async processPayment(transaction: WineTransactionDemo): Promise<WineTransactionDemo> {
    // Simulate payment processing delay
    await this.sleep(transaction.mockPaymentData?.mockDelay || 2);
    
    return {
      ...transaction,
      paymentStatus: WineTransactionPaymentStatus.PAYMENT_COMPLETE,
      updatedAt: new Date().toISOString(),
      demoTimeline: [
        ...transaction.demoTimeline || [],
        {
          timestamp: new Date().toISOString(),
          action: 'PAYMENT_CAPTURED',
          actor: 'system',
          description: `Payment of $${transaction.mockPaymentData?.authorizationAmount} captured`,
          metadata: { 
            authCode: transaction.mockPaymentData?.authorizationCode,
            finalAmount: transaction.mockPaymentData?.authorizationAmount
          }
        }
      ]
    };
  }

  private static sleep(seconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
}
```

### Phase 2: Demo UI Components

#### 1. Wine Transaction Demo Card

**File**: `src/components/demo/WineTransactionDemoCard.tsx`
**Action**: CREATE new demo component

```typescript
// 🆕 NEW FILE - Demo-optimized wine transaction card
import React, { useState } from 'react';
import { WineTransactionDemo, WineTransactionServiceStatus, WineTransactionPaymentStatus } from '@/types/WineTransactionStates';
import { WineTransactionDemoMachine } from '@/lib/demo/wine-transaction-demo-machine';

interface Props {
  transaction: WineTransactionDemo;
  onUpdate: (updated: WineTransactionDemo) => void;
  userRole: 'diner' | 'admin';
}

export function WineTransactionDemoCard({ transaction, onUpdate, userRole }: Props) {
  const [processing, setProcessing] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const handleAuthorizePayment = async () => {
    setProcessing(true);
    try {
      const updated = await WineTransactionDemoMachine.authorizePayment(transaction);
      onUpdate(updated);
    } finally {
      setProcessing(false);
    }
  };

  const handleAdminAction = async (action: 'approve' | 'suggest_alternative', data?: any) => {
    setProcessing(true);
    try {
      let updated: WineTransactionDemo;
      
      if (action === 'approve') {
        updated = await WineTransactionDemoMachine.adminApprove(transaction, 'admin_demo', data?.notes);
      } else {
        updated = await WineTransactionDemoMachine.adminSuggestAlternative(
          transaction, 
          data.alternativeWineId, 
          'admin_demo', 
          data.notes
        );
      }
      
      onUpdate(updated);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessPayment = async () => {
    setProcessing(true);
    try {
      const updated = await WineTransactionDemoMachine.processPayment(transaction);
      onUpdate(updated);
    } finally {
      setProcessing(false);
    }
  };

  const renderStatusBadge = () => {
    const serviceStatus = transaction.serviceStatus;
    const paymentStatus = transaction.paymentStatus;
    
    if (serviceStatus === WineTransactionServiceStatus.PENDING_CONFIRMATION && 
        paymentStatus === WineTransactionPaymentStatus.AUTHORIZED) {
      return (
        <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
          ⏳ Awaiting Restaurant Confirmation
        </div>
      );
    }
    
    if (serviceStatus === WineTransactionServiceStatus.CONFIRMED && 
        paymentStatus === WineTransactionPaymentStatus.READY_TO_CHARGE) {
      return (
        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
          ✅ Approved - Ready to Charge
        </div>
      );
    }
    
    if (paymentStatus === WineTransactionPaymentStatus.PAYMENT_COMPLETE) {
      return (
        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
          💳 Paid
        </div>
      );
    }
    
    return (
      <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
        {serviceStatus}
      </div>
    );
  };

  const renderDinerActions = () => {
    if (transaction.paymentStatus === WineTransactionPaymentStatus.UNPAID) {
      return (
        <button
          onClick={handleAuthorizePayment}
          disabled={processing}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {processing ? 'Authorizing...' : 'Authorize Payment'}
        </button>
      );
    }

    if (transaction.paymentStatus === WineTransactionPaymentStatus.READY_TO_CHARGE) {
      return (
        <button
          onClick={handleProcessPayment}
          disabled={processing}
          className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {processing ? 'Processing...' : 'Complete Payment'}
        </button>
      );
    }

    // Show counter offers if any
    const pendingOffers = transaction.counterOfferHistory?.filter(co => co.status === 'pending') || [];
    if (pendingOffers.length > 0) {
      return (
        <div className="space-y-2">
          {pendingOffers.map(offer => (
            <div key={offer.id} className="border rounded-lg p-3 bg-yellow-50">
              <p className="font-medium">Alternative Suggested: {offer.wineName}</p>
              <p className="text-sm text-gray-600">Price: ${offer.price}</p>
              {offer.notes && <p className="text-sm text-gray-600">Note: {offer.notes}</p>}
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => WineTransactionDemoMachine.dinerAcceptAlternative(transaction, offer.id, 'diner_demo').then(onUpdate)}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  Accept
                </button>
                <button className="bg-gray-600 text-white px-3 py-1 rounded text-sm">
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const renderAdminActions = () => {
    if (transaction.serviceStatus === WineTransactionServiceStatus.PENDING_CONFIRMATION) {
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => handleAdminAction('approve')}
              disabled={processing}
              className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              ✅ Approve
            </button>
            <button
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg"
            >
              🔄 Suggest Alternative
            </button>
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg">
              ❌ Decline
            </button>
          </div>
          
          {showAlternatives && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <p className="font-medium mb-2">Suggest Alternative Wine:</p>
              {WineTransactionDemoMachine.MOCK_WINES
                .filter(wine => wine.id !== transaction.wineId)
                .map(wine => (
                  <button
                    key={wine.id}
                    onClick={() => handleAdminAction('suggest_alternative', { 
                      alternativeWineId: wine.id, 
                      notes: `Better availability and value at $${wine.price}` 
                    })}
                    className="block w-full text-left p-2 hover:bg-gray-100 rounded"
                  >
                    {wine.name} - ${wine.price}
                  </button>
                ))}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{transaction.wineName}</h3>
          <p className="text-gray-600">
            ${transaction.mockPaymentData?.authorizationAmount} • 
            Card ending in {transaction.mockPaymentData?.cardLast4}
          </p>
        </div>
        {renderStatusBadge()}
      </div>

      {/* Payment Authorization Info */}
      {transaction.paymentStatus === WineTransactionPaymentStatus.AUTHORIZED && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">Payment Authorized</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            ${transaction.mockPaymentData?.authorizationAmount} authorized on card ending {transaction.mockPaymentData?.cardLast4}. 
            Final charge pending restaurant confirmation.
          </p>
          <p className="text-xs text-blue-500 mt-1">
            Authorization expires: {new Date(transaction.mockPaymentData?.authorizationExpiresAt || '').toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Demo Timeline */}
      <div className="mb-4">
        <details className="group">
          <summary className="text-sm text-gray-500 cursor-pointer group-open:text-gray-700">
            View Transaction Timeline ({transaction.demoTimeline?.length || 0} events)
          </summary>
          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
            {transaction.demoTimeline?.map((entry, index) => (
              <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                <span className="font-medium">{entry.action}</span> by {entry.actor}
                <div className="text-gray-600">{entry.description}</div>
                <div className="text-gray-400">{new Date(entry.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* Actions */}
      <div className="mt-4">
        {userRole === 'diner' ? renderDinerActions() : renderAdminActions()}
      </div>
    </div>
  );
}
```

#### 2. Orders Tab (Profile)

**File**: `src/components/demo/WineOrdersHistoryDemo.tsx`
**Action**: CREATE new orders tab

```typescript
// 🆕 NEW FILE - Orders history tab for user profile
export function WineOrdersHistoryDemo({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<WineTransactionDemo[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'refunded'>('all');

  useEffect(() => {
    // Load demo orders from localStorage or generate sample data
    const demoOrders = generateDemoOrders(userId);
    setOrders(demoOrders);
  }, [userId]);

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'pending') return order.paymentStatus !== WineTransactionPaymentStatus.PAYMENT_COMPLETE;
    if (filter === 'paid') return order.paymentStatus === WineTransactionPaymentStatus.PAYMENT_COMPLETE;
    if (filter === 'refunded') return order.paymentStatus === WineTransactionPaymentStatus.REFUNDED;
    return true;
  });

  return (
    <div className="wine-orders-history">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Wine Orders</h2>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value as any)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="space-y-4">
        {filteredOrders.map(order => (
          <div key={order.id} className="border rounded-lg p-4 bg-white">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{order.wineName}</h3>
                <p className="text-sm text-gray-600">
                  ${order.mockPaymentData?.authorizationAmount} • 
                  Reservation: <Link href={`/reservations/${order.id}`} className="text-blue-600 hover:underline">
                    #{order.id.slice(-6)}
                  </Link>
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <PaymentStatusBadge status={order.paymentStatus} />
                <ServiceStatusBadge status={order.serviceStatus} />
              </div>
            </div>
            
            {/* Timeline summary */}
            <div className="mt-3 text-xs text-gray-600">
              Last update: {order.demoTimeline?.slice(-1)[0]?.description || 'No updates'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function generateDemoOrders(userId: string): WineTransactionDemo[] {
  // Generate realistic demo data
  return [
    {
      id: 'wt_demo_1',
      wineId: 'w1',
      wineName: '2019 Burgundian Dreams',
      quantity: 1,
      serviceStatus: WineTransactionServiceStatus.CONSUMED,
      paymentStatus: WineTransactionPaymentStatus.PAYMENT_COMPLETE,
      // ... more demo data
    },
    // ... more demo orders
  ];
}
```

### Phase 3: Demo Data Management

#### Mock Data Store

**File**: `src/lib/demo/demo-data-store.ts`
**Action**: CREATE demo data persistence

```typescript
// 🆕 NEW FILE - Demo data management
export class DemoDataStore {
  private static STORAGE_KEY = 'vinovoyage_demo_data';
  
  static saveTransaction(transaction: WineTransactionDemo): void {
    const existing = this.getAllTransactions();
    const updated = existing.filter(t => t.id !== transaction.id);
    updated.push(transaction);
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }
  
  static getAllTransactions(): WineTransactionDemo[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }
  
  static resetDemoData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
  
  static loadSampleData(): void {
    const sampleTransactions = [
      // Predefined demo scenarios
    ];
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sampleTransactions));
  }
}
```

## Demo Flow Scripts

### Demo Scenario 1: Happy Path
1. Diner requests wine → `REQUESTED`
2. Diner authorizes payment → `AUTHORIZED` + `PENDING_CONFIRMATION`
3. Admin approves → `CONFIRMED` + `READY_TO_CHARGE`
4. Payment processes → `PAYMENT_COMPLETE`

### Demo Scenario 2: Alternative Suggestion
1. Diner requests wine → `REQUESTED`
2. Diner authorizes payment → `AUTHORIZED` + `PENDING_CONFIRMATION`
3. Admin suggests alternative → Counter-offer created
4. Diner accepts alternative → `CONFIRMED` + `READY_TO_CHARGE`
5. Payment processes → `PAYMENT_COMPLETE`

### Demo Scenario 3: Authorization Expiry
1. Diner requests wine → `REQUESTED`
2. Diner authorizes payment → `AUTHORIZED` + `PENDING_CONFIRMATION`
3. Time passes (manual trigger) → `AUTHORIZATION_EXPIRED`
4. Diner can retry authorization

This implementation provides a complete demo experience without any external API dependencies, while setting up the exact patterns needed for real Stripe integration later.