# Stripe Development & Testing Guide

## 🧪 **Development Setup**

### **1. Environment Configuration**

Add these to your `.env.secret` file:

```bash
# Stripe Test Mode (Development)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_your_test_key_here
EXPO_PUBLIC_STRIPE_SECRET_KEY_TEST=sk_test_your_test_key_here

# Stripe Live Mode (Production)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_your_live_key_here
EXPO_PUBLIC_STRIPE_SECRET_KEY_LIVE=sk_live_your_live_key_here

# Environment
EXPO_PUBLIC_NODE_ENV=development
```

### **2. Stripe Dashboard Setup**

1. **Create Stripe Account**: Go to [stripe.com](https://stripe.com) and create account
2. **Get Test Keys**: Dashboard → Developers → API keys → Test Data
3. **Configure Webhooks**: Dashboard → Developers → Webhooks (for production)

---

## 💳 **Test Card Numbers**

Our implementation includes comprehensive test card scenarios:

### **✅ Successful Payments**
```typescript
// Use these in PaymentForm during development
const successCards = {
  visa: '4242424242424242',          // Standard Visa
  visaDebit: '4000056655665556',     // Visa Debit
  mastercard: '5555555555554444',    // Mastercard
  amex: '378282246310005',           // American Express
};
```

### **❌ Failed Payments (Test Error Handling)**
```typescript
const failureCards = {
  declined: '4000000000000002',           // Generic decline
  insufficientFunds: '4000000000009995',  // Insufficient funds
  expiredCard: '4000000000000069',        // Expired card
  incorrectCvc: '4000000000000127',       // Incorrect CVC
  processingError: '4000000000000119',    // Processing error
};
```

### **🔐 3D Secure Testing (Authentication)**
```typescript
const authCards = {
  require3DS: '4000002760003184',         // Requires authentication → succeeds
  require3DSDeclined: '4000008400001629', // Requires authentication → fails
};
```

---

## 🧪 **Testing Scenarios**

### **1. Happy Path Testing**
```typescript
// Test successful payment flow
const testData = {
  cardNumber: '4242424242424242',
  expMonth: 12,
  expYear: 2025,
  cvc: '123',
  amount: 1000, // $10.00 in cents
};

// Expected behavior:
// 1. Payment method created successfully
// 2. Payment intent created with status 'requires_confirmation'
// 3. Payment confirmed and status becomes 'succeeded'
```

### **2. Error Handling Testing**
```typescript
// Test card declined scenario
const declinedTest = {
  cardNumber: '4000000000000002', // This will be declined
  expMonth: 12,
  expYear: 2025,
  cvc: '123',
  amount: 1000,
};

// Expected behavior:
// 1. Payment method creation fails with "Your card was declined"
// 2. Error is caught gracefully
// 3. User sees meaningful error message
// 4. Fallback options are provided (cash_on_pickup, etc.)
```

### **3. 3D Secure Authentication Testing**
```typescript
// Test authentication required scenario
const authTest = {
  cardNumber: '4000002760003184', // Requires 3D Secure
  expMonth: 12,
  expYear: 2025,
  cvc: '123',
  amount: 1000,
};

// Expected behavior:
// 1. Payment intent created with status 'requires_action'
// 2. Authentication modal appears (in real Stripe integration)
// 3. After authentication, payment succeeds
```

---

## 🔧 **Integration Steps**

### **1. Replace Mock with Real Stripe SDK**

For production, replace the mock implementation:

```bash
# Install Stripe SDK
npm install @stripe/stripe-react-native
# or
expo install @stripe/stripe-react-native
```

### **2. Update PaymentService**
```typescript
// Replace the mock implementation in paymentService.ts
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';

const { createPaymentMethod, confirmPayment } = useStripe();

// Real implementation
const stripe = {
  createPaymentIntent: async (params) => {
    // Call your backend to create payment intent with Stripe
    const response = await fetch('/api/payment-intents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  },
  
  createPaymentMethod: async (params) => {
    return await createPaymentMethod(params);
  },
  
  confirmPaymentIntent: async (clientSecret, paymentMethod) => {
    return await confirmPayment(clientSecret, { 
      paymentMethodType: 'Card',
      paymentMethodData: paymentMethod 
    });
  },
};
```

### **3. Backend Integration**

Create Supabase Edge Functions for Stripe operations:

```typescript
// supabase/functions/create-payment-intent/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2022-11-15',
});

serve(async (req) => {
  try {
    const { amount, currency, userId } = await req.json();
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { userId },
      automatic_payment_methods: { enabled: true },
    });

    return new Response(
      JSON.stringify({
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## 📱 **Development Testing Workflow**

### **1. Component Testing**
```typescript
// Test PaymentForm with different cards
import { STRIPE_TEST_CARDS } from '../services/paymentService';

const PaymentFormTest = () => {
  const [selectedTestCard, setSelectedTestCard] = useState('visa');
  
  const testCards = {
    visa: STRIPE_TEST_CARDS.visa,
    declined: STRIPE_TEST_CARDS.declined,
    require3DS: STRIPE_TEST_CARDS.require3DS,
  };
  
  return (
    <View>
      <Picker
        selectedValue={selectedTestCard}
        onValueChange={setSelectedTestCard}
      >
        {Object.keys(testCards).map(card => (
          <Picker.Item key={card} label={card} value={card} />
        ))}
      </Picker>
      
      <PaymentForm
        onSuccess={(paymentMethod) => {
          console.log('✅ Payment successful:', paymentMethod);
        }}
        onError={(error) => {
          console.log('❌ Payment failed:', error.userMessage);
        }}
        // Pre-fill with test card for quick testing
        initialCardData={{
          cardNumber: testCards[selectedTestCard],
          expMonth: 12,
          expYear: 2025,
          cvc: '123',
        }}
      />
    </View>
  );
};
```

### **2. End-to-End Testing**
```typescript
// Test complete payment flow
const testPaymentFlow = async () => {
  try {
    console.log('🧪 Testing payment flow...');
    
    // 1. Create payment method
    const paymentMethod = await paymentService.tokenizeCard({
      cardNumber: STRIPE_TEST_CARDS.visa,
      expiryMonth: 12,
      expiryYear: 2025,
      cvc: '123',
    });
    
    console.log('✅ Payment method created:', paymentMethod.token);
    
    // 2. Create payment intent
    const paymentIntent = await paymentService.createPaymentIntent(1000, 'usd');
    
    console.log('✅ Payment intent created:', paymentIntent.paymentIntent?.id);
    
    // 3. Confirm payment
    const confirmation = await paymentService.confirmPayment({
      paymentIntentId: paymentIntent.paymentIntent!.id,
      paymentMethodId: paymentMethod.token,
    });
    
    console.log('✅ Payment confirmed:', confirmation);
    
  } catch (error) {
    console.error('❌ Payment flow failed:', error);
  }
};
```

---

## 🚨 **Important Testing Notes**

### **⚠️ Never Use Test Cards in Production**
- Test cards only work in test mode
- Always use environment variables to switch between test/live modes
- Validate your environment configuration

### **💰 No Real Money in Test Mode**
- Test mode never charges real cards
- You can use any valid expiry date and CVC
- All transactions are simulated

### **🔄 Webhook Testing**
Use Stripe CLI for webhook testing:
```bash
# Install Stripe CLI
npm install -g stripe-cli

# Login and forward events to local development
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### **📊 Monitor Test Payments**
- View all test payments in Stripe Dashboard
- Check logs for debugging
- Use Stripe's event logs to troubleshoot issues

---

## ✅ **Production Checklist**

Before going live:

1. **✅ Switch to Live Keys**: Update environment variables
2. **✅ Test with Real Cards**: Use your own card for final testing
3. **✅ Set up Webhooks**: Configure production webhook endpoints
4. **✅ Enable 3D Secure**: For European customers (SCA compliance)
5. **✅ Configure Business Info**: Complete Stripe account setup
6. **✅ Test Error Scenarios**: Ensure graceful error handling
7. **✅ Security Review**: Validate PCI compliance implementation

The payment system is now ready for comprehensive development testing with realistic Stripe behavior! 🚀