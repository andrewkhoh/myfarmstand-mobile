# Security Audit Report

Generated: 2025-08-16T02:01:04.324Z

## Executive Summary

- **Total Issues**: 1936
- **Critical**: 22 🔴
- **High**: 501 ⚠️
- **Medium**: 1270 🟡
- **Low**: 78 🔵
- **Info**: 65 ℹ️

🚨 **CRITICAL RISK**: Immediate action required

## 🔴 CRITICAL Issues (22)

### 1. Potential SQL injection vulnerability

- **File**: `automation/test-generator.ts:542`
- **Type**: sql_injection
- **Code**: `${hookName} optimistic update`
- **Recommendation**: Use parameterized queries or ORM methods to prevent SQL injection

### 2. Potential SQL injection vulnerability

- **File**: `src/screens/CheckoutScreen.tsx:154`
- **Type**: sql_injection
- **Code**: `${conflictDetails}\n\nWould you like to update`
- **Recommendation**: Use parameterized queries or ORM methods to prevent SQL injection

### 3. Potential SQL injection vulnerability

- **File**: `src/screens/CheckoutScreen.tsx:204`
- **Type**: sql_injection
- **Code**: `${updatedItems} item${updatedItems > 1 ? 's' : ''} update`
- **Recommendation**: Use parameterized queries or ORM methods to prevent SQL injection

### 4. Potential SQL injection vulnerability

- **File**: `src/screens/CheckoutScreen.tsx:336`
- **Type**: sql_injection
- **Code**: `${conflictDetails}\n\nWould you like to update`
- **Recommendation**: Use parameterized queries or ORM methods to prevent SQL injection

### 5. Hardcoded credentials detected

- **File**: `src/screens/ProfileScreen.tsx:88`
- **Type**: hardcoded_credentials
- **Code**: `Password = 'Current password is required'`
- **Recommendation**: Move credentials to environment variables or secure key management

### 6. Hardcoded credentials detected

- **File**: `src/screens/ProfileScreen.tsx:92`
- **Type**: hardcoded_credentials
- **Code**: `Password = 'New password is required'`
- **Recommendation**: Move credentials to environment variables or secure key management

### 7. Hardcoded credentials detected

- **File**: `src/screens/ProfileScreen.tsx:94`
- **Type**: hardcoded_credentials
- **Code**: `Password = 'Password must be at least 8 characters long'`
- **Recommendation**: Move credentials to environment variables or secure key management

### 8. Hardcoded credentials detected

- **File**: `src/screens/ProfileScreen.tsx:96`
- **Type**: hardcoded_credentials
- **Code**: `Password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number'`
- **Recommendation**: Move credentials to environment variables or secure key management

### 9. Hardcoded credentials detected

- **File**: `src/screens/ProfileScreen.tsx:100`
- **Type**: hardcoded_credentials
- **Code**: `Password = 'Please confirm your new password'`
- **Recommendation**: Move credentials to environment variables or secure key management

### 10. Hardcoded credentials detected

- **File**: `src/screens/ProfileScreen.tsx:102`
- **Type**: hardcoded_credentials
- **Code**: `Password = 'Passwords do not match'`
- **Recommendation**: Move credentials to environment variables or secure key management

