# VinoVoyage Payment Authorization Workflow - Code Changes Analysis

## Current State Assessment

### ✅ Already Implemented (Reuse)
The VinoVoyage codebase already has excellent foundation components:

1. **State Machine Infrastructure** (`src/lib/wine-transaction-state-machine.ts`)
   - ✅ PENDING_CONFIRMATION state already exists
   - ✅ State transition validation logic
   - ✅ Status history tracking
   - ✅ Audit trail management

2. **Payment Status Types** (`src/types/WineTransactionStates.ts`)
   - ✅ PENDING_PAYMENT status exists
   - ✅ Payment state transitions defined
   - ✅ Status labels and colors for UI

3. **Activity Feed System** (UNIFIED_ACTIVITY_FEED_SPECS.md)
   - ✅ Restaurant activity feed architecture
   - ✅ Real-time status tracking framework

## 🆕 New Code Required

### 1. Payment Authorization States Enhancement

**File**: `src/types/WineTransactionStates.ts`
**Action**: ADD new payment status

```typescript
// ADD these new payment statuses
export enum WineTransactionPaymentStatus {
  UNPAID = 'unpaid',
  AUTHORIZED = 'authorized',           // 🆕 NEW: Payment authorized but not captured
  PREPAID = 'prepaid',
  PENDING_PAYMENT = 'pending_payment',
  PAYMENT_COMPLETE = 'payment_complete',
  AUTHORIZATION_EXPIRED = 'authorization_expired' // 🆕 NEW: Authorization expired
}

// ADD new interface
export interface PaymentAuthorizationData {
  stripePaymentIntentId?: string;
  squarePaymentId?: string;
  authorizationAmount: number;
  authorizationExpiresAt: string;
  authorizationStatus: 'ACTIVE' | 'EXPIRED' | 'CAPTURED' | 'CANCELLED';
}

// UPDATE existing interface
export interface WineTransactionState {
  // ... existing fields ...
  paymentAuthorizationData?: PaymentAuthorizationData; // 🆕 NEW field
}
```

### 2. State Machine Payment Transitions

**File**: `src/lib/wine-transaction-state-machine.ts`
**Action**: UPDATE payment transitions

```typescript
// UPDATE payment status transitions
const paymentStatusTransitions: Record<WineTransactionPaymentStatus, WineTransactionPaymentStatus[]> = {
  [WineTransactionPaymentStatus.UNPAID]: [
    WineTransactionPaymentStatus.AUTHORIZED, // 🆕 NEW: Direct to authorized
    WineTransactionPaymentStatus.PENDING_PAYMENT,
    WineTransactionPaymentStatus.PREPAID
  ],
  [WineTransactionPaymentStatus.AUTHORIZED]: [ // 🆕 NEW state transitions
    WineTransactionPaymentStatus.PAYMENT_COMPLETE, // Capture authorization
    WineTransactionPaymentStatus.UNPAID,           // Cancel authorization
    WineTransactionPaymentStatus.AUTHORIZATION_EXPIRED // Timeout
  ],
  [WineTransactionPaymentStatus.AUTHORIZATION_EXPIRED]: [ // 🆕 NEW state
    WineTransactionPaymentStatus.UNPAID // Can retry payment
  ],
  // ... existing states unchanged ...
};

// ADD new validation function
export function validateServicePaymentAlignment(
  serviceStatus: WineTransactionServiceStatus,
  paymentStatus: WineTransactionPaymentStatus
): StateTransitionResult {
  // Restaurant can't confirm without payment authorization
  if (serviceStatus === WineTransactionServiceStatus.CONFIRMED && 
      paymentStatus === WineTransactionPaymentStatus.UNPAID) {
    return {
      isValid: false,
      error: 'Cannot confirm wine order without payment authorization'
    };
  }
  
  // Payment capture should happen when service is confirmed
  if (serviceStatus === WineTransactionServiceStatus.CONFIRMED && 
      paymentStatus === WineTransactionPaymentStatus.AUTHORIZED) {
    return {
      isValid: true,
      warnings: ['Consider capturing payment now that order is confirmed']
    };
  }
  
  return { isValid: true };
}
```

### 3. Payment Authorization Service

**File**: `src/lib/services/payment-authorization.ts` 
**Action**: CREATE new service

