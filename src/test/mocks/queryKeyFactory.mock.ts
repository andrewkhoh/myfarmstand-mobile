/**
 * Complete Query Key Factory Mock
 * 
 * Provides all query key factories used throughout the application.
 * This ensures consistent mocking across all tests.
 */

export const mockQueryKeyFactory = {
  authKeys: {
    all: (userId?: string) => userId ? ['auth', userId] : ['auth'],
    lists: (userId?: string) => userId ? ['auth', userId, 'list'] : ['auth', 'list'],
    details: (userId?: string) => userId ? ['auth', userId, 'detail'] : ['auth', 'detail'],
    detail: (id: string, userId?: string) => userId ? ['auth', userId, 'detail', id] : ['auth', 'detail', id],
    session: (userId?: string) => userId ? ['auth', userId, 'session'] : ['auth', 'session'],
    profile: (userId?: string) => userId ? ['auth', userId, 'profile'] : ['auth', 'profile'],
  },
  
  cartKeys: {
    all: (userId?: string) => userId ? ['cart', userId] : ['cart'],
    lists: (userId?: string) => userId ? ['cart', userId, 'list'] : ['cart', 'list'],
    details: (userId?: string) => userId ? ['cart', userId, 'detail'] : ['cart', 'detail'],
    detail: (id: string, userId?: string) => userId ? ['cart', userId, 'detail', id] : ['cart', 'detail', id],
    items: (userId?: string) => userId ? ['cart', userId, 'items'] : ['cart', 'items'],
    summary: (userId?: string) => userId ? ['cart', userId, 'summary'] : ['cart', 'summary'],
  },
  
  orderKeys: {
    all: (userId?: string) => userId ? ['orders', userId] : ['orders'],
    list: (filters?: any) => ['orders', 'list', filters],
    lists: (userId?: string) => userId ? ['orders', userId, 'list'] : ['orders', 'list'],
    details: (userId?: string) => userId ? ['orders', userId, 'detail'] : ['orders', 'detail'],
    detail: (id: string, userId?: string) => userId ? ['orders', userId, 'detail', id] : ['orders', 'detail', id],
    active: (userId?: string) => userId ? ['orders', userId, 'active'] : ['orders', 'active'],
    history: (userId?: string) => userId ? ['orders', userId, 'history'] : ['orders', 'history'],
  },
  
  productKeys: {
    all: () => ['products'],
    list: (filters?: any) => ['products', 'list', filters],
    lists: () => ['products', 'list'],
    details: () => ['products', 'detail'],
    detail: (id: string) => ['products', 'detail', id],
    categories: () => ['products', 'categories'],
    search: (query: string) => ['products', 'search', query],
    featured: () => ['products', 'featured'],
    weekly: () => ['products', 'weekly-specials'],
  },
  
  notificationKeys: {
    all: (userId?: string) => userId ? ['notifications', userId] : ['notifications'],
    lists: (userId?: string) => userId ? ['notifications', userId, 'list'] : ['notifications', 'list'],
    detail: (id: string, userId?: string) => userId ? ['notifications', userId, 'detail', id] : ['notifications', 'detail', id],
    unread: (userId?: string) => userId ? ['notifications', userId, 'unread'] : ['notifications', 'unread'],
    preferences: (userId?: string) => userId ? ['notifications', userId, 'preferences'] : ['notifications', 'preferences'],
  },
  
  paymentKeys: {
    all: (userId?: string) => userId ? ['payment', userId] : ['payment'],
    paymentMethods: (userId?: string) => userId ? ['payment', userId, 'methods'] : ['payment', 'methods'],
    paymentIntents: (userId?: string) => userId ? ['payment', userId, 'intents'] : ['payment', 'intents'],
    detail: (id: string, userId?: string) => userId ? ['payment', userId, 'detail', id] : ['payment', 'detail', id],
    history: (userId?: string) => userId ? ['payment', userId, 'history'] : ['payment', 'history'],
  },
  
  kioskKeys: {
    all: () => ['kiosk'],
    config: () => ['kiosk', 'config'],
    session: (sessionId?: string) => sessionId ? ['kiosk', 'session', sessionId] : ['kiosk', 'session'],
    activity: (sessionId?: string) => sessionId ? ['kiosk', 'activity', sessionId] : ['kiosk', 'activity'],
    transactions: (sessionId?: string) => sessionId ? ['kiosk', 'transactions', sessionId] : ['kiosk', 'transactions'],
  },
  
  realtimeKeys: {
    all: (userId?: string) => userId ? ['realtime', userId] : ['realtime'],
    status: (userId?: string) => userId ? ['realtime', userId, 'status'] : ['realtime', 'status'],
    subscriptions: (userId?: string) => userId ? ['realtime', userId, 'subscriptions'] : ['realtime', 'subscriptions'],
  },
  
  // Generic factory creator for custom entities
  createQueryKeyFactory: (entity: string) => ({
    all: (userId?: string) => userId ? [entity, userId] : [entity],
    lists: (userId?: string) => userId ? [entity, userId, 'list'] : [entity, 'list'],
    details: (userId?: string) => userId ? [entity, userId, 'detail'] : [entity, 'detail'],
    detail: (id: string, userId?: string) => userId ? [entity, userId, 'detail', id] : [entity, 'detail', id],
  }),
};

// Export individual factories for backward compatibility
export const authKeys = mockQueryKeyFactory.authKeys;
export const cartKeys = mockQueryKeyFactory.cartKeys;
export const orderKeys = mockQueryKeyFactory.orderKeys;
export const productKeys = mockQueryKeyFactory.productKeys;
export const notificationKeys = mockQueryKeyFactory.notificationKeys;
export const paymentKeys = mockQueryKeyFactory.paymentKeys;
export const kioskKeys = mockQueryKeyFactory.kioskKeys;
export const realtimeKeys = mockQueryKeyFactory.realtimeKeys;
export const createQueryKeyFactory = mockQueryKeyFactory.createQueryKeyFactory;