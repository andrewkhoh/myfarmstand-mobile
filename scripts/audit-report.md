# Schema/Service Mismatch Audit Report

Generated: 2025-08-16T13:52:50.361Z

## Summary
- Files with issues: 18
- Total issues: 38
- Errors: 10
- Warnings: 28

## Issues by File

### src/services/errorRecoveryService.ts

**Errors:**
- `src/services/errorRecoveryService.ts:494` - Unknown table/view: "error_recovery_logs"
  ```typescript
  //   .from('error_recovery_logs')
  ```
- `src/services/errorRecoveryService.ts:530` - Unknown table/view: "error_recovery_results"
  ```typescript
  //   .from('error_recovery_results')
  ```
- `src/services/errorRecoveryService.ts:564` - Unknown table/view: "critical_errors"
  ```typescript
  //   .from('critical_errors')
  ```

### src/services/noShowHandlingService.ts

**Errors:**
- `src/services/noShowHandlingService.ts:340` - Unknown table/view: "no_show_logs"
  ```typescript
  //   .from('no_show_logs')
  ```
- `src/services/noShowHandlingService.ts:380` - Unknown table/view: "no_show_processing_logs"
  ```typescript
  //   .from('no_show_processing_logs')
  ```

### src/services/orderService.ts

**Warnings:**
- `src/services/orderService.ts:375` - Using "any" type - should use proper database types
  ```typescript
  const orders: Order[] = ordersData.map((orderData: any) => {
  ```
- `src/services/orderService.ts:622` - Using "any" type - should use proper database types
  ```typescript
  const orders: Order[] = ordersData.map((orderData: any) => {
  ```

### src/services/productService.ts

**Warnings:**
- `src/services/productService.ts:39` - Using "any" type - should use proper database types
  ```typescript
  const categories: Category[] = (categoriesData || []).map((cat: any) => ({
  ```
- `src/services/productService.ts:141` - Using "any" type - should use proper database types
  ```typescript
  const products: Product[] = (productsData || []).map((prod: any) => mapProductFromDB(prod));
  ```
- `src/services/productService.ts:210` - Using "any" type - should use proper database types
  ```typescript
  const products: Product[] = (productsData || []).map((prod: any) => mapProductFromDB(prod));
  ```
- `src/services/productService.ts:317` - Using "any" type - should use proper database types
  ```typescript
  const products: Product[] = (productsData || []).map((prod: any) => mapProductFromDB(prod));
  ```
- `src/services/productService.ts:366` - Using "any" type - should use proper database types
  ```typescript
  const products: Product[] = (productsData || []).map((prod: any) => mapProductFromDB(prod));
  ```

### src/services/realtimeService.ts

**Warnings:**
- `src/services/realtimeService.ts:254` - Using "any" type - should use proper database types
  ```typescript
  (payload: any) => {
  ```
- `src/services/realtimeService.ts:266` - Using "any" type - should use proper database types
  ```typescript
  (payload: any) => {
  ```
- `src/services/realtimeService.ts:277` - Using "any" type - should use proper database types
  ```typescript
  (payload: any) => {
  ```
- `src/services/realtimeService.ts:288` - Using "any" type - should use proper database types
  ```typescript
  (payload: any) => {
  ```

### src/services/stockRestorationService.ts

**Errors:**
- `src/services/stockRestorationService.ts:192` - Unknown table/view: "stock_restoration_logs"
  ```typescript
  //   .from('stock_restoration_logs')
  ```
- `src/services/stockRestorationService.ts:251` - Unknown table/view: "stock_restoration_logs"
  ```typescript
  //   .from('stock_restoration_logs')
  ```

### src/services/tokenService.ts

**Warnings:**
- `src/services/tokenService.ts:71` - Using "any" type - should use proper database types
  ```typescript
  static async setUser(user: any): Promise<void> {
  ```

### src/hooks/useCart.ts

**Warnings:**
- `src/hooks/useCart.ts:188` - Using "any" type - should use proper database types
  ```typescript
  onError: (error: any, variables: any, context: any) => {
  ```