```typescript
// 🆕 NEW FILE
import Stripe from 'stripe';

export interface PaymentAuthorizationRequest {
  amount: number;
  currency: string;
  customerId: string;
  description: string;
  metadata: {
    wineTransactionId: string;
    restaurantId: string;
    bottleName: string;
  };
}

export interface PaymentAuthorizationResult {
  success: boolean;
  paymentIntentId?: string;
  authorizationId?: string;
  expiresAt?: Date;
  error?: string;
}

export class PaymentAuthorizationService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
  }

  async authorizePayment(request: PaymentAuthorizationRequest): Promise<PaymentAuthorizationResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: request.amount * 100, // Convert to cents
        currency: request.currency,
        customer: request.customerId,
        capture_method: 'manual', // KEY: Don't capture immediately
        confirmation_method: 'automatic',
        metadata: request.metadata,
        description: request.description
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        authorizationId: paymentIntent.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment authorization failed'
      };
    }
  }

  async capturePayment(paymentIntentId: string): Promise<PaymentAuthorizationResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.capture(paymentIntentId);
      
      return {
        success: true,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment capture failed'
      };
    }
  }

  async cancelAuthorization(paymentIntentId: string): Promise<PaymentAuthorizationResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
      
      return {
        success: true,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authorization cancellation failed'
      };
    }
  }
}
```

### 4. Wine Transaction API Updates

**File**: `src/app/api/wine-transactions/[id]/authorize-payment/route.ts`
**Action**: CREATE new endpoint

