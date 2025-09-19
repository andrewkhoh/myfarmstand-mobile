# Staff Kiosk App Specification

## Overview

The Staff Kiosk App is a dedicated application for in-store customer assistance at farm stand locations. It provides a hybrid interface where staff can authenticate and help customers with their shopping experience while tracking session analytics.

## Target Use Cases

### **Primary Use Case: Customer Assistance**
- Customer approaches kiosk/tablet at farm stand
- Staff member authenticates with PIN
- Staff assists customer with browsing, selection, and checkout
- Transaction is completed and tracked to staff session

### **Secondary Use Cases**
- Self-service kiosk for tech-savvy customers (with staff override)
- Staff training and onboarding
- Backup checkout system during busy periods
- Customer education about products and farm practices

## User Personas

### **Farm Stand Staff** (Primary Users)
- **Profile**: Part-time seasonal workers, varying tech comfort levels
- **Goals**: Help customers efficiently, track sales performance
- **Pain Points**: Need simple, fast authentication and intuitive customer assistance tools
- **Requirements**: Large touch targets, clear visual hierarchy, error recovery

### **Customers at Kiosk** (Secondary Users)
- **Profile**: Diverse age range, varying tech comfort levels
- **Goals**: Browse and purchase products with assistance
- **Pain Points**: Unfamiliar interface, need guidance and help
- **Requirements**: Simple shopping flow, clear pricing, easy product discovery

## Functional Requirements

### **1. Staff Authentication**

#### **PIN-Based Login**
```typescript
interface StaffAuthFlow {
  // Staff enters 4-digit PIN
  authenticateStaff(pin: string): Promise<{
    success: boolean;
    staffId: string;
    staffName: string;
    sessionId: string;
    permissions: string[];
  }>;

  // Automatic logout after inactivity
  autoLogout: {
    inactivityTimeout: 30; // minutes
    warningTime: 5; // minutes before logout
  };

  // Manual logout
  endStaffSession(): Promise<boolean>;
}
```

#### **Session Management**
```typescript
interface KioskSession {
  sessionId: string;
  staffId: string;
  staffName: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;

  // Transaction tracking
  transactionCount: number;
  totalSales: number;
  averageTransactionValue: number;

  // Customer assistance metrics
  customersAssisted: number;
  averageAssistanceTime: number;
}
```

### **2. Customer Shopping Interface**

#### **Product Browsing**
```typescript
interface AssistedShopping {
  // Enhanced product display for kiosk
  productDisplay: {
    largeImages: boolean;
    prominentPricing: boolean;
    stockStatus: 'available' | 'low-stock' | 'out-of-stock';
    staffNotes?: string; // Internal notes about products
  };

  // Category navigation optimized for touch
  categoryNavigation: {
    largeButtons: boolean;
    imageBasedCategories: boolean;
    quickFilters: string[]; // 'organic', 'local', 'seasonal'
  };

  // Product search with assistance
  assistedSearch: {
    autocomplete: boolean;
    staffSuggestions: boolean;
    popularProducts: Product[];
  };
}
```

#### **Enhanced Cart Management**
```typescript
interface AssistedCart {
  // Staff can override cart operations
  staffOverrides: {
    applyDiscount(amount: number, reason: string): void;
    addNote(note: string): void;
    voidItem(itemId: string, reason: string): void;
    modifyQuantity(itemId: string, quantity: number): void;
  };

  // Customer education
  customerEducation: {
    showNutritionInfo: boolean;
    showFarmingPractices: boolean;
    suggestComplementaryItems: boolean;
  };

  // Real-time stock validation
  stockValidation: {
    validateOnAdd: boolean;
    showAvailableQuantity: boolean;
    suggestAlternatives: boolean;
  };
}
```