- `src/hooks/useCart.ts:188` - Using "any" type - should use proper database types
  ```typescript
  onError: (error: any, variables: any, context: any) => {
  ```
- `src/hooks/useCart.ts:188` - Using "any" type - should use proper database types
  ```typescript
  onError: (error: any, variables: any, context: any) => {
  ```

### src/hooks/useCentralizedRealtime.ts

**Warnings:**
- `src/hooks/useCentralizedRealtime.ts:12` - Using "any" type - should use proper database types
  ```typescript
  const subscriptionsRef = useRef<{ [key: string]: any }>({});
  ```

### src/hooks/useErrorRecovery.ts

**Warnings:**
- `src/hooks/useErrorRecovery.ts:45` - Using "any" type - should use proper database types
  ```typescript
  queryClient.setQueryData(['error-recovery'], (old: any[] | undefined) =>
  ```

### src/hooks/useNoShowHandling.ts

**Warnings:**
- `src/hooks/useNoShowHandling.ts:24` - Using "any" type - should use proper database types
  ```typescript
  mutationFn: (config?: any) => NoShowHandlingService.processNoShowOrders(config),
  ```
- `src/hooks/useNoShowHandling.ts:26` - Using "any" type - should use proper database types
  ```typescript
  onMutate: async (config?: any) => {
  ```

### src/hooks/useOrders.ts

**Warnings:**
- `src/hooks/useOrders.ts:196` - Using "any" type - should use proper database types
  ```typescript
  queryClient.setQueryData(orderKeys.stats(), (oldStats: any) => {
  ```

### src/hooks/useRealtime.ts

**Warnings:**
- `src/hooks/useRealtime.ts:16` - Using "any" type - should use proper database types
  ```typescript
  state: any;
  ```

### src/hooks/useStockValidation.ts

**Warnings:**
- `src/hooks/useStockValidation.ts:48` - Using "any" type - should use proper database types
  ```typescript
  return data.map((item: any) => ({
  ```

### src/screens/MyOrdersScreen.tsx

**Errors:**
- `src/screens/MyOrdersScreen.tsx:690` - Unknown order field: "light"
  ```typescript
  borderBottomColor: colors.border.light,
  ```
- `src/screens/MyOrdersScreen.tsx:748` - Unknown order field: "light"
  ```typescript
  borderColor: colors.border.light,
  ```

### src/screens/ProfileScreen.tsx

**Errors:**
- `src/screens/ProfileScreen.tsx:548` - Unknown order field: "light"
  ```typescript
  borderColor: colors.border.light,
  ```

**Warnings:**
- `src/screens/ProfileScreen.tsx:151` - Using "any" type - should use proper database types
  ```typescript
  onError: (error: any) => {
  ```

### src/screens/__tests__/ProfileScreen.test.tsx

**Warnings:**
- `src/screens/__tests__/ProfileScreen.test.tsx:95` - Using "any" type - should use proper database types
  ```typescript
  const signOutButton = buttons.find((button: any) => button.text === 'Sign Out');
  ```
- `src/screens/__tests__/ProfileScreen.test.tsx:113` - Using "any" type - should use proper database types
  ```typescript
  const cancelButton = buttons.find((button: any) => button.text === 'Cancel');
  ```
- `src/screens/__tests__/ProfileScreen.test.tsx:136` - Using "any" type - should use proper database types
  ```typescript
  const signOutButton = buttons.find((button: any) => button.text === 'Sign Out');
  ```
- `src/screens/__tests__/ProfileScreen.test.tsx:165` - Using "any" type - should use proper database types
  ```typescript
  const signOutButton = buttons.find((button: any) => button.text === 'Sign Out');
  ```

### src/screens/testScreens/ComprehensiveSyncTestScreen.tsx

**Warnings:**
- `src/screens/testScreens/ComprehensiveSyncTestScreen.tsx:24` - Using "any" type - should use proper database types
  ```typescript
  payload: any;
  ```

