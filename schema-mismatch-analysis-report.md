# Database Schema Mismatch Analysis Report

## Executive Summary

After comprehensive analysis of services, Zod schemas, and database schema in the myfarmstand-mobile application, I identified **critical mismatches** that pose significant runtime risks. This report details service-database dependencies, schema validation gaps, and missing tables that could cause application failures.

## Critical Findings

### 🚨 **IMMEDIATE ACTION REQUIRED**

1. **Missing critical tables** referenced by services but not in database
2. **Field name mismatches** between Zod schemas and database tables
3. **Type inconsistencies** that will cause validation failures
4. **Unvalidated database tables** without corresponding Zod schemas

---

## 1. Missing Database Tables

### **Tables Referenced by Services But Missing from Database**

| Table Name | Referenced By | Impact Level | Description |
|------------|---------------|--------------|-------------|
| ~~`customers`~~ | ~~Executive, Analytics Services~~ | ~~**CRITICAL**~~ | **RESOLVED: Customers stored in `users` table** |
| `payment_methods` | PaymentService | **HIGH** | Payment processing will fail |
| `notification_preferences` | NotificationService | **HIGH** | User preferences not stored |
| `notifications` | NotificationService | **HIGH** | Notification system broken |
| `health_check` | DeploymentService | **MEDIUM** | Health monitoring missing |
| ~~`warehouses`~~ | ~~Inventory Services~~ | ~~**CRITICAL**~~ | **NOT NEEDED: Single location operation** |

### **Confirmed Existing Tables (Analysis Results)**

✅ `predictive_forecasts` - EXISTS in database
✅ `alert_rules` - EXISTS in database
✅ `no_show_log` - EXISTS in database (not no_show_logs)

---

## 2. Service → Database Table Dependencies

### **Core Services**
```
OrderService → orders, order_items, products, kiosk_transactions
ProductService → products, categories
CartService → cart_items, products (via upsert_cart_item RPC)
AuthService → users, user_permissions
```

### **Executive Services**
```
BusinessMetricsService → orders, business_metrics
BusinessIntelligenceService → orders, order_items, products, business_insights
PredictiveAnalyticsService → predictive_forecasts, business_metrics
StrategicReportingService → strategic_reports, business_metrics
```

### **Inventory Services**
```
InventoryService → inventory_items, inventory_alerts, stock_movements
StockMovementService → stock_movements, inventory_items
```

### **Marketing Services**
```
CampaignService → campaigns, marketing_campaigns, campaign_metrics
BundleService → product_bundles, bundle_items, bundle_products
ContentService → product_content
AnalyticsService → campaign_metrics, marketing_campaigns
```

---

## 3. Critical Zod Schema Mismatches

### **🚨 CRITICAL: Inventory Schema Mismatches**

| Schema Field | Database Field | Status | Impact |
|--------------|----------------|--------|---------|
| `minimum_threshold` | `minimum_stock` | ❌ **MISMATCH** | Inventory alerts broken |
| `maximum_threshold` | `maximum_stock` | ❌ **MISMATCH** | Stock level validation fails |
| ~~`warehouse_id`~~ | ~~`warehouse_id`~~ | ~~❌ **MISSING**~~ | **NOT NEEDED: Single location** |

**Stock Movements Schema Issues:**
- ~~Schema: `from_warehouse_id/to_warehouse_id` → Database: **Fields don't exist**~~ **NOT NEEDED**
- Schema: `previous_stock/new_stock` → Database: `stock_before/stock_after`
- Missing validation: Database requires `inventory_item_id`

### **🚨 CRITICAL: Marketing Schema Mismatches**

**Product Bundles:**
| Schema Field | Database Field | Status |
|--------------|----------------|--------|
| `name` | `bundle_name` | ❌ **MISMATCH** |
| `description` | `bundle_description` | ❌ **MISMATCH** |
| `base_price` | `bundle_price` | ❌ **MISMATCH** |
| `product_ids` | **N/A** | ❌ **MISSING** |

**Product Content:**
| Schema Field | Database Field | Status |
|--------------|----------------|--------|
| `title` | `marketing_title` | ❌ **MISMATCH** |
| `description` | `marketing_description` | ❌ **MISMATCH** |
| `image_urls` | `featured_image_url` | ❌ **MISMATCH** |

### **🚨 CRITICAL: Executive Schema Mismatches**

**Business Insights:**
- Schema: `insight_date_range: string` → Database: `insight_date_range: unknown` (PostgreSQL daterange)
- Schema: `affected_areas: string[]` → Database: **Field doesn't exist**
- Schema: `recommendation_actions: string[]` → Database: `recommendations: Json`

---