#### **Assisted Checkout**
```typescript
interface AssistedCheckout {
  // Multiple payment options
  paymentMethods: {
    cash: boolean;
    card: boolean;
    contactless: boolean;
    farmCredit: boolean; // Store credit system
  };

  // Staff-assisted payment processing
  staffPaymentControls: {
    voidTransaction(): void;
    applyCashDiscount(): void;
    printReceipt(): void;
    emailReceipt(email: string): void;
  };

  // Customer information collection
  customerData: {
    optionalEmail: boolean;
    optionalPhone: boolean;
    marketingOptIn: boolean;
    loyaltyProgram: boolean;
  };
}
```

### **3. Staff Control Panel**

#### **Session Dashboard**
```typescript
interface StaffDashboard {
  // Current session info
  currentSession: {
    staffName: string;
    sessionDuration: string;
    transactionsToday: number;
    salesTotal: number;
  };

  // Real-time metrics
  realTimeMetrics: {
    currentCustomer?: {
      startTime: Date;
      cartValue: number;
      itemCount: number;
    };
    todayStats: {
      customersHelped: number;
      averageTransactionTime: string;
      topSellingProducts: Product[];
    };
  };

  // Quick actions
  quickActions: {
    startNewCustomer(): void;
    pauseSession(): void;
    callManager(): void;
    reportIssue(): void;
  };
}
```

#### **Inventory Assistance**
```typescript
interface InventoryAssistance {
  // Real-time stock levels
  stockLevels: {
    currentStock: number;
    lowStockThreshold: number;
    expectedRestock?: Date;
  };

  // Staff actions
  staffInventoryActions: {
    reportOutOfStock(productId: string): void;
    reportDamaged(productId: string, quantity: number): void;
    requestRestock(productId: string): void;
  };

  // Customer communication
  customerCommunication: {
    explainStockStatus(productId: string): string;
    suggestAlternatives(productId: string): Product[];
    estimateRestockDate(productId: string): Date | null;
  };
}
```

### **4. Kiosk-Specific Features**

#### **Hardware Integration**
```typescript
interface KioskHardware {
  // Display configuration
  display: {
    orientation: 'landscape' | 'portrait';
    resolution: { width: number; height: number };
    touchCalibration: boolean;
  };

  // Peripheral devices
  peripherals: {
    receiptPrinter?: {
      connected: boolean;
      paperLevel: 'full' | 'low' | 'empty';
    };
    cardReader?: {
      connected: boolean;
      type: 'chip' | 'contactless' | 'both';
    };
    barcodeScanner?: {
      connected: boolean;
      autoScan: boolean;
    };
  };

  // Accessibility features
  accessibility: {
    fontSize: 'normal' | 'large' | 'extra-large';
    highContrast: boolean;
    screenReader: boolean;
    audioFeedback: boolean;
  };
}
```

#### **Offline Capabilities**
```typescript
interface OfflineMode {
  // Local data storage
  localStorage: {
    productCatalog: Product[];
    lastSync: Date;
    pendingTransactions: Transaction[];
  };

  // Sync management
  syncManagement: {
    autoSync: boolean;
    syncInterval: number; // minutes
    conflictResolution: 'server-wins' | 'manual';
  };

  // Offline notifications
  offlineUI: {
    showOfflineIndicator: boolean;
    queueTransactions: boolean;
    notifyWhenOnline: boolean;
  };
}
```

## Non-Functional Requirements

### **Performance**
- **Startup Time**: <2 seconds from staff authentication
- **Response Time**: <500ms for all user interactions
- **Memory Usage**: <200MB on tablet devices
- **Battery Life**: 8+ hours continuous use on tablet
- **Network**: Function with intermittent connectivity

### **Usability**
- **Touch Targets**: Minimum 44px (iOS) / 48dp (Android)
- **Font Size**: Minimum 16sp for body text, 20sp for buttons
- **Navigation**: Maximum 3 taps to reach any feature
- **Error Recovery**: Clear error messages with recovery suggestions
- **Language**: Support for English and Spanish

### **Security**
- **Authentication**: PIN-based staff authentication
- **Session Timeout**: 30-minute inactivity timeout
- **Data Encryption**: All customer data encrypted at rest
- **Network Security**: TLS 1.3 for all communications
- **Audit Trail**: Log all staff actions and customer interactions

