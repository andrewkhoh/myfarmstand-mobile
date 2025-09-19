import { Product, Order, OrderItem, CustomerInfo } from '../types';
import { Database } from '../types/database.generated';

type DBProduct = Database['public']['Tables']['products']['Row'];
type DBOrder = Database['public']['Tables']['orders']['Row'];
type DBOrderItem = Database['public']['Tables']['order_items']['Row'];

/**
 * Maps database product to app Product type with legacy field support
 */
export function mapProductFromDB(dbProduct: DBProduct): Product {
  return {
    // Primary database fields
    id: dbProduct.id,
    name: dbProduct.name,
    description: dbProduct.description,
    price: dbProduct.price,
    stock_quantity: dbProduct.stock_quantity,
    category_id: dbProduct.category_id,
    image_url: dbProduct.image_url,
    is_weekly_special: dbProduct.is_weekly_special,
    is_bundle: dbProduct.is_bundle,
    seasonal_availability: dbProduct.seasonal_availability,
    unit: dbProduct.unit,
    weight: dbProduct.weight,
    sku: dbProduct.sku,
    tags: dbProduct.tags,
    nutrition_info: dbProduct.nutrition_info as any,
    is_available: dbProduct.is_available,
    is_pre_order: dbProduct.is_pre_order,
    pre_order_available_date: dbProduct.pre_order_available_date,
    min_pre_order_quantity: dbProduct.min_pre_order_quantity,
    max_pre_order_quantity: dbProduct.max_pre_order_quantity,
    created_at: dbProduct.created_at,
    updated_at: dbProduct.updated_at,
    
    // Legacy field mappings for backward compatibility
    stock: dbProduct.stock_quantity ?? 0,
    categoryId: dbProduct.category_id,
    imageUrl: dbProduct.image_url ?? undefined,
    isWeeklySpecial: dbProduct.is_weekly_special ?? false,
    isBundle: dbProduct.is_bundle ?? false,
    seasonalAvailability: dbProduct.seasonal_availability ?? false,
    nutritionInfo: dbProduct.nutrition_info as any,
    isActive: dbProduct.is_available ?? true,
    isPreOrder: dbProduct.is_pre_order ?? false,
    preOrderAvailableDate: dbProduct.pre_order_available_date ?? undefined,
    minPreOrderQuantity: dbProduct.min_pre_order_quantity ?? undefined,
    maxPreOrderQuantity: dbProduct.max_pre_order_quantity ?? undefined,
    createdAt: dbProduct.created_at ?? '',
    updatedAt: dbProduct.updated_at ?? '',
  };
}

/**
 * Maps database order to app Order type with legacy field support
 */
export function mapOrderFromDB(
  dbOrder: DBOrder,
  orderItems?: OrderItem[]
): Order {
  const customerInfo: CustomerInfo = {
    name: dbOrder.customer_name,
    email: dbOrder.customer_email,
    phone: dbOrder.customer_phone,
    address: dbOrder.delivery_address ?? undefined,
  };

  return {
    // Primary database fields
    id: dbOrder.id,
    user_id: dbOrder.user_id,
    customer_name: dbOrder.customer_name,
    customer_email: dbOrder.customer_email,
    customer_phone: dbOrder.customer_phone,
    order_items: orderItems,
    subtotal: dbOrder.subtotal,
    tax_amount: dbOrder.tax_amount,
    total_amount: dbOrder.total_amount,
    fulfillment_type: dbOrder.fulfillment_type,
    status: dbOrder.status,
    payment_method: dbOrder.payment_method,
    payment_status: dbOrder.payment_status,
    notes: dbOrder.notes,
    pickup_date: dbOrder.pickup_date,
    pickup_time: dbOrder.pickup_time,
    delivery_address: dbOrder.delivery_address,
    special_instructions: dbOrder.special_instructions,
    created_at: dbOrder.created_at,
    updated_at: dbOrder.updated_at,
    qr_code_data: dbOrder.qr_code_data,
    
    // Legacy field mappings for backward compatibility
    customerId: dbOrder.user_id ?? undefined,
    customerInfo: customerInfo,
    items: orderItems ?? [],
    tax: dbOrder.tax_amount,
    total: dbOrder.total_amount,
    fulfillmentType: dbOrder.fulfillment_type as any,
    paymentMethod: dbOrder.payment_method as any,
    paymentStatus: dbOrder.payment_status as any,
    pickupDate: dbOrder.pickup_date ?? undefined,
    pickupTime: dbOrder.pickup_time ?? undefined,
    deliveryAddress: dbOrder.delivery_address ?? undefined,
    specialInstructions: dbOrder.special_instructions ?? undefined,
    createdAt: dbOrder.created_at ?? '',
    updatedAt: dbOrder.updated_at ?? '',
  };
}

