import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export interface TestContext {
  queryClient: QueryClient;
  mockServices: {
    contentService: any;
    campaignService: any;
    bundleService: any;
    analyticsService: any;
    authService: any;
    notificationService: any;
  };
}

export function setupMockServices() {
  return {
    contentService: {
      create: jest.fn().mockResolvedValue({ id: '1', status: 'draft' }),
      update: jest.fn().mockResolvedValue({ id: '1', status: 'draft' }),
      uploadImage: jest.fn().mockResolvedValue({ url: 'http://example.com/image.jpg' }),
      submitForReview: jest.fn().mockResolvedValue({ id: '1', status: 'in_review' }),
      approve: jest.fn().mockResolvedValue({ id: '1', status: 'approved' }),
      reject: jest.fn().mockResolvedValue({ id: '1', status: 'rejected' }),
      publish: jest.fn().mockResolvedValue({ id: '1', status: 'published' }),
      getById: jest.fn().mockResolvedValue({ id: '1', status: 'published' }),
      list: jest.fn().mockResolvedValue([]),
    },
    campaignService: {
      create: jest.fn().mockResolvedValue({ id: '2', status: 'draft' }),
      update: jest.fn().mockResolvedValue({ id: '2', status: 'draft' }),
      schedule: jest.fn().mockResolvedValue({ id: '2', status: 'scheduled' }),
      activate: jest.fn().mockResolvedValue({ id: '2', status: 'active' }),
      pause: jest.fn().mockResolvedValue({ id: '2', status: 'paused' }),
      complete: jest.fn().mockResolvedValue({ id: '2', status: 'completed' }),
      addContent: jest.fn().mockResolvedValue(true),
      removeContent: jest.fn().mockResolvedValue(true),
      getById: jest.fn().mockResolvedValue({ id: '2', status: 'active' }),
      list: jest.fn().mockResolvedValue([]),
      getMetrics: jest.fn().mockResolvedValue({ views: 100, clicks: 50 }),
    },
    bundleService: {
      create: jest.fn().mockResolvedValue({ id: '3', status: 'draft' }),
      update: jest.fn().mockResolvedValue({ id: '3', status: 'draft' }),
      addProduct: jest.fn().mockResolvedValue(true),
      removeProduct: jest.fn().mockResolvedValue(true),
      setPricing: jest.fn().mockResolvedValue(true),
      activate: jest.fn().mockResolvedValue({ id: '3', status: 'active' }),
      archive: jest.fn().mockResolvedValue({ id: '3', status: 'archived' }),
      checkInventory: jest.fn().mockResolvedValue({ available: true }),
      getById: jest.fn().mockResolvedValue({ id: '3', status: 'active' }),
      list: jest.fn().mockResolvedValue([]),
    },
    analyticsService: {
      trackEvent: jest.fn().mockResolvedValue(true),
      getMetrics: jest.fn().mockResolvedValue({ total: 1000 }),
      getReport: jest.fn().mockResolvedValue({ data: [] }),
      exportData: jest.fn().mockResolvedValue({ url: 'http://example.com/export.csv' }),
      getRealTimeData: jest.fn().mockResolvedValue({ active: 50 }),
      aggregateData: jest.fn().mockResolvedValue({ aggregated: true }),
    },
    authService: {
      getCurrentUser: jest.fn().mockResolvedValue({ id: 'user1', role: 'editor' }),
      hasPermission: jest.fn().mockResolvedValue(true),
      login: jest.fn().mockResolvedValue({ token: 'token123' }),
      logout: jest.fn().mockResolvedValue(true),
    },
    notificationService: {
      show: jest.fn().mockResolvedValue(true),
      showError: jest.fn().mockResolvedValue(true),
      showSuccess: jest.fn().mockResolvedValue(true),
    },
  };
}

export async function setupIntegrationTest(): Promise<TestContext> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const mockServices = setupMockServices();

  return {
    queryClient,
    mockServices,
  };
}

export async function cleanupIntegrationTest(context: TestContext) {
  context.queryClient.clear();
  jest.clearAllMocks();
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderApp(
  component: React.ReactElement,
  options?: CustomRenderOptions
) {
  const queryClient = options?.queryClient || new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          {children}
        </NavigationContainer>
      </QueryClientProvider>
    );
  };

  return render(component, { wrapper: AllTheProviders, ...options });
}

export function createMockWorkflowData() {
  return {
    content: {
      id: 'content-1',
      title: 'Test Product',
      description: 'Product description',
      status: 'draft',
      images: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user1',
        version: 1,
      },
    },
    campaign: {
      id: 'campaign-1',
      name: 'Summer Sale',
      status: 'planned',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 604800000).toISOString(),
      contentIds: [],
      bundleIds: [],
      targetAudience: {
        segments: ['new_customers'],
        regions: ['US', 'CA'],
      },
      budget: 10000,
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
      },
    },
    bundle: {
      id: 'bundle-1',
      name: 'Starter Pack',
      status: 'draft',
      products: [],
      pricing: {
        regular: 99.99,
        discounted: 79.99,
        currency: 'USD',
      },
      inventory: {
        available: 100,
        reserved: 0,
        sold: 0,
      },
    },
    analytics: {
      contentViews: [],
      campaignMetrics: [],
      bundleSales: [],
      userEngagement: [],
    },
  };
}

export async function waitForStateChange(
  checkFn: () => boolean,
  timeout = 5000
): Promise<void> {
  const startTime = Date.now();
  while (!checkFn()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('State change timeout');
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export function validateWorkflowState(
  current: any,
  expected: any,
  fieldPath = ''
): void {
  Object.keys(expected).forEach(key => {
    const currentPath = fieldPath ? `${fieldPath}.${key}` : key;
    if (typeof expected[key] === 'object' && expected[key] !== null) {
      validateWorkflowState(current[key], expected[key], currentPath);
    } else {
      expect(current[key]).toBe(expected[key]);
    }
  });
}