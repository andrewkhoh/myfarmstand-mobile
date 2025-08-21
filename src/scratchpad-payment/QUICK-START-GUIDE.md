# Payment Integration Quick Start Guide
## For New Developers & Future Agents

### 🚀 **Getting Started in 5 Minutes**

This guide helps new developers understand and work with the payment system immediately.

---

## 📋 **Current Status: PRODUCTION READY** ✅

- **✅ Complete**: All 6 development phases finished
- **✅ Tested**: Comprehensive test coverage across all layers
- **✅ Secure**: PCI compliant with user data isolation
- **✅ Documented**: Full architectural documentation available
- **✅ Deployed**: Ready for production use

---

## 🔧 **Development Environment Setup**

### **Required Dependencies** (Already Installed)
```json
{
  "@stripe/stripe-js": "^1.x",
  "@supabase/supabase-js": "^2.x", 
  "@tanstack/react-query": "^4.x",
  "zod": "^3.x",
  "react-native": "^0.72.x"
}
```

### **Environment Variables Needed**
```bash
# .env.local
STRIPE_PUBLISHABLE_KEY=pk_test_...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Supabase Edge Functions
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 🏗️ **Architecture Overview**

### **File Structure**
```
src/
├── components/                 # UI Components
│   ├── PaymentForm.tsx        # Main payment form
│   ├── PaymentMethodSelector.tsx # Payment method selection
│   ├── PaymentConfirmation.tsx   # Success screen
│   ├── PaymentError.tsx       # Error handling
│   ├── PaymentMethodCard.tsx  # Individual method display
│   └── PaymentSummary.tsx     # Order summary
├── hooks/
│   └── usePayment.ts          # React Query hooks
├── services/
│   └── paymentService.ts      # Business logic
├── types.ts                   # TypeScript interfaces
└── utils/
    └── queryKeys.ts           # Cache key factory

supabase/
├── functions/                 # Edge Functions
│   ├── create-payment-intent/ # Stripe payment creation
│   ├── confirm-payment/       # Payment confirmation
│   └── stripe-webhook/        # Webhook handling
└── migrations/
    └── 20250821_create_payment_tables.sql # Database schema
```

### **Data Flow**
```
User Input → Component → Hook → Service → Edge Function → Stripe API
     ↓         ↓        ↓       ↓          ↓            ↓
UI Updates ← Component ← Hook ← Service ← Edge Function ← Database
```

---

## 💻 **Common Development Tasks**

### **1. Adding a New Payment Method Type**

**Step 1**: Update types
```typescript
// src/types.ts
export type PaymentMethodType = 'card' | 'bank_account' | 'apple_pay'; // Add new type
```

**Step 2**: Update component rendering
```typescript
// src/components/PaymentMethodCard.tsx
const getPaymentMethodDisplay = (method: PaymentMethod) => {
  switch (method.type) {
    case 'card':
      return `${method.card.brand} •••• ${method.card.last4}`;
    case 'apple_pay':  // Add new case
      return 'Apple Pay';
    default:
      return 'Payment Method';
  }
};
```

**Step 3**: Update database schema (if needed)
```sql
-- Add migration file
ALTER TYPE payment_method_type ADD VALUE 'apple_pay';
```

**Step 4**: Add tests
```typescript
// src/components/__tests__/PaymentMethodCard.test.tsx
test('displays Apple Pay method correctly', () => {
  const applePayMethod = { type: 'apple_pay', id: 'pm_123' };
  render(<PaymentMethodCard method={applePayMethod} />);
  expect(screen.getByText('Apple Pay')).toBeVisible();
});
```

### **2. Customizing Error Messages**

**Edit the error mapping**:
```typescript
// src/components/PaymentError.tsx
const getErrorDisplayInfo = (error: PaymentErrorType) => {
  const errorMap = {
    'CARD_DECLINED': {
      title: 'Card Declined',
      message: 'Your custom message here', // Customize this
      icon: '❌',
      canRetry: false,
      suggestDifferentMethod: true,
    },
    // Add new error types here
  };
};
```

### **3. Adding New Validation Rules**

**Database Level** (Recommended):
```sql
-- supabase/migrations/new_migration.sql
ALTER TABLE payments 
ADD CONSTRAINT payment_amount_max CHECK (amount <= 100000); -- $1000 max
```

**Service Level**:
```typescript
// src/services/paymentService.ts
const validatePaymentData = (data: PaymentCreationData) => {
  if (data.amount > 100000) {
    throw new PaymentError('AMOUNT_TOO_HIGH', 'Payment exceeds maximum limit');
  }
  return PaymentCreationSchema.parse(data);
};
```

### **4. Testing Payment Flows**

**Component Test**:
```typescript
// src/components/__tests__/PaymentForm.test.tsx
test('shows success message after payment', async () => {
  const onSuccess = jest.fn();
  render(<PaymentForm onSuccess={onSuccess} />);
  
  fireEvent.press(screen.getByText('Pay Now'));
  await waitFor(() => {
    expect(onSuccess).toHaveBeenCalled();
  });
});
```

**Integration Test**:
```typescript
// src/__tests__/integration/PaymentFlow.test.tsx
test('complete payment flow', async () => {
  render(<PaymentMethodSelector onPaymentMethodSelect={onSelect} />);
  
  const paymentMethod = await screen.findByText('Visa •••• 4242');
  fireEvent.press(paymentMethod);
  
  expect(onSelect).toHaveBeenCalledWith(expectedPaymentMethod);
});
```

---

## 🧪 **Testing Commands**

```bash
# Run all payment tests
npm test -- --testPathPattern="payment|Payment"