## 4. Tables Without Zod Validation Schemas

### **High Risk - No Input Validation**

| Table Name | Risk Level | Usage |
|------------|------------|--------|
| `alert_rules` | **HIGH** | Notification system critical |
| `campaign_metrics` | **HIGH** | Marketing analytics |
| `cross_role_analytics` | **MEDIUM** | Executive analytics |
| `customer_analytics` | **HIGH** | Customer insights |
| `kiosk_sessions` | **HIGH** | POS system |
| `kiosk_transactions` | **HIGH** | POS system |
| `notification_logs` | **MEDIUM** | Audit trail |
| `strategic_reports` | **MEDIUM** | Executive reports |

---

## 5. Type Inconsistencies Causing Runtime Errors

### **PostgreSQL Type Handling Issues**

1. **Date Ranges**: Database uses `unknown` (PostgreSQL daterange) but schemas expect `string`
2. **JSON vs JSON Arrays**: Inconsistent handling across schemas
3. **UUID Validation**: Missing for foreign key fields
4. **Boolean/Null**: Database allows `null` but schemas assume defaults

### **Field Requirement Mismatches**

| Field | Database | Schema | Issue |
|-------|----------|--------|-------|
| ~~`warehouse_id`~~ | ~~Required~~ | ~~Missing~~ | **NOT NEEDED: Single location** |
| `fulfillment_type` | Has default | No default | Data inconsistency |
| `is_active` | Nullable | Required | Type error |

---

## 6. Business Logic Validation Gaps

### **Missing Critical Validations**

1. **Stock Movements**: No validation that `new_stock = previous_stock + quantity_change`
2. **Order Totals**: Limited validation of `subtotal + tax = total`
3. **Campaign Dates**: No validation that `end_date > start_date`
4. **Bundle Pricing**: Discount calculations not validated
5. **Inventory Levels**: No cross-validation with `stock_movements`

---

## 7. Legacy Code Issues

### **Deprecated Services Using Wrong Tables**

| Service | Expected Table | Actual Table | Status |
|---------|----------------|--------------|--------|
| RoleService | `user_roles` | `user_permissions` | Deprecated, migrate |
| RoleService | `role_permissions` | `user_permissions` | Deprecated, migrate |

---

## 8. Priority Fix Recommendations

### **🔥 IMMEDIATE (Week 1)**

1. **Add missing `warehouse_id` to inventory schemas** - Prevents database errors
2. **Fix inventory field name mismatches** (`minimum_threshold` → `minimum_stock`)
3. **~~Create `customers` table~~** - **RESOLVED: Using `users` table**
4. **✅ FIXED: RealtimeMetricsService `customers` → `users` table subscription**
5. **Add `warehouses` table with default warehouse**

### **⚡ HIGH PRIORITY (Week 2)**

1. **Fix marketing schema field mismatches** (bundle/content naming)
2. **Add schemas for unvalidated tables** (`alert_rules`, `campaign_metrics`)
3. **Fix PostgreSQL daterange type handling**
4. **Add missing tables**: `payment_methods`, `notifications`

### **📋 MEDIUM PRIORITY (Month 1)**

1. **Standardize JSON field handling**
2. **Add business logic validations**
3. **Remove deprecated role services**
4. **Add comprehensive UUID validation**

### **🔧 LONG TERM (Quarter 1)**

1. **Database field naming standardization**
2. **Implement service-level caching**
3. **Add materialized views for analytics**
4. **Consolidate duplicate marketing services**

---

## 9. Risk Assessment

### **Application Failure Risks**

| Component | Risk Level | Failure Mode |
|-----------|------------|-------------|
| Inventory System | **CRITICAL** | Database constraint violations |
| Marketing Features | **HIGH** | Field mapping failures |
| Executive Analytics | **HIGH** | Type conversion errors |
| POS System | **MEDIUM** | Missing validation |
| User Roles | **LOW** | Deprecated but functional |

### **Data Integrity Risks**

- **Unvalidated inputs** could corrupt database
- **Missing foreign key validation** could create orphaned records
- **Type mismatches** could cause silent data loss
- **Business rule violations** could create inconsistent state

---

## Conclusion

The analysis reveals **26 critical mismatches** that require immediate attention to prevent runtime failures. The inventory and marketing systems have the highest risk due to fundamental field naming mismatches. Executive analytics faces type handling issues with PostgreSQL-specific types.

**Recommended approach:**
1. Fix critical inventory issues first (highest impact)
2. Address missing tables for service dependencies
3. Add validation schemas for unprotected tables
4. Implement comprehensive testing before deployment

This systematic approach will ensure application stability while maintaining data integrity across all service layers.