### **Reliability**
- **Uptime**: 99.5% availability during business hours
- **Error Rate**: <1% failed transactions
- **Recovery**: Automatic recovery from network interruptions
- **Backup**: Local transaction backup with cloud sync

## User Interface Design

### **Layout Principles**

#### **Dual-Interface Design**
```
┌─────────────────────────────────────────────────────┐
│ Staff Control Panel (Top 20%)                      │
│ [Staff Name] [Session Time] [Today: $XXX] [Logout] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Customer Shopping Interface (Bottom 80%)           │
│                                                     │
│ [Product Categories]  [Product Grid]  [Cart]       │
│                                                     │
│ [Large Touch Buttons] [Clear Pricing] [Help]       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### **Color Scheme**
- **Staff Area**: Blue header (#2563eb) with white text
- **Customer Area**: Green theme (#16a34a) matching farm branding
- **Accent Colors**: Orange (#ea580c) for calls-to-action
- **Status Colors**: Red for errors, yellow for warnings, green for success

#### **Typography**
- **Headers**: Bold, 24sp minimum
- **Body Text**: Regular, 18sp minimum
- **Buttons**: Semi-bold, 20sp minimum
- **Price Display**: Bold, 22sp minimum

### **Screen Flows**

#### **Staff Authentication Flow**
```
Idle Screen
     ↓ (Staff approaches)
PIN Entry Screen
     ↓ (Correct PIN)
Staff Dashboard
     ↓ (Start Customer Session)
Customer Shopping Interface
     ↓ (Complete Transaction)
Transaction Summary
     ↓ (Print Receipt)
Ready for Next Customer
```

#### **Customer Shopping Flow**
```
Welcome Screen (with Staff)
     ↓
Product Categories
     ↓
Product Browsing
     ↓
Add to Cart
     ↓
Review Cart
     ↓
Customer Information
     ↓
Payment Processing
     ↓
Receipt & Thank You
```

## Technical Architecture

### **Application Structure**
```
packages/staff-kiosk/
├── src/
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── StaffLoginScreen.tsx
│   │   │   └── PINEntryScreen.tsx
│   │   ├── dashboard/
│   │   │   ├── StaffDashboardScreen.tsx
│   │   │   └── SessionStatsScreen.tsx
│   │   ├── customer/
│   │   │   ├── WelcomeScreen.tsx
│   │   │   ├── AssistedShopScreen.tsx
│   │   │   ├── AssistedCartScreen.tsx
│   │   │   └── AssistedCheckoutScreen.tsx
│   │   └── admin/
│   │       ├── KioskSettingsScreen.tsx
│   │       └── DiagnosticsScreen.tsx
│   ├── components/
│   │   ├── staff/
│   │   │   ├── StaffControlPanel.tsx
│   │   │   ├── SessionTimer.tsx
│   │   │   └── QuickActions.tsx
│   │   ├── customer/
│   │   │   ├── LargeProductCard.tsx
│   │   │   ├── TouchFriendlyCart.tsx
│   │   │   └── AssistedCheckout.tsx
│   │   └── shared/
│   │       ├── KioskButton.tsx
│   │       ├── KioskInput.tsx
│   │       └── StatusIndicator.tsx
│   ├── hooks/
│   │   ├── useKioskSession.ts
│   │   ├── useStaffAuth.ts
│   │   ├── useAssistedShopping.ts
│   │   └── useOfflineSync.ts
│   ├── services/
│   │   ├── kioskSessionService.ts
│   │   ├── staffAuthService.ts
│   │   ├── transactionService.ts
│   │   └── offlineService.ts
│   └── config/
│       ├── kioskConfig.ts
│       ├── hardwareConfig.ts
│       └── offlineConfig.ts
└── assets/
    ├── fonts/          # Large, readable fonts
    ├── icons/          # Touch-friendly icons
    └── sounds/         # Audio feedback