# Run service layer tests
npm run test:services

# Run hook tests (including race conditions)
npm run test:hooks

# Run integration tests
npm test -- --testPathPattern="integration"

# Run with coverage
npm test -- --coverage
```

---

## 🔍 **Debugging Common Issues**

### **Issue**: Payment methods not loading
**Solution**: Check ValidationMonitor logs and RLS policies
```typescript
// Check if user is authenticated
const { data: user } = await supabase.auth.getUser();
console.log('User:', user);

// Check RLS policy
const { data, error } = await supabase
  .from('payment_methods')
  .select('*');
console.log('Data:', data, 'Error:', error);
```

### **Issue**: Payment creation failing
**Solution**: Check Edge Function logs
```bash
# View Edge Function logs
supabase functions logs create-payment-intent

# Check Stripe webhook logs
supabase functions logs stripe-webhook
```

### **Issue**: Cache not updating after payment method changes
**Solution**: Check query key factory usage
```typescript
// Ensure consistent query keys
import { paymentKeys } from '../utils/queryKeys';

// Invalidate correctly
queryClient.invalidateQueries({ queryKey: paymentKeys.methods() });
```

### **Issue**: TypeScript errors in payment components
**Solution**: Check type imports and interfaces
```typescript
import { PaymentMethod, Payment, PaymentError } from '../types';

// Ensure proper typing
const handlePayment = (method: PaymentMethod) => {
  // TypeScript will catch errors here
};
```

---

## 📊 **Monitoring & Analytics**

### **ValidationMonitor Usage**
```typescript
// Track successful operations
ValidationMonitor.recordPatternSuccess({
  service: 'PaymentService',
  pattern: 'direct_supabase_query', 
  operation: 'createPayment'
});

// Track errors with context
ValidationMonitor.recordValidationError({
  context: 'PaymentForm.handleSubmit',
  errorMessage: error.message,
  errorCode: error.code
});

// Track calculation mismatches
ValidationMonitor.recordCalculationMismatch({
  type: 'order_total',
  expected: calculatedTotal,
  actual: providedTotal,
  tolerance: 0.01
});
```

### **Performance Monitoring**
```typescript
// Time critical operations
const startTime = Date.now();
await paymentService.createPayment(data);
const duration = Date.now() - startTime;

console.log(`Payment creation took ${duration}ms`);
```

---

## 🛡️ **Security Best Practices**

### **Always Follow These Rules**:

1. **Never expose Stripe secrets client-side**
```typescript
// ❌ WRONG - Secret key exposed
const stripe = Stripe('sk_live_...');

// ✅ RIGHT - Use Edge Functions
const response = await fetch('/api/create-payment-intent', {
  method: 'POST',
  body: JSON.stringify(paymentData)
});
```

2. **Always validate user permissions**
```typescript
// ✅ Check user owns the data
if (paymentMethod.userId !== currentUser.id) {
  throw new PaymentError('UNAUTHORIZED', 'Access denied');
}
```

3. **Always use RLS policies**
```sql
-- ✅ RLS enforces user isolation
CREATE POLICY "user_payment_methods" ON payment_methods
  FOR ALL USING (user_id = auth.uid());