```typescript
// 🆕 NEW FILE
import { NextRequest, NextResponse } from 'next/server';
import { PaymentAuthorizationService } from '@/lib/services/payment-authorization';
import { validateStatusUpdate } from '@/lib/wine-transaction-state-machine';
import { WineTransactionPaymentStatus } from '@/types/WineTransactionStates';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { amount, customerId, bottleName } = await request.json();
    const transactionId = params.id;

    // Get current transaction
    const transaction = await getWineTransaction(transactionId);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Validate state transition
    const validation = validateStatusUpdate(
      { paymentStatus: WineTransactionPaymentStatus.AUTHORIZED, updatedBy: customerId },
      transaction.serviceStatus,
      transaction.paymentStatus
    );

    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Authorize payment
    const paymentService = new PaymentAuthorizationService();
    const authResult = await paymentService.authorizePayment({
      amount,
      currency: 'usd',
      customerId,
      description: `Wine bottle reservation - ${bottleName}`,
      metadata: {
        wineTransactionId: transactionId,
        restaurantId: transaction.restaurantId,
        bottleName
      }
    });

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 400 });
    }

    // Update transaction status
    await updateWineTransactionPaymentStatus(transactionId, {
      paymentStatus: WineTransactionPaymentStatus.AUTHORIZED,
      paymentAuthorizationData: {
        stripePaymentIntentId: authResult.paymentIntentId,
        authorizationAmount: amount,
        authorizationExpiresAt: authResult.expiresAt!.toISOString(),
        authorizationStatus: 'ACTIVE'
      },
      updatedBy: customerId
    });

    return NextResponse.json({
      success: true,
      authorizationId: authResult.authorizationId,
      expiresAt: authResult.expiresAt
    });

  } catch (error) {
    console.error('Payment authorization error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**File**: `src/app/api/wine-transactions/[id]/confirm-order/route.ts`
**Action**: CREATE new endpoint

```typescript
// 🆕 NEW FILE - Restaurant confirmation endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { confirmed, staffMemberId, notes } = await request.json();
    const transactionId = params.id;

    const transaction = await getWineTransaction(transactionId);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (confirmed) {
      // Restaurant confirms - capture payment
      const paymentService = new PaymentAuthorizationService();
      const captureResult = await paymentService.capturePayment(
        transaction.paymentAuthorizationData?.stripePaymentIntentId!
      );

      if (!captureResult.success) {
        return NextResponse.json({ error: 'Payment capture failed' }, { status: 400 });
      }

      // Update both service and payment status
      await updateWineTransactionStatus(transactionId, {
        serviceStatus: WineTransactionServiceStatus.CONFIRMED,
        paymentStatus: WineTransactionPaymentStatus.PAYMENT_COMPLETE,
        notes: notes || 'Order confirmed by restaurant',
        updatedBy: staffMemberId
      });

      // Send confirmation notifications
      await sendOrderConfirmationNotifications(transaction);

    } else {
      // Restaurant declines - cancel authorization
      const paymentService = new PaymentAuthorizationService();
      await paymentService.cancelAuthorization(
        transaction.paymentAuthorizationData?.stripePaymentIntentId!
      );

      await updateWineTransactionStatus(transactionId, {
        serviceStatus: WineTransactionServiceStatus.UNAVAILABLE,
        paymentStatus: WineTransactionPaymentStatus.UNPAID,
        notes: notes || 'Order declined by restaurant',
        updatedBy: staffMemberId
      });

      // Send decline notifications
      await sendOrderDeclineNotifications(transaction);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Order confirmation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## 📝 Updated Code Required

### 1. Frontend Components

**File**: `src/components/wine-transaction/WineTransactionCard.tsx`
**Action**: UPDATE to show authorization status

```typescript
// UPDATE existing component
export function WineTransactionCard({ transaction }: { transaction: WineTransactionState }) {
  const isAwaitingConfirmation = 
    transaction.serviceStatus === WineTransactionServiceStatus.PENDING_CONFIRMATION &&
    transaction.paymentStatus === WineTransactionPaymentStatus.AUTHORIZED;

  const authorizationExpiry = transaction.paymentAuthorizationData?.authorizationExpiresAt;

  return (
    <div className="wine-transaction-card">
      {/* Existing card content */}
      
      {/* 🆕 NEW: Authorization status section */}
      {isAwaitingConfirmation && (
        <div className="authorization-status">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-700">
              Awaiting Restaurant Confirmation
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Your card is authorized but not charged. 
            Payment will complete when restaurant confirms availability.
          </p>
          {authorizationExpiry && (
            <p className="text-xs text-gray-500 mt-1">
              Authorization expires: {formatDate(authorizationExpiry)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

**File**: `src/components/restaurant-admin/PendingConfirmations.tsx`
**Action**: CREATE new component

```typescript
// 🆕 NEW FILE - Restaurant confirmation interface
export function PendingConfirmations({ restaurantId }: { restaurantId: string }) {
  const [pendingTransactions, setPendingTransactions] = useState<WineTransactionState[]>([]);

  useEffect(() => {
    fetchPendingConfirmations(restaurantId).then(setPendingTransactions);
  }, [restaurantId]);

  const handleConfirmOrder = async (transactionId: string, confirmed: boolean, notes?: string) => {
    try {
      await fetch(`/api/wine-transactions/${transactionId}/confirm-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmed,
          staffMemberId: 'current-staff-id', // TODO: Get from auth
          notes
        })
      });

      // Refresh list
      const updated = await fetchPendingConfirmations(restaurantId);
      setPendingTransactions(updated);
    } catch (error) {
      console.error('Confirmation error:', error);
    }
  };

  return (
    <div className="pending-confirmations">
      <h3 className="text-lg font-semibold mb-4">Pending Wine Confirmations</h3>
      
      {pendingTransactions.map(transaction => (
        <div key={transaction.id} className="confirmation-card border rounded-lg p-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium">{transaction.wineName}</h4>
              <p className="text-sm text-gray-600">
                Guest: {transaction.guestName} • Table: {transaction.tableNumber}
              </p>
              <p className="text-sm text-gray-600">
                Amount: ${transaction.paymentAuthorizationData?.authorizationAmount}
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleConfirmOrder(transaction.id, true)}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm"
              >
                Confirm
              </button>
              <button
                onClick={() => handleConfirmOrder(transaction.id, false, 'Wine unavailable')}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 2. Database Schema Updates

**File**: `src/lib/neo4j-schema-migration.cypher`
**Action**: CREATE migration script

```cypher
// 🆕 NEW FILE - Add payment authorization fields
MATCH (wt:WineTransaction)
SET 
  wt.paymentAuthorizationData = null,
  wt.authorizationExpiresAt = null,
  wt.authorizationStatus = null

// Create index for efficient queries
CREATE INDEX wine_transaction_payment_status IF NOT EXISTS 
FOR (wt:WineTransaction) ON (wt.paymentStatus);

CREATE INDEX wine_transaction_service_status IF NOT EXISTS 
FOR (wt:WineTransaction) ON (wt.serviceStatus);
```

## 🗑️ Code to Delete/Deprecate

### Remove Unused Payment Patterns
**Files to clean up**:
1. Any direct payment capture logic in reservation creation
2. Immediate payment processing in wine ordering flows
3. Legacy payment status handling that bypasses authorization

### Specific Deletions:
```typescript
// REMOVE from existing reservation API
// Any direct Stripe charge creation without authorization
// Any payment processing that doesn't use the authorization flow
```

## 📊 Implementation Summary

### New Files (7):
1. `src/lib/services/payment-authorization.ts` - Payment service
2. `src/app/api/wine-transactions/[id]/authorize-payment/route.ts` - Authorization endpoint
3. `src/app/api/wine-transactions/[id]/confirm-order/route.ts` - Confirmation endpoint
4. `src/components/restaurant-admin/PendingConfirmations.tsx` - Restaurant UI
5. `src/lib/neo4j-schema-migration.cypher` - Database migration
6. `src/hooks/usePaymentAuthorization.ts` - React hook
7. `src/lib/notifications/order-notifications.ts` - Notification service

### Updated Files (4):
1. `src/types/WineTransactionStates.ts` - Add authorization states
2. `src/lib/wine-transaction-state-machine.ts` - Update transitions
3. `src/components/wine-transaction/WineTransactionCard.tsx` - Show authorization status
4. `src/app/api/wine-transactions/[id]/status/route.ts` - Handle new states

### Reused Existing (5):
1. `src/lib/wine-transaction-state-machine.ts` - State validation
2. `src/types/WineTransactionStates.ts` - Status enums
3. Activity feed infrastructure
4. Neo4j connection and queries
5. Existing UI component patterns

This implementation leverages VinoVoyage's existing state machine infrastructure while adding the specific payment authorization workflow needed for restaurant confirmation. The changes are additive and maintain backward compatibility with existing wine transaction flows.