/**
 * Maps order item from database to app OrderItem type
 */
export function mapOrderItemFromDB(dbItem: DBOrderItem & { products?: DBProduct }): OrderItem {
  return {
    productId: dbItem.product_id,
    productName: dbItem.product_name,
    price: dbItem.unit_price,
    quantity: dbItem.quantity,
    subtotal: dbItem.total_price,
    product: dbItem.products ? mapProductFromDB(dbItem.products) : undefined,
  };
}

/**
 * Gets product stock value (handles both new and legacy field names)
 */
export function getProductStock(product: Partial<Product>): number {
  return product.stock_quantity ?? product.stock ?? 0;
}

/**
 * Gets product category ID (handles both new and legacy field names)
 */
export function getProductCategoryId(product: Product): string {
  return product.category_id ?? product.categoryId ?? '';
}

/**
 * Gets product image URL (handles both new and legacy field names)
 */
export function getProductImageUrl(product: Product): string | undefined {
  return product.image_url ?? product.imageUrl ?? undefined;
}

/**
 * Checks if product is pre-order (handles both new and legacy field names)
 */
export function isProductPreOrder(product: Partial<Product>): boolean {
  return product.is_pre_order ?? product.isPreOrder ?? false;
}

/**
 * Gets product min pre-order quantity (handles both new and legacy field names)
 */
export function getProductMinPreOrderQty(product: Partial<Product>): number | undefined {
  return product.min_pre_order_quantity ?? product.minPreOrderQuantity ?? undefined;
}

/**
 * Gets product max pre-order quantity (handles both new and legacy field names)
 */
export function getProductMaxPreOrderQty(product: Partial<Product>): number | undefined {
  return product.max_pre_order_quantity ?? product.maxPreOrderQuantity ?? undefined;
}

/**
 * Gets order total (handles both new and legacy field names)
 */
export function getOrderTotal(order: Partial<Order>): number {
  return order.total_amount ?? order.total ?? 0;
}

/**
 * Gets order customer ID (handles both new and legacy field names)
 */
export function getOrderCustomerId(order: Order): string | undefined {
  return order.user_id ?? order.customerId ?? undefined;
}

/**
 * Gets order customer info
 */
export function getOrderCustomerInfo(order: Order): CustomerInfo {
  if (order.customerInfo) {
    return order.customerInfo;
  }
  return {
    name: order.customer_name,
    email: order.customer_email,
    phone: order.customer_phone,
    address: order.delivery_address ?? undefined,
  };
}

/**
 * Gets order items (handles both new and legacy field names)
 */
export function getOrderItems(order: Order): OrderItem[] {
  return order.order_items ?? order.items ?? [];
}

/**
 * Gets order fulfillment type (handles both new and legacy field names)
 */
export function getOrderFulfillmentType(order: Order): string {
  return order.fulfillment_type ?? order.fulfillmentType ?? 'pickup';
}

/**
 * Gets order pickup date (handles both new and legacy field names)
 */
export function getOrderPickupDate(order: Order): string | undefined {
  return order.pickup_date ?? order.pickupDate ?? undefined;
}

/**
 * Gets order pickup time (handles both new and legacy field names)
 */
export function getOrderPickupTime(order: Order): string | undefined {
  return order.pickup_time ?? order.pickupTime ?? undefined;
}

/**
 * Gets order payment method (handles both new and legacy field names)
 */
export function getOrderPaymentMethod(order: Order): string | undefined {
  return order.payment_method ?? order.paymentMethod ?? undefined;
}

/**
 * Gets order created at (handles both new and legacy field names)
 */
export function getOrderCreatedAt(order: Order): string {
  return order.created_at ?? order.createdAt ?? '';
}

/**
 * Gets order delivery address (handles both new and legacy field names)
 */
export function getOrderDeliveryAddress(order: Order): string | undefined {
  return order.delivery_address ?? order.deliveryAddress ?? undefined;
}