```

### **Data Models**

#### **Staff Session**
```typescript
interface StaffSession {
  id: string;
  staffId: string;
  staffName: string;
  kioskId: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;

  // Transaction tracking
  transactions: Transaction[];
  totalSales: number;
  transactionCount: number;

  // Performance metrics
  customersAssisted: number;
  averageTransactionTime: number;
  averageTransactionValue: number;

  // Session notes
  notes?: string;
  issues?: SessionIssue[];
}

interface SessionIssue {
  id: string;
  type: 'technical' | 'inventory' | 'customer' | 'other';
  description: string;
  timestamp: Date;
  resolved: boolean;
  resolution?: string;
}
```

#### **Kiosk Transaction**
```typescript
interface KioskTransaction {
  id: string;
  sessionId: string;
  staffId: string;

  // Customer information (optional)
  customerEmail?: string;
  customerPhone?: string;

  // Order details
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount?: number;
  total: number;

  // Payment information
  paymentMethod: 'cash' | 'card' | 'contactless' | 'farm_credit';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'voided';

  // Staff actions
  staffNotes?: string;
  staffOverrides?: StaffOverride[];

  // Timestamps
  startTime: Date;
  completionTime?: Date;
  duration?: number; // seconds
}

interface StaffOverride {
  type: 'discount' | 'void_item' | 'price_adjustment' | 'free_item';
  amount?: number;
  itemId?: string;
  reason: string;
  timestamp: Date;
}
```

### **Integration Points**

#### **Shared Core Integration**
```typescript
// Use shared core for basic shopping functionality
import { useCart, useProducts, useAuth } from '@shared-core';

// Extend with kiosk-specific features
const useAssistedCart = () => {
  const baseCart = useCart();
  const { session } = useKioskSession();

  const applyStaffDiscount = (amount: number, reason: string) => {
    // Staff discount logic with audit trail
  };

  const addStaffNote = (note: string) => {
    // Add staff note to transaction
  };

  return {
    ...baseCart,
    applyStaffDiscount,
    addStaffNote,
    staffSession: session
  };
};
```

#### **Business App Integration**
```typescript
// Send kiosk data to business app for monitoring
interface KioskReporting {
  sessionMetrics: StaffSession[];
  transactionData: KioskTransaction[];
  inventoryUpdates: InventoryUpdate[];
  issueReports: SessionIssue[];
}

// Real-time updates to business dashboard
const sendKioskMetrics = async (metrics: KioskReporting) => {
  await businessAppApi.updateKioskMetrics(metrics);
};
```

## Deployment & Management

### **Device Configuration**
```typescript
interface KioskDevice {
  id: string;
  location: string; // 'farm-stand-1', 'farmers-market-booth'
  hardwareProfile: {
    screenSize: { width: number; height: number };
    orientation: 'landscape' | 'portrait';
    hasReceiptPrinter: boolean;
    hasCardReader: boolean;
    hasBarcodeScanner: boolean;
  };

  // Configuration
  settings: {
    inactivityTimeout: number;
    autoLogoutTime: number;
    receiptDefaults: ReceiptSettings;
    accessibility: AccessibilitySettings;
  };

  // Management
  lastUpdate: Date;
  softwareVersion: string;
  status: 'online' | 'offline' | 'maintenance';
}
```

### **Over-the-Air Updates**
```typescript
// Expo Updates for quick deployments
const kioskUpdateConfig = {
  checkAutomatically: 'ON_LOAD',
  fallbackToCacheTimeout: 30000,
  updates: {
    enabled: true,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 30000,
  }
};

// Staged rollouts for safety
const deploymentStrategy = {
  stages: [
    { name: 'pilot', percentage: 10 }, // Test location only
    { name: 'gradual', percentage: 50 }, // Half of locations
    { name: 'full', percentage: 100 } // All locations
  ],
  rollbackThreshold: 5 // Percentage of devices that can fail
};
```

This specification provides a comprehensive foundation for building a dedicated staff kiosk app that enhances the in-store customer experience while providing valuable analytics and staff management capabilities.