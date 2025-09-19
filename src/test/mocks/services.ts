/**
 * Centralized Service Mocks for Testing
 */

// Mock Inventory Service
export const mockInventoryService = {
  getInventoryItems: jest.fn().mockResolvedValue({
    data: [
      { id: '1', name: 'Product 1', stock: 100, price: 10 },
      { id: '2', name: 'Product 2', stock: 50, price: 20 },
    ],
    error: null,
  }),
  updateStock: jest.fn().mockResolvedValue({
    data: { id: '1', stock: 90 },
    error: null,
  }),
  bulkUpdateStock: jest.fn().mockResolvedValue({
    data: { updated: 2 },
    error: null,
  }),
  getStockAlerts: jest.fn().mockResolvedValue({
    data: [],
    error: null,
  }),
};

// Mock Marketing Service
export const mockMarketingService = {
  getCampaigns: jest.fn().mockResolvedValue({
    data: [
      { id: '1', name: 'Summer Sale', status: 'active' },
      { id: '2', name: 'Holiday Promo', status: 'draft' },
    ],
    error: null,
  }),
  createCampaign: jest.fn().mockResolvedValue({
    data: { id: '3', name: 'New Campaign', status: 'draft' },
    error: null,
  }),
  updateCampaign: jest.fn().mockResolvedValue({
    data: { id: '1', name: 'Summer Sale Updated' },
    error: null,
  }),
  getProductBundles: jest.fn().mockResolvedValue({
    data: [],
    error: null,
  }),
};

// Mock Executive Service
export const mockExecutiveService = {
  getBusinessMetrics: jest.fn().mockResolvedValue({
    metrics: [
      { name: 'revenue', value: 10000, trend: 'up' },
      { name: 'orders', value: 50, trend: 'stable' },
    ],
    correlations: {},
    summary: {
      total_metrics: 2,
      categories_included: ['revenue', 'orders'],
      date_range: '30d',
      aggregation_level: 'daily',
    },
  }),
  generateInsights: jest.fn().mockResolvedValue({
    insights: [],
    confidence: 0.85,
  }),
  generateForecast: jest.fn().mockResolvedValue({
    forecastData: {
      predictions: [],
    },
    modelAccuracy: 0.9,
    confidenceIntervals: {},
    modelType: 'timeseries',
  }),
};

// Mock Role Service
export const mockRoleService = {
  getUserRole: jest.fn().mockResolvedValue({
    data: {
      id: 'user-1',
      role: 'admin',
      permissions: ['read', 'write', 'delete'],
    },
    error: null,
  }),
  hasPermission: jest.fn((permission: string) => {
    const adminPermissions = ['read', 'write', 'delete'];
    return Promise.resolve(adminPermissions.includes(permission));
  }),
  checkAccess: jest.fn().mockResolvedValue(true),
};

// Mock Realtime Service
export const mockRealtimeService = {
  subscribe: jest.fn().mockReturnValue({
    unsubscribe: jest.fn(),
  }),
  broadcast: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

// Service mock factory
export const createServiceMock = (serviceName: string) => {
  switch (serviceName) {
    case 'inventory':
      return mockInventoryService;
    case 'marketing':
      return mockMarketingService;
    case 'executive':
      return mockExecutiveService;
    case 'role':
      return mockRoleService;
    case 'realtime':
      return mockRealtimeService;
    default:
      return {};
  }
};

// Reset all mocks
export const resetServiceMocks = () => {
  Object.values(mockInventoryService).forEach(mock => {
    if (jest.isMockFunction(mock)) mock.mockClear();
  });
  Object.values(mockMarketingService).forEach(mock => {
    if (jest.isMockFunction(mock)) mock.mockClear();
  });
  Object.values(mockExecutiveService).forEach(mock => {
    if (jest.isMockFunction(mock)) mock.mockClear();
  });
  Object.values(mockRoleService).forEach(mock => {
    if (jest.isMockFunction(mock)) mock.mockClear();
  });
  Object.values(mockRealtimeService).forEach(mock => {
    if (jest.isMockFunction(mock)) mock.mockClear();
  });
};