### 11. Potential SQL injection vulnerability

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:35`
- **Type**: sql_injection
- **Code**: `${testProduct.name} (qty: ${update`
- **Recommendation**: Use parameterized queries or ORM methods to prevent SQL injection

### 12. Potential SQL injection vulnerability

- **File**: `src/screens/testScreens/HybridAuthTestScreen.tsx:204`
- **Type**: sql_injection
- **Code**: `${getTestStatusIcon('optimisticUpdate')} Test Optimistic Profile Update`
- **Recommendation**: Use parameterized queries or ORM methods to prevent SQL injection

### 13. Potential SQL injection vulnerability

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:210`
- **Type**: sql_injection
- **Code**: `${lastUpdate} (Count: ${update`
- **Recommendation**: Use parameterized queries or ORM methods to prevent SQL injection

### 14. Potential SQL injection vulnerability

- **File**: `src/services/notificationService.ts:269`
- **Type**: sql_injection
- **Code**: `${order.customerInfo.name}! Your order #${order.id.slice(-6)} has been confirmed. We'll notify you when it's ready for pickup. ${order.pickupDate ? `Pickup date: ${order.pickupDate`
- **Recommendation**: Use parameterized queries or ORM methods to prevent SQL injection

### 15. Potential SQL injection vulnerability

- **File**: `src/services/pickupReschedulingService.ts:118`
- **Type**: sql_injection
- **Code**: `${currentOrder.pickupDate} ${currentOrder.pickupTime} to ${request.newPickupDate`
- **Recommendation**: Use parameterized queries or ORM methods to prevent SQL injection

### 16. Potential SQL injection vulnerability

- **File**: `src/services/realtimeService.ts:74`
- **Type**: sql_injection
- **Code**: `${payload.payload.orderId} status update`
- **Recommendation**: Use parameterized queries or ORM methods to prevent SQL injection

### 17. Potential SQL injection vulnerability

- **File**: `src/services/realtimeService.ts:135`
- **Type**: sql_injection
- **Code**: `${payload.payload.orderId} status update`
- **Recommendation**: Use parameterized queries or ORM methods to prevent SQL injection

### 18. Potential SQL injection vulnerability

- **File**: `src/services/realtimeService.ts:194`
- **Type**: sql_injection
- **Code**: `${payload.payload.productName} update`
- **Recommendation**: Use parameterized queries or ORM methods to prevent SQL injection

### 19. Hardcoded credentials detected

- **File**: `src/test/AutomatedTestRunner.tsx:567`
- **Type**: hardcoded_credentials
- **Code**: `Token = 'test_access_token_12345'`
- **Recommendation**: Move credentials to environment variables or secure key management

### 20. Hardcoded credentials detected

- **File**: `src/test/AutomatedTestRunner.tsx:573`
- **Type**: hardcoded_credentials
- **Code**: `Token = 'test_refresh_token_67890'`
- **Recommendation**: Move credentials to environment variables or secure key management

### 21. Hardcoded credentials detected

- **File**: `src/test/AutomatedTestRunner.tsx:614`
- **Type**: hardcoded_credentials
- **Code**: `Password = 'password123'`
- **Recommendation**: Move credentials to environment variables or secure key management

### 22. Potential SQL injection vulnerability

- **File**: `src/test/AutomatedTestRunner.tsx:887`
- **Type**: sql_injection
- **Code**: `${orderId} should exist after update`
- **Recommendation**: Use parameterized queries or ORM methods to prevent SQL injection

## ⚠️ HIGH Issues (501)

### 1. Sensitive data logged to console

- **File**: `app.config.js:24`
- **Type**: data_exposure
- **Code**: `console.log(`🔧 Loading env var: ${key} = "${value}" (length: ${value.length})`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 2. Sensitive data logged to console

- **File**: `app.config.js:31`
- **Type**: data_exposure
- **Code**: `console.log(' .env.secret loaded successfully')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 3. Sensitive data logged to console

- **File**: `app.config.js:41`
- **Type**: data_exposure
- **Code**: `console.log('🔧 Environment loading verification:', {
  DEBUG_CHANNELS: process.env.DEBUG_CHANNELS,
  NODE_ENV: process.env.NODE_ENV,
  hasChannelSecret: !!process.env.EXPO_PUBLIC_CHANNEL_SECRET,
  allDebugKeys: Object.keys(process.env)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 4. Potential path traversal vulnerability

- **File**: `automation/pattern-fixer.ts:186`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 5. Potential path traversal vulnerability

- **File**: `automation/test-generator.ts:192`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 6. Potential path traversal vulnerability

- **File**: `automation/test-generator.ts:192`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 7. Potential path traversal vulnerability

- **File**: `automation/test-generator.ts:195`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 8. Potential path traversal vulnerability

- **File**: `automation/test-generator.ts:195`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 9. Potential path traversal vulnerability

- **File**: `automation/test-generator.ts:210`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 10. Potential path traversal vulnerability

- **File**: `automation/test-generator.ts:210`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 11. Potential path traversal vulnerability

- **File**: `automation/test-generator.ts:293`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 12. Potential path traversal vulnerability

- **File**: `automation/test-generator.ts:293`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 13. Potential path traversal vulnerability

- **File**: `automation/test-generator.ts:396`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 14. Potential path traversal vulnerability

- **File**: `automation/test-generator.ts:396`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 15. Potential path traversal vulnerability

- **File**: `automation/test-generator.ts:399`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 16. Potential path traversal vulnerability

- **File**: `automation/test-generator.ts:399`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 17. Sensitive data logged to console

- **File**: `schema_inspector.js:22`
- **Type**: data_exposure
- **Code**: `console.log('PRODUCTS TABLE COLUMNS:', Object.keys(products[0])`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 18. Sensitive data logged to console

- **File**: `schema_inspector.js:32`
- **Type**: data_exposure
- **Code**: `console.log('CATEGORIES TABLE COLUMNS:', Object.keys(categories[0])`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 19. Sensitive data logged to console

- **File**: `schema_inspector.js:42`
- **Type**: data_exposure
- **Code**: `console.log('ORDERS TABLE COLUMNS:', Object.keys(orders[0])`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 20. Sensitive data logged to console

- **File**: `schema_inspector.js:52`
- **Type**: data_exposure
- **Code**: `console.log('CART_ITEMS TABLE COLUMNS:', Object.keys(cartItems[0])`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 21. Potential path traversal vulnerability

- **File**: `scripts/audit-react-query-hooks.ts:377`
- **Type**: path_traversal
- **Code**: `..\`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 22. Potential path traversal vulnerability

- **File**: `scripts/audit-schema-mismatches.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 23. Potential path traversal vulnerability

- **File**: `scripts/audit-schema-mismatches.ts:374`
- **Type**: path_traversal
- **Code**: `..\`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 24. Potential XSS vulnerability

- **File**: `scripts/security-audit.ts:83`
- **Type**: xss
- **Code**: `dangerouslySetInnerHTML`
- **Recommendation**: Sanitize user input and use safe rendering methods

### 25. Potential path traversal vulnerability

- **File**: `scripts/security-audit.ts:555`
- **Type**: path_traversal
- **Code**: `..\`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 26. App Transport Security disabled

- **File**: `scripts/security-audit.ts:130`
- **Type**: react_native_security
- **Code**: `NSAllowsArbitraryLoads.*true`
- **Recommendation**: Follow React Native security best practices

### 27. Potential path traversal vulnerability

- **File**: `src/components/Button.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 28. Potential path traversal vulnerability

- **File**: `src/components/Card.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 29. Potential path traversal vulnerability

- **File**: `src/components/Input.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 30. Potential path traversal vulnerability

- **File**: `src/components/Loading.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 31. Potential path traversal vulnerability

- **File**: `src/components/ProductCard.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 32. Potential path traversal vulnerability

- **File**: `src/components/ProductCard.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 33. Potential path traversal vulnerability

- **File**: `src/components/ProductCard.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 34. Potential path traversal vulnerability

- **File**: `src/components/Screen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 35. Potential path traversal vulnerability

- **File**: `src/components/Text.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 36. Potential path traversal vulnerability

- **File**: `src/components/Toast.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 37. Potential path traversal vulnerability

- **File**: `src/data/mockProducts.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 38. Sensitive data logged to console

- **File**: `src/hooks/useAuth.ts:156`
- **Type**: data_exposure
- **Code**: `console.log('✅ Password changed successfully:', data.message)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 39. Potential path traversal vulnerability

- **File**: `src/hooks/useAuth.ts:2`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 40. Potential path traversal vulnerability

- **File**: `src/hooks/useAuth.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 41. Potential path traversal vulnerability

- **File**: `src/hooks/useCart.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 42. Potential path traversal vulnerability

- **File**: `src/hooks/useCart.ts:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 43. Potential path traversal vulnerability

- **File**: `src/hooks/useCart.ts:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 44. Potential path traversal vulnerability

- **File**: `src/hooks/useCart.ts:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 45. Sensitive data logged to console

- **File**: `src/hooks/useCentralizedRealtime.ts:65`
- **Type**: data_exposure
- **Code**: `console.log('🛒 Authorized cart item added broadcast received')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 46. Sensitive data logged to console

- **File**: `src/hooks/useCentralizedRealtime.ts:73`
- **Type**: data_exposure
- **Code**: `console.log('🛒 Authorized cart item removed broadcast received')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 47. Sensitive data logged to console

- **File**: `src/hooks/useCentralizedRealtime.ts:81`
- **Type**: data_exposure
- **Code**: `console.log('🛒 Authorized cart quantity updated broadcast received')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 48. Sensitive data logged to console

- **File**: `src/hooks/useCentralizedRealtime.ts:89`
- **Type**: data_exposure
- **Code**: `console.log('🛒 Authorized cart cleared broadcast received')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 49. Sensitive data logged to console

- **File**: `src/hooks/useCentralizedRealtime.ts:117`
- **Type**: data_exposure
- **Code**: `console.log('📦 Authorized new order broadcast received')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 50. Sensitive data logged to console

- **File**: `src/hooks/useCentralizedRealtime.ts:125`
- **Type**: data_exposure
- **Code**: `console.log('📦 Authorized order status updated broadcast received')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 51. Potential path traversal vulnerability

- **File**: `src/hooks/useCentralizedRealtime.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 52. Potential path traversal vulnerability

- **File**: `src/hooks/useCentralizedRealtime.ts:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 53. Potential path traversal vulnerability

- **File**: `src/hooks/useCentralizedRealtime.ts:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 54. Potential path traversal vulnerability

- **File**: `src/hooks/useEntityQuery.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 55. Potential path traversal vulnerability

- **File**: `src/hooks/useEntityQuery.ts:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 56. Potential path traversal vulnerability

- **File**: `src/hooks/useErrorRecovery.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 57. Potential path traversal vulnerability

- **File**: `src/hooks/useErrorRecovery.ts:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 58. Potential path traversal vulnerability

- **File**: `src/hooks/useNoShowHandling.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 59. Potential path traversal vulnerability

- **File**: `src/hooks/useNoShowHandling.ts:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 60. Potential path traversal vulnerability

- **File**: `src/hooks/useNoShowHandling.ts:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 61. Potential path traversal vulnerability

- **File**: `src/hooks/useNotifications.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 62. Potential path traversal vulnerability

- **File**: `src/hooks/useNotifications.ts:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 63. Potential path traversal vulnerability

- **File**: `src/hooks/useNotifications.ts:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 64. Potential path traversal vulnerability

- **File**: `src/hooks/useNotifications.ts:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 65. Potential path traversal vulnerability

- **File**: `src/hooks/useOrders.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 66. Potential path traversal vulnerability

- **File**: `src/hooks/useOrders.ts:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 67. Potential path traversal vulnerability

- **File**: `src/hooks/useOrders.ts:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 68. Potential path traversal vulnerability

- **File**: `src/hooks/useOrders.ts:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 69. Potential path traversal vulnerability

- **File**: `src/hooks/useOrders.ts:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 70. Potential path traversal vulnerability

- **File**: `src/hooks/usePickupRescheduling.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 71. Potential path traversal vulnerability

- **File**: `src/hooks/usePickupRescheduling.ts:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 72. Potential path traversal vulnerability

- **File**: `src/hooks/usePickupRescheduling.ts:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 73. Potential path traversal vulnerability

- **File**: `src/hooks/useProducts.ts:2`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 74. Potential path traversal vulnerability

- **File**: `src/hooks/useProducts.ts:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 75. Sensitive data logged to console

- **File**: `src/hooks/useRealtime.ts:29`
- **Type**: data_exposure
- **Code**: `console.log('🚀 User authenticated, initializing real-time subscriptions...')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 76. Potential path traversal vulnerability

- **File**: `src/hooks/useRealtime.ts:2`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 77. Potential path traversal vulnerability

- **File**: `src/hooks/useStockValidation.ts:2`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 78. Potential path traversal vulnerability

- **File**: `src/hooks/useStockValidation.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 79. Potential path traversal vulnerability

- **File**: `src/navigation/AdminStackNavigator.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 80. Potential path traversal vulnerability

- **File**: `src/navigation/AdminStackNavigator.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 81. Potential path traversal vulnerability

- **File**: `src/navigation/AdminStackNavigator.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 82. Potential path traversal vulnerability

- **File**: `src/navigation/AppNavigator.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 83. Potential path traversal vulnerability

- **File**: `src/navigation/AppNavigator.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 84. Potential path traversal vulnerability

- **File**: `src/navigation/AppNavigator.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 85. Potential path traversal vulnerability

- **File**: `src/navigation/AppNavigator.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 86. Potential path traversal vulnerability

- **File**: `src/navigation/AppNavigator.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 87. Potential path traversal vulnerability

- **File**: `src/navigation/MainTabNavigator.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 88. Potential path traversal vulnerability

- **File**: `src/navigation/MainTabNavigator.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 89. Potential path traversal vulnerability

- **File**: `src/navigation/MainTabNavigator.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 90. Potential path traversal vulnerability

- **File**: `src/navigation/MainTabNavigator.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 91. Potential path traversal vulnerability

- **File**: `src/navigation/MainTabNavigator.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 92. Potential path traversal vulnerability

- **File**: `src/navigation/TestStackNavigator.tsx:24`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 93. Potential path traversal vulnerability

- **File**: `src/navigation/TestStackNavigator.tsx:25`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 94. Potential path traversal vulnerability

- **File**: `src/navigation/TestStackNavigator.tsx:26`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 95. Potential path traversal vulnerability

- **File**: `src/navigation/TestStackNavigator.tsx:27`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 96. Potential path traversal vulnerability

- **File**: `src/navigation/TestStackNavigator.tsx:28`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 97. Potential path traversal vulnerability

- **File**: `src/navigation/TestStackNavigator.tsx:29`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 98. Potential path traversal vulnerability

- **File**: `src/navigation/TestStackNavigator.tsx:30`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 99. Potential path traversal vulnerability

- **File**: `src/screens/AdminOrderScreen.tsx:15`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 100. Potential path traversal vulnerability

- **File**: `src/screens/AdminOrderScreen.tsx:16`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 101. Potential path traversal vulnerability

- **File**: `src/screens/AdminScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 102. Potential path traversal vulnerability

- **File**: `src/screens/AdminScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 103. Potential path traversal vulnerability

- **File**: `src/screens/AdminScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 104. Potential path traversal vulnerability

- **File**: `src/screens/AdminScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 105. Potential path traversal vulnerability

- **File**: `src/screens/CartScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 106. Potential path traversal vulnerability

- **File**: `src/screens/CartScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 107. Potential path traversal vulnerability

- **File**: `src/screens/CartScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 108. Potential path traversal vulnerability

- **File**: `src/screens/CartScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 109. Potential path traversal vulnerability

- **File**: `src/screens/CartScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 110. Potential path traversal vulnerability

- **File**: `src/screens/CheckoutScreen.tsx:18`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 111. Potential path traversal vulnerability

- **File**: `src/screens/CheckoutScreen.tsx:19`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 112. Potential path traversal vulnerability

- **File**: `src/screens/CheckoutScreen.tsx:20`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 113. Potential path traversal vulnerability

- **File**: `src/screens/CheckoutScreen.tsx:21`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 114. Potential path traversal vulnerability

- **File**: `src/screens/CheckoutScreen.tsx:22`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 115. Potential path traversal vulnerability

- **File**: `src/screens/CheckoutScreen.tsx:23`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 116. Potential path traversal vulnerability

- **File**: `src/screens/LoginScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 117. Potential path traversal vulnerability

- **File**: `src/screens/LoginScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 118. Potential path traversal vulnerability

- **File**: `src/screens/LoginScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 119. Potential path traversal vulnerability

- **File**: `src/screens/MetricsAnalyticsScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 120. Potential path traversal vulnerability

- **File**: `src/screens/MetricsAnalyticsScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 121. Potential path traversal vulnerability

- **File**: `src/screens/MetricsAnalyticsScreen.tsx:14`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 122. Potential path traversal vulnerability

- **File**: `src/screens/MyOrdersScreen.tsx:15`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 123. Potential path traversal vulnerability

- **File**: `src/screens/MyOrdersScreen.tsx:18`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 124. Potential path traversal vulnerability

- **File**: `src/screens/MyOrdersScreen.tsx:19`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 125. Potential path traversal vulnerability

- **File**: `src/screens/MyOrdersScreen.tsx:20`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 126. Potential path traversal vulnerability

- **File**: `src/screens/MyOrdersScreen.tsx:21`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 127. Potential path traversal vulnerability

- **File**: `src/screens/MyOrdersScreen.tsx:22`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 128. Potential path traversal vulnerability

- **File**: `src/screens/MyOrdersScreen.tsx:23`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 129. Potential path traversal vulnerability

- **File**: `src/screens/OrderConfirmationScreen.tsx:16`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 130. Potential path traversal vulnerability

- **File**: `src/screens/OrderConfirmationScreen.tsx:225`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 131. Potential path traversal vulnerability

- **File**: `src/screens/OrderConfirmationScreen.tsx:225`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 132. Potential path traversal vulnerability

- **File**: `src/screens/ProductDetailScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 133. Potential path traversal vulnerability

- **File**: `src/screens/ProductDetailScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 134. Potential path traversal vulnerability

- **File**: `src/screens/ProductDetailScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 135. Potential path traversal vulnerability

- **File**: `src/screens/ProductDetailScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 136. Potential path traversal vulnerability

- **File**: `src/screens/ProductDetailScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 137. Potential path traversal vulnerability

- **File**: `src/screens/ProductDetailScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 138. Potential path traversal vulnerability

- **File**: `src/screens/ProfileScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 139. Potential path traversal vulnerability

- **File**: `src/screens/ProfileScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 140. Potential path traversal vulnerability

- **File**: `src/screens/ProfileScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 141. Potential path traversal vulnerability

- **File**: `src/screens/ProfileScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 142. Potential path traversal vulnerability

- **File**: `src/screens/RegisterScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 143. Potential path traversal vulnerability

- **File**: `src/screens/RegisterScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 144. Potential path traversal vulnerability

- **File**: `src/screens/RegisterScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 145. Potential path traversal vulnerability

- **File**: `src/screens/ShopScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 146. Potential path traversal vulnerability

- **File**: `src/screens/ShopScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 147. Potential path traversal vulnerability

- **File**: `src/screens/ShopScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 148. Potential path traversal vulnerability

- **File**: `src/screens/ShopScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 149. Potential path traversal vulnerability

- **File**: `src/screens/ShopScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 150. Potential path traversal vulnerability

- **File**: `src/screens/ShopScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 151. Potential path traversal vulnerability

- **File**: `src/screens/StaffQRScannerScreen.tsx:14`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 152. Potential path traversal vulnerability

- **File**: `src/screens/StaffQRScannerScreen.tsx:15`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 153. Potential path traversal vulnerability

- **File**: `src/screens/StaffQRScannerScreen.tsx:16`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 154. Potential path traversal vulnerability

- **File**: `src/screens/StaffQRScannerScreen.tsx:17`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 155. Potential path traversal vulnerability

- **File**: `src/screens/TestHubScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 156. Potential path traversal vulnerability

- **File**: `src/screens/TestHubScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 157. Potential path traversal vulnerability

- **File**: `src/screens/TestHubScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 158. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/CheckoutScreen.test.tsx:15`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 159. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/CheckoutScreen.test.tsx:15`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 160. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/CheckoutScreen.test.tsx:16`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 161. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/CheckoutScreen.test.tsx:17`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 162. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/CheckoutScreen.test.tsx:17`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 163. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/CheckoutScreen.test.tsx:20`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 164. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/CheckoutScreen.test.tsx:20`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 165. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 166. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 167. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 168. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 169. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 170. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 171. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 172. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:92`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 173. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:116`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 174. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:140`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 175. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:167`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 176. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:195`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 177. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:219`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 178. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:241`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 179. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:267`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 180. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:289`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 181. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:316`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 182. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:337`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 183. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:364`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 184. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:394`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 185. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:418`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 186. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:440`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 187. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:463`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 188. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/ProfileScreen.test.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 189. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/ProfileScreen.test.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 190. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/ProfileScreen.test.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 191. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/ProfileScreen.test.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 192. Potential path traversal vulnerability

- **File**: `src/screens/__tests__/ProfileScreen.test.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 193. Potential path traversal vulnerability

- **File**: `src/screens/index.ts:41`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 194. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AdminOrderTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 195. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AdminOrderTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 196. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AdminOrderTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 197. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AdminOrderTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 198. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 199. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 200. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 201. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 202. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 203. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 204. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 205. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 206. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 207. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 208. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:14`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 209. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:14`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 210. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:15`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 211. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:15`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 212. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:16`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 213. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:16`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 214. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BackendIntegrationTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 215. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BackendIntegrationTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 216. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BackendIntegrationTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 217. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BackendIntegrationTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 218. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BackendIntegrationTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 219. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BackendIntegrationTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 220. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BackendIntegrationTestScreen.tsx:14`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 221. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BackendIntegrationTestScreen.tsx:14`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 222. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BackendIntegrationTestScreen.tsx:15`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 223. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BackendIntegrationTestScreen.tsx:15`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 224. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BroadcastArchitectureTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 225. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BroadcastArchitectureTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 226. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BroadcastArchitectureTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 227. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BroadcastArchitectureTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 228. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BroadcastArchitectureTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 229. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/BroadcastArchitectureTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 230. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 231. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 232. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 233. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 234. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 235. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 236. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 237. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 238. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 239. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 240. Sensitive data logged to console

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:84`
- **Type**: data_exposure
- **Code**: `console.log('🧪 Testing Query Key Factory Integration...')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 241. Sensitive data logged to console

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:95`
- **Type**: data_exposure
- **Code**: `console.log('🧪 Testing User-Specific Query Keys...')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 242. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 243. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 244. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 245. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 246. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 247. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 248. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 249. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 250. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 251. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 252. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartSyncTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 253. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartSyncTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 254. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartSyncTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 255. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartSyncTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 256. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartSyncTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 257. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartSyncTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 258. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartSyncTestScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 259. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartSyncTestScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 260. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartSyncTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 261. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartSyncTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 262. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartSyncTestScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 263. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/CartSyncTestScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 264. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 265. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 266. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 267. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 268. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 269. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 270. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 271. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 272. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 273. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 274. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 275. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 276. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 277. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 278. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 279. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 280. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/DataLayerTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 281. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/DataLayerTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 282. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/DataLayerTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 283. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/DataLayerTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 284. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/DataLayerTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 285. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/DataLayerTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 286. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/DataLayerTestScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 287. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/DataLayerTestScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 288. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 289. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 290. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 291. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 292. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 293. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 294. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 295. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 296. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 297. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 298. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 299. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 300. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/HybridAuthTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 301. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/HybridAuthTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 302. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/HybridAuthTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 303. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/HybridAuthTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 304. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/HybridAuthTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 305. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/HybridAuthTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 306. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/HybridAuthTestScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 307. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/HybridAuthTestScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 308. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/OrderPlacementTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 309. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/OrderPlacementTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 310. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/OrderPlacementTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 311. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/OrderPlacementTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 312. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/OrderPlacementTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 313. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/OrderPlacementTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 314. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductCatalogTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 315. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductCatalogTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 316. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductCatalogTestScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 317. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductCatalogTestScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 318. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductCatalogTestScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 319. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductCatalogTestScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 320. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductCatalogTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 321. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductCatalogTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 322. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductCatalogTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 323. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductCatalogTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 324. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductDebugTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 325. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductDebugTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 326. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductDebugTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 327. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductDebugTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 328. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductDebugTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 329. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProductDebugTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 330. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProfileManagementTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 331. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProfileManagementTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 332. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProfileManagementTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 333. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProfileManagementTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 334. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProfileManagementTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 335. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/ProfileManagementTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 336. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/RealtimeDebugTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 337. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/RealtimeDebugTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 338. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/RealtimeTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 339. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/RealtimeTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 340. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/RealtimeTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 341. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/RealtimeTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 342. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/RealtimeTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 343. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/RealtimeTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 344. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/RealtimeTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 345. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/RealtimeTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 346. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/RealtimeTestScreen.tsx:51`
- **Type**: path_traversal
- **Code**: `..\`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 347. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/RealtimeTestScreen.tsx:78`
- **Type**: path_traversal
- **Code**: `..\`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 348. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/RealtimeTestScreen.tsx:90`
- **Type**: path_traversal
- **Code**: `..\`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 349. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/RealtimeTestScreen.tsx:106`
- **Type**: path_traversal
- **Code**: `..\`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 350. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/RealtimeTestScreen.tsx:119`
- **Type**: path_traversal
- **Code**: `..\`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 351. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 352. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 353. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 354. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 355. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 356. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 357. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 358. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 359. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 360. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 361. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 362. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 363. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 364. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 365. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 366. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 367. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SimpleBroadcastTest.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 368. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SimpleBroadcastTest.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 369. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 370. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 371. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 372. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 373. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 374. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 375. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/StockValidationTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 376. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/StockValidationTestScreen.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 377. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/StockValidationTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 378. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/StockValidationTestScreen.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 379. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 380. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 381. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 382. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 383. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 384. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:5`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 385. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 386. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 387. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 388. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 389. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 390. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 391. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 392. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 393. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/TestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 394. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/TestScreen.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 395. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/TestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 396. Potential path traversal vulnerability

- **File**: `src/screens/testScreens/TestScreen.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 397. Sensitive data logged to console

- **File**: `src/services/authService.ts:76`
- **Type**: data_exposure
- **Code**: `console.log('🔑 Attempting Supabase authentication...')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 398. Sensitive data logged to console

- **File**: `src/services/authService.ts:276`
- **Type**: data_exposure
- **Code**: `console.log('🧹 Local tokens cleared')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 399. Potential path traversal vulnerability

- **File**: `src/services/authService.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 400. Potential path traversal vulnerability

- **File**: `src/services/authService.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 401. Sensitive data logged to console

- **File**: `src/services/cartService.ts:106`
- **Type**: data_exposure
- **Code**: `console.log('👤 User auth status:', user ? 'authenticated' : 'not authenticated')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 402. Sensitive data logged to console

- **File**: `src/services/cartService.ts:109`
- **Type**: data_exposure
- **Code**: `console.log('🚫 User not authenticated, returning empty cart')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 403. Sensitive data logged to console

- **File**: `src/services/cartService.ts:150`
- **Type**: data_exposure
- **Code**: `console.log('🚫 User not authenticated, cannot save cart to Supabase')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 404. Potential path traversal vulnerability

- **File**: `src/services/cartService.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 405. Potential path traversal vulnerability

- **File**: `src/services/cartService.ts:2`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 406. Potential path traversal vulnerability

- **File**: `src/services/cartService.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 407. Potential path traversal vulnerability

- **File**: `src/services/errorRecoveryService.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 408. Potential path traversal vulnerability

- **File**: `src/services/errorRecoveryService.ts:2`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 409. Potential path traversal vulnerability

- **File**: `src/services/noShowHandlingService.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 410. Potential path traversal vulnerability

- **File**: `src/services/noShowHandlingService.ts:2`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 411. Potential path traversal vulnerability

- **File**: `src/services/notificationService.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 412. Potential path traversal vulnerability

- **File**: `src/services/notificationService.ts:2`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 413. Potential path traversal vulnerability

- **File**: `src/services/orderService.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 414. Potential path traversal vulnerability

- **File**: `src/services/orderService.ts:2`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 415. Potential path traversal vulnerability

- **File**: `src/services/orderService.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 416. Potential path traversal vulnerability

- **File**: `src/services/pickupReschedulingService.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 417. Potential path traversal vulnerability

- **File**: `src/services/pickupReschedulingService.ts:2`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 418. Potential path traversal vulnerability

- **File**: `src/services/pickupReschedulingService.ts:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 419. Potential path traversal vulnerability

- **File**: `src/services/productService.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 420. Potential path traversal vulnerability

- **File**: `src/services/productService.ts:2`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 421. Potential path traversal vulnerability

- **File**: `src/services/productService.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 422. Potential path traversal vulnerability

- **File**: `src/services/productService.ts:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 423. Potential path traversal vulnerability

- **File**: `src/services/realtimeService.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 424. Potential path traversal vulnerability

- **File**: `src/services/realtimeService.ts:2`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 425. Potential path traversal vulnerability

- **File**: `src/services/realtimeService.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 426. Potential path traversal vulnerability

- **File**: `src/services/realtimeService.ts:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 427. Potential path traversal vulnerability

- **File**: `src/services/stockRestorationService.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 428. Potential path traversal vulnerability

- **File**: `src/services/stockRestorationService.ts:2`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 429. Potential path traversal vulnerability

- **File**: `src/services/stockRestorationService.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 430. Sensitive data logged to console

- **File**: `src/services/tokenService.ts:103`
- **Type**: data_exposure
- **Code**: `console.log('🧹 Starting aggressive token cleanup...')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 431. Sensitive data logged to console

- **File**: `src/services/tokenService.ts:111`
- **Type**: data_exposure
- **Code**: `console.log('⚠️ Access token cleanup:', e.message)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 432. Sensitive data logged to console

- **File**: `src/services/tokenService.ts:114`
- **Type**: data_exposure
- **Code**: `console.log('⚠️ Refresh token cleanup:', e.message)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 433. Sensitive data stored in AsyncStorage without encryption

- **File**: `src/services/tokenService.ts:24`
- **Type**: insecure_storage
- **Code**: `AsyncStorage.setItem(ACCESS_TOKEN_KEY, token)`
- **Recommendation**: Use secure storage solutions like Keychain (iOS) or Keystore (Android)

### 434. Sensitive data stored in AsyncStorage without encryption

- **File**: `src/services/tokenService.ts:50`
- **Type**: insecure_storage
- **Code**: `AsyncStorage.setItem(REFRESH_TOKEN_KEY, token)`
- **Recommendation**: Use secure storage solutions like Keychain (iOS) or Keystore (Android)

### 435. Sensitive data stored in AsyncStorage without encryption

- **File**: `src/services/tokenService.ts:77`
- **Type**: insecure_storage
- **Code**: `AsyncStorage.setItem(USER_KEY, userJson)`
- **Recommendation**: Use secure storage solutions like Keychain (iOS) or Keystore (Android)

### 436. Sensitive data logged to console

- **File**: `src/test/AutomatedTestRunner.tsx:163`
- **Type**: data_exposure
- **Code**: `console.log('Cart clear requires authentication (expected with new Supabase-only architecture)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 437. Potential path traversal vulnerability

- **File**: `src/test/AutomatedTestRunner.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 438. Potential path traversal vulnerability

- **File**: `src/test/AutomatedTestRunner.tsx:14`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 439. Potential path traversal vulnerability

- **File**: `src/test/AutomatedTestRunner.tsx:15`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 440. Potential path traversal vulnerability

- **File**: `src/test/AutomatedTestRunner.tsx:16`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 441. Potential path traversal vulnerability

- **File**: `src/test/AutomatedTestRunner.tsx:17`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 442. Potential path traversal vulnerability

- **File**: `src/test/AutomatedTestRunner.tsx:153`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 443. Potential path traversal vulnerability

- **File**: `src/test/AutomatedTestRunner.tsx:196`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 444. Potential path traversal vulnerability

- **File**: `src/test/testUtils.tsx:6`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 445. Potential path traversal vulnerability

- **File**: `src/tests/AtomicOrderTest.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 446. Potential path traversal vulnerability

- **File**: `src/tests/AtomicOrderTest.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 447. Potential path traversal vulnerability

- **File**: `src/tests/CartRPCTest.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 448. Potential path traversal vulnerability

- **File**: `src/tests/SchemaInspector.tsx:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 449. Potential path traversal vulnerability

- **File**: `src/tests/SchemaInspector.tsx:4`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 450. Potential path traversal vulnerability

- **File**: `src/tests/SchemaInspector.tsx:12`
- **Type**: path_traversal
- **Code**: `..\`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 451. Potential path traversal vulnerability

- **File**: `src/tests/SimpleStockValidationTest.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 452. Potential path traversal vulnerability

- **File**: `src/tests/SimpleStockValidationTest.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 453. Potential path traversal vulnerability

- **File**: `src/tests/SimpleStockValidationTest.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 454. Potential path traversal vulnerability

- **File**: `src/tests/atomicOperations.test.ts:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 455. Potential path traversal vulnerability

- **File**: `src/tests/atomicOperations.test.ts:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 456. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 457. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 458. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 459. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:13`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 460. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:14`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 461. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:15`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 462. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:16`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 463. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:17`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 464. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:20`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 465. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:21`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 466. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:22`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 467. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:23`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 468. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:102`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 469. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:133`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 470. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:191`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 471. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:229`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 472. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:291`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 473. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:323`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 474. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:351`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 475. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:397`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 476. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:428`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 477. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:462`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 478. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:528`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 479. Potential path traversal vulnerability

- **File**: `src/tests/reactQueryHooks.test.tsx:590`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 480. Potential path traversal vulnerability

- **File**: `src/tests/rpcFunctions.test.ts:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 481. Potential path traversal vulnerability

- **File**: `src/tests/rpcFunctions.test.ts:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 482. Potential path traversal vulnerability

- **File**: `src/tests/services.test.ts:7`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 483. Potential path traversal vulnerability

- **File**: `src/tests/services.test.ts:8`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 484. Potential path traversal vulnerability

- **File**: `src/tests/services.test.ts:9`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 485. Potential path traversal vulnerability

- **File**: `src/tests/services.test.ts:10`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 486. Potential path traversal vulnerability

- **File**: `src/tests/services.test.ts:11`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 487. Potential path traversal vulnerability

- **File**: `src/tests/services.test.ts:12`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 488. Potential path traversal vulnerability

- **File**: `src/tests/services.test.ts:15`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 489. Potential path traversal vulnerability

- **File**: `src/tests/services.test.ts:36`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 490. Potential path traversal vulnerability

- **File**: `src/tests/services.test.ts:467`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 491. Sensitive data logged to console

- **File**: `src/utils/broadcastFactory.ts:56`
- **Type**: data_exposure
- **Code**: `console.log('🔐 Cryptographic channel security enabled with 256-bit key')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 492. Potential path traversal vulnerability

- **File**: `src/utils/broadcastFactory.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 493. Potential path traversal vulnerability

- **File**: `src/utils/broadcastHelper.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 494. Potential path traversal vulnerability

- **File**: `src/utils/channelManager.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 495. Sensitive data logged to console

- **File**: `src/utils/queryKeyFactory.ts:134`
- **Type**: data_exposure
- **Code**: `console.log(`✅ Invalidated ${entity} query key:`, key)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 496. Sensitive data logged to console

- **File**: `src/utils/queryKeyFactory.ts:145`
- **Type**: data_exposure
- **Code**: `console.log(`✅ Retry successful for ${entity} query key:`, key)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 497. Sensitive data logged to console

- **File**: `src/utils/realtimeDiagnostic.ts:20`
- **Type**: data_exposure
- **Code**: `console.log('✅ Supabase connection OK, session:', session ? 'authenticated' : 'anonymous')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 498. Potential path traversal vulnerability

- **File**: `src/utils/realtimeDiagnostic.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 499. Potential path traversal vulnerability

- **File**: `src/utils/realtimeDiagnostic.ts:3`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 500. Potential path traversal vulnerability

- **File**: `src/utils/schemaIntrospection.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

### 501. Potential path traversal vulnerability

- **File**: `src/utils/stockDisplay.ts:1`
- **Type**: path_traversal
- **Code**: `../`
- **Recommendation**: Use safe path manipulation functions and validate file paths

## 🟡 MEDIUM Issues (1270)

### 1. Weak cryptographic algorithm detected

- **File**: `.windsurf/workflows/intelligent-delegation.js:35`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 2. Weak cryptographic algorithm detected

- **File**: `.windsurf/workflows/intelligent-delegation.js:38`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 3. Weak cryptographic algorithm detected

- **File**: `.windsurf/workflows/intelligent-delegation.js:49`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 4. Weak cryptographic algorithm detected

- **File**: `.windsurf/workflows/intelligent-delegation.js:66`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 5. Weak cryptographic algorithm detected

- **File**: `.windsurf/workflows/smart-delegation.json:23`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 6. Weak cryptographic algorithm detected

- **File**: `app.config.js:45`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 7. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:11`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 8. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:32`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 9. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:94`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 10. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:135`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 11. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:135`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 12. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:139`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 13. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:145`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 14. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:145`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 15. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:149`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 16. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:155`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 17. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:155`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 18. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:159`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 19. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:165`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 20. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:165`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 21. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:169`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 22. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:175`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 23. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:175`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 24. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:179`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 25. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:191`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 26. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:191`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 27. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:195`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 28. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:201`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 29. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:201`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 30. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:205`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 31. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:211`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 32. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:215`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 33. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:221`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 34. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:221`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 35. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:225`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 36. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:237`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 37. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:237`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 38. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:241`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 39. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:247`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 40. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:247`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 41. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:251`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 42. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:257`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 43. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:257`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 44. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:261`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 45. Weak cryptographic algorithm detected

- **File**: `automation/audit-services.ts:368`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 46. Weak cryptographic algorithm detected

- **File**: `automation/config.json:5`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 47. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:11`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 48. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:123`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 49. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:123`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 50. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:125`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 51. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:125`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 52. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:127`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 53. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:127`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 54. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:129`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 55. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:129`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 56. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:144`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 57. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:144`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 58. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:151`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 59. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:168`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 60. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:180`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 61. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:191`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 62. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:202`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 63. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:202`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 64. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:213`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 65. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:222`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 66. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:231`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 67. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:231`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 68. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:240`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 69. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:249`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 70. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:300`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 71. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:369`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 72. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:465`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 73. Weak cryptographic algorithm detected

- **File**: `automation/pattern-fixer.ts:479`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 74. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:11`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 75. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:31`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 76. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:51`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 77. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:71`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 78. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:91`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 79. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:111`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 80. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:131`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 81. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:151`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 82. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:171`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 83. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:191`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 84. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:211`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 85. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:231`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 86. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:251`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 87. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:272`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 88. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:293`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 89. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:314`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 90. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:335`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 91. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:356`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 92. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:377`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 93. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:398`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 94. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:419`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 95. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:440`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 96. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:461`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 97. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:482`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 98. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:510`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 99. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:524`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 100. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:546`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 101. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:566`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 102. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:586`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 103. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:600`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 104. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:614`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 105. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:628`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 106. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:642`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 107. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:656`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 108. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:676`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 109. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:696`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 110. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:716`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 111. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:736`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 112. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:756`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 113. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:776`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 114. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:796`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 115. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:816`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 116. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:836`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 117. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:856`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 118. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:876`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 119. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:896`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 120. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:911`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 121. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:926`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 122. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:941`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 123. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:962`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 124. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:983`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 125. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1004`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 126. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1025`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 127. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1046`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 128. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1067`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 129. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1088`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 130. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1109`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 131. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1130`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 132. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1151`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 133. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1172`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 134. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1200`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 135. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1220`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 136. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1240`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 137. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1254`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 138. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1268`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 139. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1282`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 140. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1296`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 141. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1310`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 142. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1330`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 143. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1350`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 144. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1370`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 145. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1390`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 146. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1410`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 147. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1430`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 148. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1450`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 149. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1470`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 150. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1490`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 151. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1510`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 152. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1530`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 153. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1550`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 154. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1570`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 155. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1590`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 156. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1604`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 157. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1618`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 158. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1632`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 159. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1646`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 160. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1660`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 161. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1680`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 162. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1700`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 163. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1720`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 164. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1740`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 165. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1760`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 166. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1780`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 167. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1800`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 168. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1820`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 169. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1840`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 170. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1860`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 171. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1880`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 172. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1900`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 173. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1920`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 174. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1940`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 175. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1954`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 176. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1968`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 177. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1982`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 178. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:1996`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 179. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2010`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 180. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2030`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 181. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2050`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 182. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2070`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 183. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2090`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 184. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2110`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 185. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2130`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 186. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2150`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 187. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2170`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 188. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2190`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 189. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2210`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 190. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2230`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 191. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2250`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 192. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2270`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 193. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2290`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 194. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2310`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 195. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2330`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 196. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2350`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 197. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2370`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 198. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2390`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 199. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2410`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 200. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2430`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 201. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2450`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 202. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2470`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 203. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2490`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 204. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2510`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 205. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2530`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 206. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2550`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 207. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2570`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 208. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2590`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 209. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2610`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 210. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2630`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 211. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2650`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 212. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2670`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 213. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2690`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 214. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2710`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 215. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2730`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 216. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2745`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 217. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2760`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 218. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2775`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 219. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2796`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 220. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2817`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 221. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2838`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 222. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2859`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 223. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2880`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 224. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2901`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 225. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2922`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 226. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2943`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 227. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2964`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 228. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:2985`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 229. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3006`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 230. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3027`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 231. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3042`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 232. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3057`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 233. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3072`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 234. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3093`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 235. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3114`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 236. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3135`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 237. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3156`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 238. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3177`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 239. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3198`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 240. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3219`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 241. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3240`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 242. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3261`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 243. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3282`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 244. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3303`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 245. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3324`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 246. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3339`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 247. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3354`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 248. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3369`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 249. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3390`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 250. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3411`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 251. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3432`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 252. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3453`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 253. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3474`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 254. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3495`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 255. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3516`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 256. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3537`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 257. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3558`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 258. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3579`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 259. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3600`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 260. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3628`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 261. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3648`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 262. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3668`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 263. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3688`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 264. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3708`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 265. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3728`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 266. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3748`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 267. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3775`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 268. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3795`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 269. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3815`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 270. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3835`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 271. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3855`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 272. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3875`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 273. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3895`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 274. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3915`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 275. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3935`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 276. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3955`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 277. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3975`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 278. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:3995`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 279. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4015`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 280. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4035`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 281. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4055`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 282. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4075`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 283. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4095`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 284. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4115`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 285. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4135`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 286. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4155`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 287. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4175`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 288. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4195`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 289. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4215`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 290. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4235`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 291. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4255`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 292. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4269`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 293. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4289`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 294. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4309`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 295. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4329`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 296. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4349`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 297. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4369`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 298. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4389`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 299. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4409`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 300. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4429`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 301. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4449`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 302. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4469`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 303. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4489`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 304. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4509`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 305. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4523`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 306. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4543`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 307. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4563`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 308. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4583`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 309. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4603`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 310. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4623`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 311. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4643`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 312. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4663`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 313. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4683`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 314. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4703`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 315. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4723`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 316. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4743`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 317. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4763`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 318. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4777`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 319. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4791`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 320. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4811`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 321. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4831`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 322. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4851`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 323. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4871`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 324. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4891`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 325. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4911`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 326. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4931`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 327. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4951`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 328. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4971`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 329. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:4991`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 330. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5011`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 331. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5031`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 332. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5045`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 333. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5065`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 334. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5085`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 335. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5105`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 336. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5125`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 337. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5145`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 338. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5165`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 339. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5185`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 340. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5205`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 341. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5225`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 342. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5245`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 343. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5265`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 344. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5285`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 345. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5299`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 346. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5319`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 347. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5339`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 348. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5359`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 349. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5379`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 350. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5399`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 351. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5419`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 352. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5439`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 353. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5459`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 354. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5479`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 355. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5499`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 356. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5519`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 357. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5539`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 358. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5560`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 359. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5581`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 360. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5602`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 361. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5623`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 362. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5644`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 363. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5665`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 364. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5686`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 365. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5707`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 366. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5728`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 367. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5749`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 368. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5770`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 369. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5791`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 370. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5812`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 371. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5833`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 372. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5854`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 373. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5875`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 374. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5896`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 375. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5917`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 376. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5938`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 377. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5959`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 378. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:5980`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 379. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6001`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 380. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6022`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 381. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6043`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 382. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6058`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 383. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6079`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 384. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6100`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 385. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6121`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 386. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6142`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 387. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6163`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 388. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6184`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 389. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6205`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 390. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6226`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 391. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6247`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 392. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6268`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 393. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6289`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 394. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6310`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 395. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6325`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 396. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6346`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 397. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6367`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 398. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6388`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 399. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6409`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 400. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6430`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 401. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6451`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 402. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6472`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 403. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6493`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 404. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6514`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 405. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6535`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 406. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6556`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 407. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6577`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 408. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6592`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 409. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6607`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 410. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6628`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 411. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6649`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 412. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6670`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 413. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6691`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 414. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6712`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 415. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6733`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 416. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6754`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 417. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6775`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 418. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6796`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 419. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6817`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 420. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6838`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 421. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6859`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 422. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6874`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 423. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6895`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 424. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6916`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 425. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6937`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 426. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6958`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 427. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:6979`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 428. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7000`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 429. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7021`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 430. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7042`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 431. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7063`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 432. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7084`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 433. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7105`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 434. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7126`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 435. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7141`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 436. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7162`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 437. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7183`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 438. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7204`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 439. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7225`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 440. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7246`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 441. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7267`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 442. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7288`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 443. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7309`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 444. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7330`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 445. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7351`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 446. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7372`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 447. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7400`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 448. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7421`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 449. Weak cryptographic algorithm detected

- **File**: `automation/reports/schema-validation-2025-08-14T22-03-24-499Z.json:7435`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 450. Weak cryptographic algorithm detected

- **File**: `automation/reports/service-audit-2025-08-14T22-03-24-478Z.json:23`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 451. Weak cryptographic algorithm detected

- **File**: `automation/reports/service-audit-2025-08-14T22-03-24-478Z.json:29`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 452. Weak cryptographic algorithm detected

- **File**: `automation/reports/service-audit-2025-08-14T22-03-24-478Z.json:50`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 453. Weak cryptographic algorithm detected

- **File**: `automation/reports/service-audit-2025-08-14T22-03-24-478Z.json:64`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 454. Weak cryptographic algorithm detected

- **File**: `automation/reports/service-audit-2025-08-14T22-03-24-478Z.json:78`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 455. Weak cryptographic algorithm detected

- **File**: `automation/reports/service-audit-2025-08-14T22-03-24-478Z.json:84`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 456. Weak cryptographic algorithm detected

- **File**: `automation/reports/service-audit-2025-08-14T22-03-24-478Z.json:90`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 457. Weak cryptographic algorithm detected

- **File**: `automation/reports/service-audit-2025-08-14T22-03-24-478Z.json:96`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 458. Weak cryptographic algorithm detected

- **File**: `automation/reports/service-audit-2025-08-14T22-03-24-478Z.json:117`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 459. Weak cryptographic algorithm detected

- **File**: `automation/reports/service-audit-2025-08-14T22-03-24-478Z.json:131`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 460. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:46`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 461. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:52`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 462. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:73`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 463. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:87`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 464. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:101`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 465. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:107`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 466. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:113`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 467. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:119`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 468. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:140`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 469. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:154`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 470. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:178`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 471. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:198`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 472. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:218`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 473. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:238`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 474. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:258`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 475. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:278`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 476. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:298`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 477. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:318`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 478. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:338`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 479. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:358`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 480. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:378`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 481. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:398`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 482. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:418`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 483. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:439`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 484. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:460`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 485. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:481`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 486. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:502`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 487. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:523`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 488. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:544`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 489. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:565`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 490. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:586`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 491. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:607`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 492. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:628`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 493. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:649`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 494. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:677`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 495. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:691`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 496. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:713`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 497. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:733`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 498. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:753`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 499. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:767`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 500. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:781`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 501. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:795`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 502. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:809`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 503. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:823`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 504. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:843`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 505. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:863`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 506. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:883`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 507. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:903`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 508. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:923`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 509. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:943`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 510. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:963`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 511. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:983`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 512. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1003`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 513. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1023`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 514. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1043`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 515. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1063`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 516. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1078`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 517. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1093`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 518. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1108`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 519. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1129`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 520. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1150`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 521. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1171`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 522. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1192`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 523. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1213`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 524. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1234`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 525. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1255`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 526. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1276`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 527. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1297`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 528. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1318`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 529. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1339`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 530. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1367`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 531. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1387`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 532. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1407`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 533. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1421`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 534. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1435`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 535. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1449`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 536. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1463`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 537. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1477`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 538. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1497`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 539. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1517`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 540. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1537`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 541. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1557`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 542. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1577`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 543. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1597`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 544. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1617`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 545. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1637`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 546. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1657`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 547. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1677`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 548. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1697`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 549. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1717`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 550. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1737`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 551. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1757`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 552. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1771`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 553. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1785`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 554. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1799`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 555. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1813`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 556. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1827`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 557. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1847`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 558. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1867`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 559. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1887`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 560. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1907`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 561. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1927`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 562. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1947`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 563. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1967`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 564. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:1987`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 565. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2007`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 566. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2027`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 567. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2047`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 568. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2067`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 569. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2087`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 570. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2107`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 571. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2121`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 572. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2135`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 573. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2149`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 574. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2163`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 575. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2177`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 576. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2197`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 577. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2217`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 578. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2237`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 579. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2257`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 580. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2277`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 581. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2297`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 582. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2317`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 583. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2337`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 584. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2357`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 585. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2377`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 586. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2397`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 587. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2417`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 588. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2437`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 589. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2457`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 590. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2477`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 591. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2497`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 592. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2517`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 593. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2537`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 594. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2557`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 595. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2577`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 596. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2597`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 597. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2617`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 598. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2637`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 599. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2657`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 600. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2677`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 601. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2697`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 602. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2717`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 603. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2737`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 604. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2757`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 605. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2777`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 606. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2797`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 607. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2817`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 608. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2837`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 609. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2857`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 610. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2877`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 611. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2897`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 612. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2912`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 613. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2927`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 614. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2942`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 615. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2963`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 616. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:2984`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 617. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3005`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 618. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3026`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 619. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3047`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 620. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3068`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 621. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3089`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 622. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3110`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 623. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3131`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 624. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3152`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 625. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3173`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 626. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3194`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 627. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3209`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 628. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3224`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 629. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3239`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 630. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3260`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 631. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3281`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 632. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3302`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 633. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3323`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 634. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3344`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 635. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3365`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 636. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3386`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 637. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3407`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 638. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3428`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 639. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3449`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 640. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3470`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 641. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3491`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 642. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3506`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 643. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3521`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 644. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3536`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 645. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3557`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 646. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3578`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 647. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3599`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 648. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3620`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 649. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3641`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 650. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3662`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 651. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3683`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 652. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3704`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 653. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3725`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 654. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3746`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 655. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3767`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 656. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3795`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 657. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3815`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 658. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3835`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 659. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3855`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 660. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3875`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 661. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3895`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 662. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3915`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 663. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3942`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 664. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3962`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 665. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:3982`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 666. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4002`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 667. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4022`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 668. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4042`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 669. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4062`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 670. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4082`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 671. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4102`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 672. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4122`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 673. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4142`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 674. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4162`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 675. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4182`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 676. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4202`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 677. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4222`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 678. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4242`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 679. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4262`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 680. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4282`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 681. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4302`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 682. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4322`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 683. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4342`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 684. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4362`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 685. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4382`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 686. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4402`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 687. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4422`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 688. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4436`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 689. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4456`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 690. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4476`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 691. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4496`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 692. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4516`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 693. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4536`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 694. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4556`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 695. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4576`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 696. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4596`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 697. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4616`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 698. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4636`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 699. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4656`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 700. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4676`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 701. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4690`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 702. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4710`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 703. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4730`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 704. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4750`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 705. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4770`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 706. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4790`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 707. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4810`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 708. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4830`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 709. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4850`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 710. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4870`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 711. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4890`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 712. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4910`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 713. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4930`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 714. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4944`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 715. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4958`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 716. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4978`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 717. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:4998`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 718. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5018`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 719. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5038`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 720. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5058`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 721. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5078`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 722. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5098`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 723. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5118`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 724. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5138`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 725. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5158`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 726. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5178`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 727. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5198`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 728. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5212`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 729. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5232`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 730. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5252`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 731. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5272`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 732. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5292`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 733. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5312`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 734. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5332`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 735. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5352`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 736. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5372`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 737. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5392`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 738. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5412`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 739. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5432`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 740. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5452`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 741. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5466`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 742. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5486`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 743. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5506`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 744. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5526`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 745. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5546`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 746. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5566`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 747. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5586`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 748. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5606`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 749. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5626`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 750. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5646`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 751. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5666`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 752. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5686`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 753. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5706`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 754. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5727`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 755. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5748`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 756. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5769`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 757. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5790`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 758. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5811`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 759. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5832`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 760. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5853`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 761. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5874`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 762. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5895`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 763. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5916`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 764. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5937`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 765. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5958`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 766. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:5979`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 767. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6000`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 768. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6021`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 769. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6042`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 770. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6063`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 771. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6084`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 772. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6105`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 773. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6126`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 774. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6147`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 775. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6168`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 776. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6189`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 777. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6210`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 778. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6225`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 779. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6246`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 780. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6267`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 781. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6288`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 782. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6309`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 783. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6330`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 784. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6351`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 785. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6372`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 786. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6393`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 787. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6414`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 788. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6435`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 789. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6456`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 790. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6477`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 791. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6492`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 792. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6513`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 793. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6534`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 794. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6555`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 795. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6576`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 796. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6597`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 797. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6618`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 798. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6639`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 799. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6660`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 800. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6681`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 801. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6702`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 802. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6723`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 803. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6744`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 804. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6759`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 805. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6774`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 806. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6795`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 807. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6816`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 808. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6837`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 809. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6858`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 810. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6879`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 811. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6900`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 812. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6921`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 813. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6942`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 814. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6963`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 815. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:6984`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 816. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7005`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 817. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7026`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 818. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7041`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 819. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7062`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 820. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7083`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 821. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7104`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 822. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7125`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 823. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7146`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 824. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7167`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 825. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7188`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 826. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7209`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 827. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7230`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 828. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7251`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 829. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7272`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 830. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7293`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 831. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7308`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 832. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7329`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 833. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7350`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 834. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7371`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 835. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7392`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 836. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7413`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 837. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7434`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 838. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7455`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 839. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7476`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 840. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7497`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 841. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7518`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 842. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7539`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 843. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7567`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 844. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7588`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 845. Weak cryptographic algorithm detected

- **File**: `automation/reports/workflow-2025-08-14T22-03-24-504Z.json:7602`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 846. Weak cryptographic algorithm detected

- **File**: `automation/schema-validator.ts:26`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 847. Weak cryptographic algorithm detected

- **File**: `automation/schema-validator.ts:154`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 848. Weak cryptographic algorithm detected

- **File**: `automation/schema-validator.ts:159`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 849. Weak cryptographic algorithm detected

- **File**: `automation/schema-validator.ts:174`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 850. Weak cryptographic algorithm detected

- **File**: `automation/schema-validator.ts:204`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 851. Weak cryptographic algorithm detected

- **File**: `automation/schema-validator.ts:221`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 852. Weak cryptographic algorithm detected

- **File**: `automation/schema-validator.ts:365`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 853. Weak cryptographic algorithm detected

- **File**: `automation/schema-validator.ts:384`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 854. HTTP URL detected - should use HTTPS

- **File**: `automation/test-generator.ts:296`
- **Type**: insecure_transport
- **Code**: `'http://localhost:54321'`
- **Recommendation**: Use HTTPS for all network communications

### 855. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:152`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 856. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:174`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 857. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:191`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 858. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:214`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 859. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:224`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 860. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:257`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 861. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:291`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 862. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:300`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 863. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:320`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 864. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:345`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 865. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:363`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 866. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:392`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 867. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:420`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 868. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:441`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 869. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:472`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 870. Weak cryptographic algorithm detected

- **File**: `automation/test-generator.ts:490`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 871. Weak cryptographic algorithm detected

- **File**: `automation/workflow-runner.ts:39`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 872. Weak cryptographic algorithm detected

- **File**: `automation/workflow-runner.ts:54`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 873. Weak cryptographic algorithm detected

- **File**: `package-lock.json:937`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 874. Weak cryptographic algorithm detected

- **File**: `package-lock.json:939`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 875. Weak cryptographic algorithm detected

- **File**: `package-lock.json:939`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 876. Weak cryptographic algorithm detected

- **File**: `package-lock.json:1117`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 877. Weak cryptographic algorithm detected

- **File**: `package-lock.json:2840`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 878. Weak cryptographic algorithm detected

- **File**: `package-lock.json:4050`
- **Type**: weak_crypto
- **Code**: `DEs`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 879. Weak cryptographic algorithm detected

- **File**: `package-lock.json:5418`
- **Type**: weak_crypto
- **Code**: `DEs`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 880. Weak cryptographic algorithm detected

- **File**: `package-lock.json:5651`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 881. Weak cryptographic algorithm detected

- **File**: `package-lock.json:5653`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 882. Weak cryptographic algorithm detected

- **File**: `package-lock.json:5653`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 883. Weak cryptographic algorithm detected

- **File**: `package-lock.json:9032`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 884. Weak cryptographic algorithm detected

- **File**: `package-lock.json:10897`
- **Type**: weak_crypto
- **Code**: `dEs`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 885. Weak cryptographic algorithm detected

- **File**: `package-lock.json:11538`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 886. Weak cryptographic algorithm detected

- **File**: `package-lock.json:11678`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 887. Weak cryptographic algorithm detected

- **File**: `package-lock.json:13088`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 888. Weak cryptographic algorithm detected

- **File**: `package-lock.json:13106`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 889. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:26`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 890. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:31`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 891. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:36`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 892. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:41`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 893. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:46`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 894. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:53`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 895. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:58`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 896. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:63`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 897. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:68`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 898. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:73`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 899. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:78`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 900. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:83`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 901. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:90`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 902. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:95`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 903. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:102`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 904. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:107`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 905. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:112`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 906. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:119`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 907. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:126`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 908. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:131`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 909. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:210`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 910. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:215`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 911. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:215`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 912. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:220`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 913. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:225`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 914. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:230`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 915. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:230`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 916. Weak cryptographic algorithm detected

- **File**: `scripts/audit-react-query-hooks.ts:401`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 917. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:62`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 918. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:125`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 919. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:125`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 920. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:125`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 921. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:177`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 922. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:177`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 923. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:182`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 924. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:182`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 925. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:187`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 926. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:187`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 927. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:192`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 928. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:211`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 929. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:211`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 930. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:226`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 931. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:237`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 932. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:237`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 933. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:253`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 934. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:253`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 935. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:273`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 936. Weak cryptographic algorithm detected

- **File**: `scripts/audit-schema-mismatches.ts:273`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 937. Debug mode potentially enabled in production

- **File**: `scripts/security-audit.ts:137`
- **Type**: debug_exposure
- **Code**: `__DEV__`
- **Recommendation**: Ensure debug features are disabled in production builds

### 938. Debug mode potentially enabled in production

- **File**: `scripts/security-audit.ts:137`
- **Type**: debug_exposure
- **Code**: `.isDebuggingEnabled`
- **Recommendation**: Ensure debug features are disabled in production builds

### 939. Debug mode potentially enabled in production

- **File**: `scripts/security-audit.ts:137`
- **Type**: debug_exposure
- **Code**: `.enableDebugMode`
- **Recommendation**: Ensure debug features are disabled in production builds

### 940. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:145`
- **Type**: weak_crypto
- **Code**: `MD5`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 941. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:145`
- **Type**: weak_crypto
- **Code**: `SHA1`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 942. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:145`
- **Type**: weak_crypto
- **Code**: `SHA1`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 943. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:207`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 944. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:207`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 945. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:207`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 946. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:207`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 947. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:220`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 948. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:220`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 949. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:221`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 950. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:221`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 951. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:249`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 952. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:264`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 953. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:309`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 954. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:338`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 955. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:361`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 956. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:361`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 957. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:443`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 958. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:451`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 959. Weak cryptographic algorithm detected

- **File**: `scripts/security-audit.ts:453`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 960. Weak cryptographic algorithm detected

- **File**: `src/components/ProductCard.tsx:61`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 961. Weak cryptographic algorithm detected

- **File**: `src/components/ProductCard.tsx:62`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 962. Weak cryptographic algorithm detected

- **File**: `src/components/ProductCard.tsx:140`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 963. Weak cryptographic algorithm detected

- **File**: `src/config/supabase.ts:80`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 964. Weak cryptographic algorithm detected

- **File**: `src/config/supabase.ts:95`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 965. Weak cryptographic algorithm detected

- **File**: `src/config/supabase.ts:110`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 966. Weak cryptographic algorithm detected

- **File**: `src/data/mockProducts.ts:8`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 967. Weak cryptographic algorithm detected

- **File**: `src/data/mockProducts.ts:8`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 968. Weak cryptographic algorithm detected

- **File**: `src/data/mockProducts.ts:28`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 969. Weak cryptographic algorithm detected

- **File**: `src/data/mockProducts.ts:48`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 970. Weak cryptographic algorithm detected

- **File**: `src/data/mockProducts.ts:68`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 971. Weak cryptographic algorithm detected

- **File**: `src/data/mockProducts.ts:88`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 972. Weak cryptographic algorithm detected

- **File**: `src/data/mockProducts.ts:108`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 973. Weak cryptographic algorithm detected

- **File**: `src/data/mockProducts.ts:108`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 974. Weak cryptographic algorithm detected

- **File**: `src/data/mockProducts.ts:128`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 975. Weak cryptographic algorithm detected

- **File**: `src/data/mockProducts.ts:148`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 976. Weak cryptographic algorithm detected

- **File**: `src/data/mockProducts.ts:168`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 977. Weak cryptographic algorithm detected

- **File**: `src/data/mockProducts.ts:188`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 978. Weak cryptographic algorithm detected

- **File**: `src/hooks/useAuth.ts:213`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 979. Weak cryptographic algorithm detected

- **File**: `src/hooks/useOrders.ts:189`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 980. Weak cryptographic algorithm detected

- **File**: `src/hooks/useOrders.ts:200`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 981. Weak cryptographic algorithm detected

- **File**: `src/hooks/useOrders.ts:217`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 982. Weak cryptographic algorithm detected

- **File**: `src/hooks/useOrders.ts:224`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 983. Weak cryptographic algorithm detected

- **File**: `src/hooks/useOrders.ts:230`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 984. Sensitive data exposed in alert

- **File**: `src/screens/AdminOrderScreen.tsx:47`
- **Type**: data_exposure
- **Code**: `alert('Error', 'Failed to update order status')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 985. Sensitive data exposed in alert

- **File**: `src/screens/AdminOrderScreen.tsx:70`
- **Type**: data_exposure
- **Code**: `alert('Error', 'Failed to update orders')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 986. Weak cryptographic algorithm detected

- **File**: `src/screens/AdminOrderScreen.tsx:80`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 987. Weak cryptographic algorithm detected

- **File**: `src/screens/AdminOrderScreen.tsx:116`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 988. Sensitive data exposed in alert

- **File**: `src/screens/CheckoutScreen.tsx:314`
- **Type**: data_exposure
- **Code**: `alert(
        'Please Complete Required Fields',
        `• ${errorText}`,
        [{ text: 'OK', style: 'default' }]
      )`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 989. Sensitive data exposed in alert

- **File**: `src/screens/LoginScreen.tsx:47`
- **Type**: data_exposure
- **Code**: `alert('Login Failed', 'Invalid email or password')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 990. Sensitive data exposed in alert

- **File**: `src/screens/MyOrdersScreen.tsx:163`
- **Type**: data_exposure
- **Code**: `alert('Error', 'Failed to reschedule pickup. Please try again.')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 991. Weak cryptographic algorithm detected

- **File**: `src/screens/MyOrdersScreen.tsx:98`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 992. Weak cryptographic algorithm detected

- **File**: `src/screens/MyOrdersScreen.tsx:102`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 993. Weak cryptographic algorithm detected

- **File**: `src/screens/MyOrdersScreen.tsx:106`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 994. Weak cryptographic algorithm detected

- **File**: `src/screens/MyOrdersScreen.tsx:167`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 995. Weak cryptographic algorithm detected

- **File**: `src/screens/MyOrdersScreen.tsx:168`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 996. Weak cryptographic algorithm detected

- **File**: `src/screens/MyOrdersScreen.tsx:213`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 997. Weak cryptographic algorithm detected

- **File**: `src/screens/MyOrdersScreen.tsx:213`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 998. Weak cryptographic algorithm detected

- **File**: `src/screens/MyOrdersScreen.tsx:234`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 999. Weak cryptographic algorithm detected

- **File**: `src/screens/MyOrdersScreen.tsx:236`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1000. Weak cryptographic algorithm detected

- **File**: `src/screens/MyOrdersScreen.tsx:236`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1001. Weak cryptographic algorithm detected

- **File**: `src/screens/MyOrdersScreen.tsx:588`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1002. Weak cryptographic algorithm detected

- **File**: `src/screens/MyOrdersScreen.tsx:592`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1003. Sensitive data exposed in alert

- **File**: `src/screens/ProductDetailScreen.tsx:84`
- **Type**: data_exposure
- **Code**: `alert('Error', 'Failed to add item to cart. Please try again.')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1004. Weak cryptographic algorithm detected

- **File**: `src/screens/ProductDetailScreen.tsx:167`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1005. Weak cryptographic algorithm detected

- **File**: `src/screens/ProductDetailScreen.tsx:169`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1006. Weak cryptographic algorithm detected

- **File**: `src/screens/ProductDetailScreen.tsx:171`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1007. Weak cryptographic algorithm detected

- **File**: `src/screens/ProductDetailScreen.tsx:172`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1008. Weak cryptographic algorithm detected

- **File**: `src/screens/ProductDetailScreen.tsx:252`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1009. Weak cryptographic algorithm detected

- **File**: `src/screens/ProductDetailScreen.tsx:259`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1010. Sensitive data exposed in alert

- **File**: `src/screens/ProfileScreen.tsx:130`
- **Type**: data_exposure
- **Code**: `alert('Error', 'Failed to update profile')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1011. Sensitive data exposed in alert

- **File**: `src/screens/ProfileScreen.tsx:149`
- **Type**: data_exposure
- **Code**: `alert('Success', 'Password changed successfully')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1012. Sensitive data exposed in alert

- **File**: `src/screens/ProfileScreen.tsx:152`
- **Type**: data_exposure
- **Code**: `alert('Error', error.message || 'Failed to change password')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1013. Sensitive data exposed in alert

- **File**: `src/screens/ProfileScreen.tsx:202`
- **Type**: data_exposure
- **Code**: `alert('Error', 'Failed to sign out. Please try again.')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1014. Weak cryptographic algorithm detected

- **File**: `src/screens/ProfileScreen.tsx:66`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1015. Weak cryptographic algorithm detected

- **File**: `src/screens/ProfileScreen.tsx:186`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1016. Weak cryptographic algorithm detected

- **File**: `src/screens/ProfileScreen.tsx:427`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1017. Weak cryptographic algorithm detected

- **File**: `src/screens/ProfileScreen.tsx:534`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1018. Sensitive data exposed in alert

- **File**: `src/screens/ShopScreen.tsx:94`
- **Type**: data_exposure
- **Code**: `alert(
        'Error',
        'Failed to add item to cart. Please try again.',
        [{ text: 'OK' }]
      )`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1019. Weak cryptographic algorithm detected

- **File**: `src/screens/ShopScreen.tsx:56`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1020. Weak cryptographic algorithm detected

- **File**: `src/screens/ShopScreen.tsx:57`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1021. Weak cryptographic algorithm detected

- **File**: `src/screens/ShopScreen.tsx:57`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1022. Weak cryptographic algorithm detected

- **File**: `src/screens/ShopScreen.tsx:58`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1023. Sensitive data exposed in alert

- **File**: `src/screens/StaffQRScannerScreen.tsx:101`
- **Type**: data_exposure
- **Code**: `alert('Error', result.message || 'Failed to update order status. Please try again.')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1024. Sensitive data exposed in alert

- **File**: `src/screens/StaffQRScannerScreen.tsx:104`
- **Type**: data_exposure
- **Code**: `alert('Error', 'Failed to update order status. Please try again.')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1025. Weak cryptographic algorithm detected

- **File**: `src/screens/StaffQRScannerScreen.tsx:11`
- **Type**: weak_crypto
- **Code**: `deS`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1026. Weak cryptographic algorithm detected

- **File**: `src/screens/StaffQRScannerScreen.tsx:55`
- **Type**: weak_crypto
- **Code**: `deS`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1027. Weak cryptographic algorithm detected

- **File**: `src/screens/StaffQRScannerScreen.tsx:158`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1028. Weak cryptographic algorithm detected

- **File**: `src/screens/StaffQRScannerScreen.tsx:171`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1029. Weak cryptographic algorithm detected

- **File**: `src/screens/StaffQRScannerScreen.tsx:202`
- **Type**: weak_crypto
- **Code**: `deS`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1030. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:15`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1031. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:29`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1032. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:37`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1033. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:45`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1034. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:53`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1035. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:61`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1036. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:69`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1037. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:77`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1038. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:85`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1039. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:93`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1040. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:101`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1041. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:109`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1042. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:117`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1043. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:125`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1044. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:144`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1045. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:152`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1046. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:160`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1047. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:168`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1048. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:225`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1049. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:226`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1050. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:279`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1051. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:328`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1052. Weak cryptographic algorithm detected

- **File**: `src/screens/TestHubScreen.tsx:360`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1053. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/CheckoutScreen.test.tsx:39`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1054. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/CheckoutScreen.test.tsx:72`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1055. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/CheckoutScreen.test.tsx:149`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1056. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/CheckoutScreen.test.tsx:204`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1057. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/CheckoutScreen.test.tsx:272`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1058. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/CheckoutScreen.test.tsx:297`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1059. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/CheckoutScreen.test.tsx:383`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1060. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/CheckoutScreen.test.tsx:411`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1061. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:35`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1062. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:39`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1063. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:59`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1064. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:76`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1065. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:254`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1066. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:349`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1067. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/OrderConfirmationScreen.test.tsx:427`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1068. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/ProfileScreen.test.tsx:22`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1069. Weak cryptographic algorithm detected

- **File**: `src/screens/__tests__/ProfileScreen.test.tsx:82`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1070. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/AdminOrderTestScreen.tsx:290`
- **Type**: data_exposure
- **Code**: `alert('Test Error', `Failed to run tests: ${error instanceof Error ? error.message : 'Unknown error'}`)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1071. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/AtomicOperationsTestScreen.tsx:295`
- **Type**: data_exposure
- **Code**: `alert('Test Error', `Failed to run tests: ${error}`)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1072. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/BackendIntegrationTestScreen.tsx:75`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1073. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/BackendIntegrationTestScreen.tsx:97`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1074. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/BackendIntegrationTestScreen.tsx:98`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1075. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/BroadcastArchitectureTestScreen.tsx:127`
- **Type**: data_exposure
- **Code**: `alert('Error', 'Please enter a test order ID')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1076. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/BroadcastArchitectureTestScreen.tsx:139`
- **Type**: data_exposure
- **Code**: `alert('Error', `Failed to send broadcast: ${error}`)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1077. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/BroadcastArchitectureTestScreen.tsx:152`
- **Type**: data_exposure
- **Code**: `alert('Error', `Failed to send broadcast: ${error}`)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1078. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/BroadcastArchitectureTestScreen.tsx:166`
- **Type**: data_exposure
- **Code**: `alert('Error', `Failed to send broadcast: ${error}`)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1079. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/BroadcastArchitectureTestScreen.tsx:180`
- **Type**: data_exposure
- **Code**: `alert('Error', `Failed to send broadcast: ${error}`)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1080. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:159`
- **Type**: data_exposure
- **Code**: `alert('Error', `Test failed: ${error}`)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1081. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:192`
- **Type**: data_exposure
- **Code**: `alert('Test Failed', 'Update quantity test encountered an error')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1082. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:223`
- **Type**: data_exposure
- **Code**: `alert('Test Failed', 'Remove item test encountered an error')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1083. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:255`
- **Type**: data_exposure
- **Code**: `alert('Test Failed', 'Cart total test encountered an error')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1084. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:266`
- **Type**: data_exposure
- **Code**: `alert('Test Failed', 'Clear cart test encountered an error')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1085. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:309`
- **Type**: data_exposure
- **Code**: `alert('Test Failed', 'Sequential test encountered an error')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1086. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:342`
- **Type**: data_exposure
- **Code**: `alert('Test Failed', 'Cart badge test encountered an error')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1087. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:373`
- **Type**: data_exposure
- **Code**: `alert('Test Failed', 'Duplicate item test encountered an error')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1088. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:75`
- **Type**: data_exposure
- **Code**: `alert('Error', 'Please log in to run tests')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1089. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:184`
- **Type**: data_exposure
- **Code**: `alert('Test Error', `Test execution failed: ${error}`)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1090. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:99`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1091. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:99`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1092. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:100`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1093. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:138`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1094. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:166`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1095. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/CartSyncTestScreen.tsx:14`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1096. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:50`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1097. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:63`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1098. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:134`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1099. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:59`
- **Type**: data_exposure
- **Code**: `alert('Test Failed', 'Category filtering test encountered an error')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1100. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:89`
- **Type**: data_exposure
- **Code**: `alert('Test Failed', 'Enhanced search test encountered an error')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1101. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:123`
- **Type**: data_exposure
- **Code**: `alert('Test Failed', 'Product sorting test encountered an error')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1102. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:156`
- **Type**: data_exposure
- **Code**: `alert('Test Failed', 'Category navigation test encountered an error')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1103. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:198`
- **Type**: data_exposure
- **Code**: `alert('Test Failed', 'Product data integrity test encountered an error')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1104. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:234`
- **Type**: data_exposure
- **Code**: `alert('Test Failed', 'Combined operations test encountered an error')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1105. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:71`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1106. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:72`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1107. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:72`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1108. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:73`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1109. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCatalogTestScreen.tsx:74`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1110. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:27`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1111. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:38`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1112. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:540`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1113. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:633`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1114. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:634`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1115. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:635`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1116. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:636`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1117. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:641`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1118. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:642`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1119. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:643`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1120. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:644`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1121. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:649`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1122. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:650`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1123. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:651`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1124. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:656`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1125. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:657`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1126. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:658`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1127. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:659`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1128. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/EnhancedCheckoutTestScreen.tsx:773`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1129. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/HybridAuthTestScreen.tsx:49`
- **Type**: data_exposure
- **Code**: `alert('Test Error', `An error occurred during testing: ${error}`)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1130. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/HybridAuthTestScreen.tsx:68`
- **Type**: data_exposure
- **Code**: `alert('❌ Login Test', `Login failed: ${error}`)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1131. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/HybridAuthTestScreen.tsx:99`
- **Type**: data_exposure
- **Code**: `alert('❌ Profile Update Test', `Profile update failed: ${error}`)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1132. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/HybridAuthTestScreen.tsx:118`
- **Type**: data_exposure
- **Code**: `alert('❌ Logout Test', `Logout failed: ${error}`)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1133. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/HybridAuthTestScreen.tsx:124`
- **Type**: data_exposure
- **Code**: `alert(
      '🔄 Infinite Render Loop Test',
      'Navigate to the Profile screen and try signing out. If no "maximum update depth exceeded" error occurs, the fix is working!',
      [
        { text: 'OK', style: 'default' }
      ]
    )`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1134. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/OrderPlacementTestScreen.tsx:37`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1135. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/OrderPlacementTestScreen.tsx:48`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1136. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/ProductCatalogTestScreen.tsx:73`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1137. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/ProductCatalogTestScreen.tsx:78`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1138. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/ProfileManagementTestScreen.tsx:96`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1139. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/ProfileManagementTestScreen.tsx:145`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1140. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/ProfileManagementTestScreen.tsx:194`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1141. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/ProfileManagementTestScreen.tsx:245`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1142. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/ProfileManagementTestScreen.tsx:295`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1143. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/ProfileManagementTestScreen.tsx:345`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1144. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/ProfileManagementTestScreen.tsx:394`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1145. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/ProfileManagementTestScreen.tsx:490`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1146. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:54`
- **Type**: data_exposure
- **Code**: `alert('Error', 'Please log in to run security tests')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1147. Sensitive data exposed in alert

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:72`
- **Type**: data_exposure
- **Code**: `alert('Test Suite Error', `Failed to complete tests: ${error}`)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1148. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:104`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1149. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:105`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1150. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:106`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1151. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:139`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1152. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:160`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1153. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:161`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1154. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:162`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1155. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:302`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1156. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:384`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1157. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:110`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1158. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:116`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1159. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:122`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1160. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:128`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1161. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:134`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1162. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:139`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1163. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:140`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1164. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:172`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1165. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:178`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1166. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/StockValidationTestScreen.tsx:24`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1167. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/StockValidationTestScreen.tsx:35`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1168. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/StockValidationTestScreen.tsx:46`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1169. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/StockValidationTestScreen.tsx:61`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1170. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:71`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1171. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:153`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1172. Weak cryptographic algorithm detected

- **File**: `src/screens/testScreens/TestScreen.tsx:40`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1173. Weak cryptographic algorithm detected

- **File**: `src/services/authService.ts:54`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1174. Weak cryptographic algorithm detected

- **File**: `src/services/authService.ts:167`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1175. Weak cryptographic algorithm detected

- **File**: `src/services/authService.ts:358`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1176. Weak cryptographic algorithm detected

- **File**: `src/services/cartService.ts:74`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1177. Weak cryptographic algorithm detected

- **File**: `src/services/cartService.ts:74`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1178. Weak cryptographic algorithm detected

- **File**: `src/services/errorRecoveryService.ts:66`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1179. Weak cryptographic algorithm detected

- **File**: `src/services/pickupReschedulingService.ts:219`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1180. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:41`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1181. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:41`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1182. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:86`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1183. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:86`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1184. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:118`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1185. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:143`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1186. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:143`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1187. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:151`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1188. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:151`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1189. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:214`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1190. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:240`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1191. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:240`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1192. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:248`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1193. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:248`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1194. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:300`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1195. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:326`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1196. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:326`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1197. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:334`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1198. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:334`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1199. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:377`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1200. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:387`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1201. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:403`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1202. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:403`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1203. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:411`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1204. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:411`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1205. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:454`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1206. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:480`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1207. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:480`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1208. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:488`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1209. Weak cryptographic algorithm detected

- **File**: `src/services/productService.ts:488`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1210. Weak cryptographic algorithm detected

- **File**: `src/services/stockRestorationService.ts:217`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1211. Sensitive data exposed in alert

- **File**: `src/test/AutomatedTestRunner.tsx:1037`
- **Type**: data_exposure
- **Code**: `alert('Test Error', 'An error occurred while running tests')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1212. Sensitive data exposed in alert

- **File**: `src/test/AutomatedTestRunner.tsx:1077`
- **Type**: data_exposure
- **Code**: `alert('Error', 'Failed to copy results to clipboard')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1213. Weak cryptographic algorithm detected

- **File**: `src/test/AutomatedTestRunner.tsx:77`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1214. Weak cryptographic algorithm detected

- **File**: `src/test/AutomatedTestRunner.tsx:88`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1215. Weak cryptographic algorithm detected

- **File**: `src/test/AutomatedTestRunner.tsx:130`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1216. Weak cryptographic algorithm detected

- **File**: `src/test/AutomatedTestRunner.tsx:351`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1217. Weak cryptographic algorithm detected

- **File**: `src/test/AutomatedTestRunner.tsx:384`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1218. Weak cryptographic algorithm detected

- **File**: `src/test/AutomatedTestRunner.tsx:817`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1219. Weak cryptographic algorithm detected

- **File**: `src/test/AutomatedTestRunner.tsx:818`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1220. Weak cryptographic algorithm detected

- **File**: `src/test/AutomatedTestRunner.tsx:819`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1221. Weak cryptographic algorithm detected

- **File**: `src/test/AutomatedTestRunner.tsx:922`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1222. Weak cryptographic algorithm detected

- **File**: `src/test/AutomatedTestRunner.tsx:950`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1223. Weak cryptographic algorithm detected

- **File**: `src/test/AutomatedTestRunner.tsx:954`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1224. Weak cryptographic algorithm detected

- **File**: `src/test/AutomatedTestRunner.tsx:1144`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1225. Weak cryptographic algorithm detected

- **File**: `src/test/AutomatedTestRunner.tsx:1296`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1226. Sensitive data exposed in alert

- **File**: `src/test/logoutTest.js:76`
- **Type**: data_exposure
- **Code**: `alert('Error', 'Failed to sign out. Please try again.')`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1227. Weak cryptographic algorithm detected

- **File**: `src/test/logoutTest.js:69`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1228. Weak cryptographic algorithm detected

- **File**: `src/test/testUtils.tsx:59`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1229. Weak cryptographic algorithm detected

- **File**: `src/test/testUtils.tsx:62`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1230. Weak cryptographic algorithm detected

- **File**: `src/test/testUtils.tsx:69`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1231. Sensitive data exposed in alert

- **File**: `src/tests/AtomicOrderTest.tsx:376`
- **Type**: data_exposure
- **Code**: `alert('Test Error', `Failed to complete tests: ${error instanceof Error ? error.message : 'Unknown error'}`)`
- **Recommendation**: Remove sensitive data from logs and use secure logging practices

### 1232. Weak cryptographic algorithm detected

- **File**: `src/tests/AtomicOrderTest.tsx:56`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1233. Weak cryptographic algorithm detected

- **File**: `src/tests/atomicOperations.test.ts:23`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1234. Weak cryptographic algorithm detected

- **File**: `src/tests/atomicOperations.test.ts:29`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1235. Weak cryptographic algorithm detected

- **File**: `src/tests/atomicOperations.test.ts:186`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1236. Weak cryptographic algorithm detected

- **File**: `src/tests/atomicOperations.test.ts:226`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1237. Weak cryptographic algorithm detected

- **File**: `src/tests/atomicOperations.test.ts:285`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1238. Weak cryptographic algorithm detected

- **File**: `src/tests/atomicOperations.test.ts:333`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1239. Weak cryptographic algorithm detected

- **File**: `src/tests/reactQueryHooks.test.tsx:81`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1240. Weak cryptographic algorithm detected

- **File**: `src/tests/reactQueryHooks.test.tsx:83`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1241. Weak cryptographic algorithm detected

- **File**: `src/tests/reactQueryHooks.test.tsx:172`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1242. Weak cryptographic algorithm detected

- **File**: `src/tests/reactQueryHooks.test.tsx:270`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1243. Weak cryptographic algorithm detected

- **File**: `src/tests/reactQueryHooks.test.tsx:376`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1244. Weak cryptographic algorithm detected

- **File**: `src/tests/reactQueryHooks.test.tsx:485`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1245. Weak cryptographic algorithm detected

- **File**: `src/tests/reactQueryHooks.test.tsx:562`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1246. Weak cryptographic algorithm detected

- **File**: `src/tests/rpcFunctions.test.ts:51`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1247. Weak cryptographic algorithm detected

- **File**: `src/tests/rpcFunctions.test.ts:53`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1248. Weak cryptographic algorithm detected

- **File**: `src/tests/rpcFunctions.test.ts:147`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1249. Weak cryptographic algorithm detected

- **File**: `src/tests/rpcFunctions.test.ts:214`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1250. Weak cryptographic algorithm detected

- **File**: `src/tests/rpcFunctions.test.ts:277`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1251. Weak cryptographic algorithm detected

- **File**: `src/tests/rpcFunctions.test.ts:341`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1252. Weak cryptographic algorithm detected

- **File**: `src/tests/rpcFunctions.test.ts:394`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1253. Weak cryptographic algorithm detected

- **File**: `src/tests/services.test.ts:81`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1254. Weak cryptographic algorithm detected

- **File**: `src/tests/services.test.ts:87`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1255. Weak cryptographic algorithm detected

- **File**: `src/tests/services.test.ts:219`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1256. Weak cryptographic algorithm detected

- **File**: `src/tests/services.test.ts:341`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1257. Weak cryptographic algorithm detected

- **File**: `src/tests/services.test.ts:489`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1258. Weak cryptographic algorithm detected

- **File**: `src/tests/services.test.ts:617`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1259. Weak cryptographic algorithm detected

- **File**: `src/tests/services.test.ts:657`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1260. Weak cryptographic algorithm detected

- **File**: `src/tests/services.test.ts:721`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1261. Weak cryptographic algorithm detected

- **File**: `src/types/database.generated.ts:78`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1262. Weak cryptographic algorithm detected

- **File**: `src/types/database.generated.ts:88`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1263. Weak cryptographic algorithm detected

- **File**: `src/types/database.generated.ts:98`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1264. Weak cryptographic algorithm detected

- **File**: `src/types/database.generated.ts:637`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1265. Weak cryptographic algorithm detected

- **File**: `src/types/database.generated.ts:662`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1266. Weak cryptographic algorithm detected

- **File**: `src/types/database.generated.ts:687`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1267. Weak cryptographic algorithm detected

- **File**: `src/types/index.ts:59`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1268. Weak cryptographic algorithm detected

- **File**: `src/types/index.ts:71`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1269. Weak cryptographic algorithm detected

- **File**: `src/utils/broadcastFactory.ts:149`
- **Type**: weak_crypto
- **Code**: `des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

### 1270. Weak cryptographic algorithm detected

- **File**: `src/utils/theme.ts:1`
- **Type**: weak_crypto
- **Code**: `Des`
- **Recommendation**: Use strong cryptographic algorithms (AES-256, SHA-256+)

## 🔵 LOW Issues (78)

### 1. useEffect without dependencies array can cause security issues

- **File**: `App.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 2. Use of "any" type reduces type safety

- **File**: `automation/pattern-fixer.ts:76`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 3. Use of "any" type reduces type safety

- **File**: `automation/pattern-fixer.ts:111`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 4. Use of "any" type reduces type safety

- **File**: `automation/pattern-fixer.ts:122`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 5. Use of "any" type reduces type safety

- **File**: `automation/pattern-fixer.ts:252`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 6. Use of "any" type reduces type safety

- **File**: `automation/pattern-fixer.ts:257`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 7. Use of "any" type reduces type safety

- **File**: `automation/pattern-fixer.ts:291`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 8. Use of "any" type reduces type safety

- **File**: `automation/workflow-runner.ts:31`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 9. Use of "any" type reduces type safety

- **File**: `automation/workflow-runner.ts:175`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 10. Use of "any" type reduces type safety

- **File**: `automation/workflow-runner.ts:298`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 11. useEffect without dependencies array can cause security issues

- **File**: `src/components/Toast.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 12. Use of "any" type reduces type safety

- **File**: `src/data/mockProducts.ts:4`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 13. Use of "any" type reduces type safety

- **File**: `src/hooks/useCart.ts:188`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 14. Use of "any" type reduces type safety

- **File**: `src/hooks/useCart.ts:188`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 15. Use of "any" type reduces type safety

- **File**: `src/hooks/useCart.ts:188`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 16. Use of "any" type reduces type safety

- **File**: `src/hooks/useCentralizedRealtime.ts:12`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 17. Use of "any" type reduces type safety

- **File**: `src/hooks/useErrorRecovery.ts:45`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 18. Use of "any" type reduces type safety

- **File**: `src/hooks/useNoShowHandling.ts:24`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 19. Use of "any" type reduces type safety

- **File**: `src/hooks/useNoShowHandling.ts:26`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 20. Use of "any" type reduces type safety

- **File**: `src/hooks/useOrders.ts:196`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 21. Use of "any" type reduces type safety

- **File**: `src/hooks/useRealtime.ts:16`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 22. Use of "any" type reduces type safety

- **File**: `src/hooks/useStockValidation.ts:44`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 23. useEffect without dependencies array can cause security issues

- **File**: `src/screens/AdminOrderScreen.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 24. useEffect without dependencies array can cause security issues

- **File**: `src/screens/MetricsAnalyticsScreen.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 25. Use of "any" type reduces type safety

- **File**: `src/screens/ProfileScreen.tsx:151`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 26. useEffect without dependencies array can cause security issues

- **File**: `src/screens/ProfileScreen.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 27. useEffect without dependencies array can cause security issues

- **File**: `src/screens/StaffQRScannerScreen.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 28. Use of "any" type reduces type safety

- **File**: `src/screens/__tests__/ProfileScreen.test.tsx:95`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 29. Use of "any" type reduces type safety

- **File**: `src/screens/__tests__/ProfileScreen.test.tsx:113`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 30. Use of "any" type reduces type safety

- **File**: `src/screens/__tests__/ProfileScreen.test.tsx:136`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 31. Use of "any" type reduces type safety

- **File**: `src/screens/__tests__/ProfileScreen.test.tsx:165`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 32. useEffect without dependencies array can cause security issues

- **File**: `src/screens/testScreens/BroadcastArchitectureTestScreen.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 33. useEffect without dependencies array can cause security issues

- **File**: `src/screens/testScreens/CartFunctionalityTestScreen.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 34. useEffect without dependencies array can cause security issues

- **File**: `src/screens/testScreens/CartMigrationTestScreen.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 35. useEffect without dependencies array can cause security issues

- **File**: `src/screens/testScreens/CartSyncTestScreen.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 36. Use of "any" type reduces type safety

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:24`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 37. useEffect without dependencies array can cause security issues

- **File**: `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 38. useEffect without dependencies array can cause security issues

- **File**: `src/screens/testScreens/OrderPlacementTestScreen.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 39. useEffect without dependencies array can cause security issues

- **File**: `src/screens/testScreens/RealtimeDebugTestScreen.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 40. useEffect without dependencies array can cause security issues

- **File**: `src/screens/testScreens/RealtimeTestScreen.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 41. useEffect without dependencies array can cause security issues

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 42. useEffect without dependencies array can cause security issues

- **File**: `src/screens/testScreens/SimpleBroadcastTest.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 43. useEffect without dependencies array can cause security issues

- **File**: `src/screens/testScreens/SyncDebugTestScreen.tsx:1`
- **Type**: react_security
- **Recommendation**: Always specify dependencies array for useEffect

### 44. Use of "any" type reduces type safety

- **File**: `src/services/noShowHandlingService.ts:247`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 45. Use of "any" type reduces type safety

- **File**: `src/services/orderService.ts:296`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 46. Use of "any" type reduces type safety

- **File**: `src/services/orderService.ts:367`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 47. Use of "any" type reduces type safety

- **File**: `src/services/orderService.ts:376`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 48. Use of "any" type reduces type safety

- **File**: `src/services/orderService.ts:649`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 49. Use of "any" type reduces type safety

- **File**: `src/services/productService.ts:38`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 50. Use of "any" type reduces type safety

- **File**: `src/services/productService.ts:140`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 51. Use of "any" type reduces type safety

- **File**: `src/services/productService.ts:237`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 52. Use of "any" type reduces type safety

- **File**: `src/services/productService.ts:400`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 53. Use of "any" type reduces type safety

- **File**: `src/services/productService.ts:477`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 54. Use of "any" type reduces type safety

- **File**: `src/services/realtimeService.ts:254`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 55. Use of "any" type reduces type safety

- **File**: `src/services/realtimeService.ts:266`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 56. Use of "any" type reduces type safety

- **File**: `src/services/realtimeService.ts:277`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 57. Use of "any" type reduces type safety

- **File**: `src/services/realtimeService.ts:288`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 58. Use of "any" type reduces type safety

- **File**: `src/services/tokenService.ts:71`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 59. Use of "any" type reduces type safety

- **File**: `src/test/AutomatedTestRunner.tsx:119`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 60. Use of "any" type reduces type safety

- **File**: `src/test/AutomatedTestRunner.tsx:119`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 61. Use of "any" type reduces type safety

- **File**: `src/test/AutomatedTestRunner.tsx:134`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 62. Use of "any" type reduces type safety

- **File**: `src/test/AutomatedTestRunner.tsx:139`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 63. Use of "any" type reduces type safety

- **File**: `src/test/setup.ts:32`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 64. Use of "any" type reduces type safety

- **File**: `src/test/setup.ts:47`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 65. Use of "any" type reduces type safety

- **File**: `src/tests/AtomicOrderTest.tsx:18`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 66. Use of "any" type reduces type safety

- **File**: `src/tests/CartRPCTest.tsx:9`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 67. Use of "any" type reduces type safety

- **File**: `src/tests/SimpleStockValidationTest.tsx:19`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 68. Use of "any" type reduces type safety

- **File**: `src/utils/broadcastFactory.ts:16`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 69. Use of "any" type reduces type safety

- **File**: `src/utils/broadcastFactory.ts:22`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 70. Use of "any" type reduces type safety

- **File**: `src/utils/broadcastFactory.ts:24`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 71. Use of "any" type reduces type safety

- **File**: `src/utils/broadcastFactory.ts:150`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 72. Use of "any" type reduces type safety

- **File**: `src/utils/broadcastHelper.ts:14`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 73. Use of "any" type reduces type safety

- **File**: `src/utils/broadcastHelper.ts:47`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 74. Use of "any" type reduces type safety

- **File**: `src/utils/broadcastHelper.ts:74`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 75. Use of "any" type reduces type safety

- **File**: `src/utils/channelManager.ts:34`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 76. Use of "any" type reduces type safety

- **File**: `src/utils/queryKeyFactory.ts:44`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 77. Use of "any" type reduces type safety

- **File**: `src/utils/queryKeyFactory.ts:116`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

### 78. Use of "any" type reduces type safety

- **File**: `src/utils/queryKeyFactory.ts:128`
- **Type**: type_safety
- **Code**: `: any`
- **Recommendation**: Use specific types instead of "any"

## ℹ️ INFO Issues (65)

### 1. Network request without SSL pinning verification

- **File**: `automation/schema-validator.ts:211`
- **Type**: network_security
- **Code**: `.get(`
- **Recommendation**: Implement certificate pinning and request/response validation

### 2. Hardcoded URL detected

- **File**: `automation/test-generator.ts:296`
- **Type**: hardcoded_url
- **Code**: `'http://localhost:54321'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 3. Sensitive permission requested

- **File**: `package-lock.json:25`
- **Type**: permissions
- **Code**: `camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 4. Sensitive permission requested

- **File**: `package-lock.json:6332`
- **Type**: permissions
- **Code**: `camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 5. Sensitive permission requested

- **File**: `package-lock.json:6334`
- **Type**: permissions
- **Code**: `camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 6. Sensitive permission requested

- **File**: `package-lock.json:6334`
- **Type**: permissions
- **Code**: `camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 7. Sensitive permission requested

- **File**: `package.json:42`
- **Type**: permissions
- **Code**: `camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 8. Network request without SSL pinning verification

- **File**: `scripts/audit-react-query-hooks.ts:354`
- **Type**: network_security
- **Code**: `.get(`
- **Recommendation**: Implement certificate pinning and request/response validation

### 9. Sensitive permission requested

- **File**: `scripts/security-audit.ts:153`
- **Type**: permissions
- **Code**: `CAMERA`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 10. Sensitive permission requested

- **File**: `scripts/security-audit.ts:153`
- **Type**: permissions
- **Code**: `RECORD_AUDIO`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 11. Sensitive permission requested

- **File**: `scripts/security-audit.ts:153`
- **Type**: permissions
- **Code**: `ACCESS_FINE_LOCATION`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 12. Sensitive permission requested

- **File**: `scripts/security-audit.ts:153`
- **Type**: permissions
- **Code**: `READ_EXTERNAL_STORAGE`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 13. Sensitive permission requested

- **File**: `scripts/security-audit.ts:153`
- **Type**: permissions
- **Code**: `WRITE_EXTERNAL_STORAGE`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 14. Sensitive permission requested

- **File**: `scripts/security-audit.ts:306`
- **Type**: permissions
- **Code**: `CAMERA`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 15. Sensitive permission requested

- **File**: `scripts/security-audit.ts:306`
- **Type**: permissions
- **Code**: `RECORD_AUDIO`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 16. Sensitive permission requested

- **File**: `scripts/security-audit.ts:306`
- **Type**: permissions
- **Code**: `ACCESS_FINE_LOCATION`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 17. Hardcoded URL detected

- **File**: `src/components/ProductCard.tsx:36`
- **Type**: hardcoded_url
- **Code**: `'https://via.placeholder.com/400x400?text=No+Image'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 18. Hardcoded URL detected

- **File**: `src/data/mockProducts.ts:13`
- **Type**: hardcoded_url
- **Code**: `'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=400&fit=crop&auto=format'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 19. Hardcoded URL detected

- **File**: `src/data/mockProducts.ts:33`
- **Type**: hardcoded_url
- **Code**: `'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=400&fit=crop'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 20. Hardcoded URL detected

- **File**: `src/data/mockProducts.ts:53`
- **Type**: hardcoded_url
- **Code**: `'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400&h=400&fit=crop'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 21. Hardcoded URL detected

- **File**: `src/data/mockProducts.ts:73`
- **Type**: hardcoded_url
- **Code**: `'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?w=400&h=400&fit=crop'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 22. Hardcoded URL detected

- **File**: `src/data/mockProducts.ts:93`
- **Type**: hardcoded_url
- **Code**: `'https://images.unsplash.com/photo-1445282768818-728615cc910a?w=400&h=400&fit=crop'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 23. Hardcoded URL detected

- **File**: `src/data/mockProducts.ts:113`
- **Type**: hardcoded_url
- **Code**: `'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 24. Hardcoded URL detected

- **File**: `src/data/mockProducts.ts:133`
- **Type**: hardcoded_url
- **Code**: `'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=400&h=400&fit=crop'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 25. Hardcoded URL detected

- **File**: `src/data/mockProducts.ts:153`
- **Type**: hardcoded_url
- **Code**: `'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 26. Hardcoded URL detected

- **File**: `src/data/mockProducts.ts:173`
- **Type**: hardcoded_url
- **Code**: `'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 27. Hardcoded URL detected

- **File**: `src/data/mockProducts.ts:193`
- **Type**: hardcoded_url
- **Code**: `'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 28. Network request without SSL pinning verification

- **File**: `src/screens/AdminOrderScreen.tsx:275`
- **Type**: network_security
- **Code**: `fetch(`
- **Recommendation**: Implement certificate pinning and request/response validation

### 29. Hardcoded URL detected

- **File**: `src/screens/CartScreen.tsx:101`
- **Type**: hardcoded_url
- **Code**: `'https://via.placeholder.com/80x80?text=No+Image'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 30. Network request without SSL pinning verification

- **File**: `src/screens/MetricsAnalyticsScreen.tsx:25`
- **Type**: network_security
- **Code**: `fetch(`
- **Recommendation**: Implement certificate pinning and request/response validation

### 31. Network request without SSL pinning verification

- **File**: `src/screens/MetricsAnalyticsScreen.tsx:60`
- **Type**: network_security
- **Code**: `fetch(`
- **Recommendation**: Implement certificate pinning and request/response validation

### 32. Network request without SSL pinning verification

- **File**: `src/screens/MyOrdersScreen.tsx:119`
- **Type**: network_security
- **Code**: `fetch(`
- **Recommendation**: Implement certificate pinning and request/response validation

### 33. Hardcoded URL detected

- **File**: `src/screens/ProductDetailScreen.tsx:100`
- **Type**: hardcoded_url
- **Code**: `'https://via.placeholder.com/400x400/e5e7eb/6b7280?text=Organic+Tomatoes'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 34. Basic auth validation found

- **File**: `src/screens/ProfileScreen.tsx:240`
- **Type**: auth_validation
- **Code**: `if (!user) {
    return`
- **Recommendation**: Review and address this security concern

### 35. Sensitive permission requested

- **File**: `src/screens/StaffQRScannerScreen.tsx:12`
- **Type**: permissions
- **Code**: `Camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 36. Sensitive permission requested

- **File**: `src/screens/StaffQRScannerScreen.tsx:12`
- **Type**: permissions
- **Code**: `camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 37. Sensitive permission requested

- **File**: `src/screens/StaffQRScannerScreen.tsx:145`
- **Type**: permissions
- **Code**: `camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 38. Sensitive permission requested

- **File**: `src/screens/StaffQRScannerScreen.tsx:155`
- **Type**: permissions
- **Code**: `camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 39. Sensitive permission requested

- **File**: `src/screens/StaffQRScannerScreen.tsx:156`
- **Type**: permissions
- **Code**: `Camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 40. Sensitive permission requested

- **File**: `src/screens/StaffQRScannerScreen.tsx:158`
- **Type**: permissions
- **Code**: `camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 41. Hardcoded URL detected

- **File**: `src/screens/testScreens/CartSyncTestScreen.tsx:17`
- **Type**: hardcoded_url
- **Code**: `'https://example.com/apple.jpg'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 42. Basic auth validation found

- **File**: `src/screens/testScreens/HybridAuthTestScreen.tsx:73`
- **Type**: auth_validation
- **Code**: `if (!user) {
      updateTestResult('optimisticUpdate', 'fail');
      Alert.alert('❌ Profile Update Test', 'No user logged in');
      return`
- **Recommendation**: Review and address this security concern

### 43. Basic auth validation found

- **File**: `src/screens/testScreens/SecurityBroadcastTestScreen.tsx:53`
- **Type**: auth_validation
- **Code**: `if (!user) {
      Alert.alert('Error', 'Please log in to run security tests');
      return`
- **Recommendation**: Review and address this security concern

### 44. Sensitive permission requested

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:24`
- **Type**: permissions
- **Code**: `Camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 45. Sensitive permission requested

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:87`
- **Type**: permissions
- **Code**: `Camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 46. Sensitive permission requested

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:89`
- **Type**: permissions
- **Code**: `camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 47. Sensitive permission requested

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:96`
- **Type**: permissions
- **Code**: `camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 48. Sensitive permission requested

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:101`
- **Type**: permissions
- **Code**: `Camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 49. Sensitive permission requested

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:108`
- **Type**: permissions
- **Code**: `Camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 50. Sensitive permission requested

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:114`
- **Type**: permissions
- **Code**: `camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 51. Sensitive permission requested

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:120`
- **Type**: permissions
- **Code**: `Camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 52. Sensitive permission requested

- **File**: `src/screens/testScreens/StaffQRScannerTestScreen.tsx:291`
- **Type**: permissions
- **Code**: `camera`
- **Recommendation**: Request only necessary permissions and explain their purpose to users

### 53. Hardcoded URL detected

- **File**: `src/services/authService.ts:40`
- **Type**: hardcoded_url
- **Code**: `'https://api.myfarmstand.com'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 54. Basic auth validation found

- **File**: `src/services/cartService.ts:108`
- **Type**: auth_validation
- **Code**: `if (!user) {
        console.log('🚫 User not authenticated, returning empty cart');
        return`
- **Recommendation**: Review and address this security concern

### 55. Basic auth validation found

- **File**: `src/services/cartService.ts:203`
- **Type**: auth_validation
- **Code**: `if (!user) {
        return`
- **Recommendation**: Review and address this security concern

### 56. Basic auth validation found

- **File**: `src/services/cartService.ts:321`
- **Type**: auth_validation
- **Code**: `if (!user) {
        return`
- **Recommendation**: Review and address this security concern

### 57. Basic auth validation found

- **File**: `src/services/cartService.ts:372`
- **Type**: auth_validation
- **Code**: `if (!user) {
        return`
- **Recommendation**: Review and address this security concern

### 58. Basic auth validation found

- **File**: `src/services/cartService.ts:424`
- **Type**: auth_validation
- **Code**: `if (!user) {
        return`
- **Recommendation**: Review and address this security concern

### 59. Network request without SSL pinning verification

- **File**: `src/services/notificationService.ts:176`
- **Type**: network_security
- **Code**: `fetch(`
- **Recommendation**: Implement certificate pinning and request/response validation

### 60. Hardcoded URL detected

- **File**: `src/services/notificationService.ts:176`
- **Type**: hardcoded_url
- **Code**: `'https://exp.host/--/api/v2/push/send'`
- **Recommendation**: Move URLs to environment variables or configuration files

### 61. Basic auth validation found

- **File**: `src/services/realtimeService.ts:24`
- **Type**: auth_validation
- **Code**: `if (!user) {
      console.warn('🔐 Cannot subscribe to order updates: No authenticated user');
      return`
- **Recommendation**: Review and address this security concern

### 62. Basic auth validation found

- **File**: `src/services/realtimeService.ts:232`
- **Type**: auth_validation
- **Code**: `if (!user) {
      console.warn('🔐 Cannot subscribe to cart updates: No authenticated user');
      return`
- **Recommendation**: Review and address this security concern

### 63. Network request without SSL pinning verification

- **File**: `src/services/realtimeService.ts:338`
- **Type**: network_security
- **Code**: `.get(`
- **Recommendation**: Implement certificate pinning and request/response validation

### 64. Network request without SSL pinning verification

- **File**: `src/test/AutomatedTestRunner.tsx:58`
- **Type**: network_security
- **Code**: `fetch(`
- **Recommendation**: Implement certificate pinning and request/response validation

### 65. Network request without SSL pinning verification

- **File**: `src/utils/channelManager.ts:28`
- **Type**: network_security
- **Code**: `.get(`
- **Recommendation**: Implement certificate pinning and request/response validation

## Security Recommendations

### Immediate Actions
1. Address all critical security issues immediately
2. Conduct security code review
3. Implement security testing in CI/CD pipeline
1. Fix high-severity vulnerabilities before production
2. Review authentication and authorization patterns
3. Implement input validation and sanitization

### General Security Improvements
1. Implement proper secret management (use environment variables)
2. Add comprehensive input validation
3. Use HTTPS for all network communications
4. Implement proper error handling without information disclosure
5. Regular dependency updates and vulnerability scanning
6. Security testing and penetration testing