```

4. **Always validate input data**
```typescript
// ✅ Validate at every layer
const validatedData = PaymentCreationSchema.parse(inputData);
```

---

## 🎯 **Performance Tips**

### **React Query Optimization**
```typescript
// Use query key factory for consistent caching
const { data } = useQuery({
  queryKey: paymentKeys.methods(), // Consistent key
  queryFn: paymentService.getUserPaymentMethods,
  staleTime: 5 * 60 * 1000, // Cache for 5 minutes
});

// Prefetch related data
queryClient.prefetchQuery({
  queryKey: paymentKeys.method(selectedMethodId),
  queryFn: () => paymentService.getPaymentMethod(selectedMethodId)
});
```

### **Component Optimization**
```typescript
// Memoize expensive operations
const validatedItems = useMemo(() => {
  return items.filter(item => validateItem(item));
}, [items]);

// Memoize callbacks
const handlePaymentSelect = useCallback((method: PaymentMethod) => {
  onPaymentMethodSelect(method);
}, [onPaymentMethodSelect]);
```

### **Database Optimization**
```sql
-- Ensure proper indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_customer_id 
  ON payments (customer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_methods_user_id
  ON payment_methods (user_id);
```

---

## 📚 **Essential Reading**

### **Before Making Changes**:
1. **`docs/architectural-patterns-and-best-practices.md`** - Core patterns
2. **`src/scratchpad-payment/ARCHITECTURAL-DECISIONS.md`** - Why patterns exist
3. **`src/scratchpad-payment/COMPLETION-SUMMARY.md`** - What was built

### **For Specific Tasks**:
- **Adding features**: Follow existing component → hook → service pattern
- **Fixing bugs**: Check ValidationMonitor logs first
- **Performance issues**: Optimize within patterns, don't break them
- **Security concerns**: Review RLS policies and Edge Function authentication

---

## 🔧 **Troubleshooting Checklist**

### **Payment Not Working?**
- [ ] Check environment variables are set
- [ ] Verify user is authenticated (`supabase.auth.getUser()`)
- [ ] Check database RLS policies
- [ ] Review Edge Function logs
- [ ] Validate Stripe webhook configuration
- [ ] Check ValidationMonitor error logs

### **Tests Failing?**
- [ ] Check mock configurations in test files
- [ ] Verify test data matches expected interfaces
- [ ] Review React Query test setup
- [ ] Check StyleSheet usage in components
- [ ] Validate async operation handling

### **TypeScript Errors?**
- [ ] Check import paths and type exports
- [ ] Verify interface definitions match usage
- [ ] Review Zod schema and type compatibility
- [ ] Check generic type parameters

---

## 🎉 **Quick Wins for New Features**

### **Easy Additions** (1-2 hours):
- Add new error messages
- Customize UI styling
- Add new payment method icons
- Extend ValidationMonitor tracking
- Add new success/failure messages

### **Medium Features** (1-2 days):
- Add new payment method type
- Implement payment method management
- Add payment history screen
- Extend database schema
- Add new validation rules

### **Complex Features** (1+ weeks):
- Add new payment provider (beyond Stripe)
- Implement recurring payments
- Add payment analytics dashboard
- Implement payment dispute handling
- Add multi-currency support

---

## 🚨 **Emergency Procedures**

### **If Payments Stop Working**:
1. Check Stripe dashboard for API issues
2. Review Supabase Edge Function logs
3. Check database connectivity
4. Verify webhook endpoint is reachable
5. Review recent code deployments

### **If Security Issue Discovered**:
1. Immediately disable affected endpoints
2. Review database access logs
3. Check for data exposure in logs
4. Validate RLS policy effectiveness
5. Audit user permissions

### **If Performance Degrades**:
1. Check database query performance
2. Review React Query cache hit rates
3. Monitor Edge Function response times
4. Check for memory leaks in components
5. Validate ValidationMonitor overhead

---

*This quick start guide provides immediate actionable guidance for developers working on the payment system. For deeper understanding, always refer to the comprehensive architectural documentation.*

*Last Updated: August 21, 2025*  
*Status: DEVELOPER READY* 🚀