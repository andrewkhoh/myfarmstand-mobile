import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';

export interface TestContext {
  queryClient: QueryClient;
  supabaseClient?: any;
  mockServices?: {
    analyticsService: {
      trackEvent: jest.Mock;
      exportData: jest.Mock;
      getRealTimeData: jest.Mock;
    };
    bundleService: {
      create: jest.Mock;
      activate: jest.Mock;
      getById: jest.Mock;
      update: jest.Mock;
    };
    contentService: {
      uploadImage: jest.Mock;
      create: jest.Mock;
      publish: jest.Mock;
      schedule: jest.Mock;
      getAnalytics: jest.Mock;
    };
    campaignService: {
      create: jest.Mock;
      update: jest.Mock;
      launch: jest.Mock;
      getById: jest.Mock;
      generateReport: jest.Mock;
    };
  };
}

export async function setupIntegrationTest(): Promise<TestContext> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const mockServices = {
    analyticsService: {
      trackEvent: jest.fn(),
      exportData: jest.fn(),
      getRealTimeData: jest.fn().mockResolvedValue({
        activeUsers: 100,
        pageViews: 500,
        events: []
      })
    },
    bundleService: {
      create: jest.fn().mockResolvedValue({ id: 'bundle-123', name: 'Test Bundle' }),
      activate: jest.fn().mockResolvedValue({ success: true }),
      getById: jest.fn().mockResolvedValue({ id: 'bundle-123', name: 'Test Bundle' }),
      update: jest.fn().mockResolvedValue({ id: 'bundle-123', name: 'Updated Bundle' })
    },
    contentService: {
      uploadImage: jest.fn().mockResolvedValue({ url: 'https://example.com/image.jpg' }),
      create: jest.fn().mockResolvedValue({ id: 'content-123', title: 'Test Content' }),
      publish: jest.fn().mockResolvedValue({ success: true }),
      schedule: jest.fn().mockResolvedValue({ id: 'schedule-123' }),
      getAnalytics: jest.fn().mockResolvedValue({ views: 1000, engagement: 0.5 })
    },
    campaignService: {
      create: jest.fn().mockResolvedValue({ id: 'campaign-123', name: 'Test Campaign' }),
      update: jest.fn().mockResolvedValue({ id: 'campaign-123', name: 'Updated Campaign' }),
      launch: jest.fn().mockResolvedValue({ success: true }),
      getById: jest.fn().mockResolvedValue({ id: 'campaign-123', name: 'Test Campaign' }),
      generateReport: jest.fn().mockResolvedValue({ data: {} })
    }
  };

  return {
    queryClient,
    mockServices
  };
}

export async function cleanupIntegrationTest(context: TestContext): Promise<void> {
  context.queryClient.clear();
}

export function renderApp(
  component: React.ReactElement,
  options?: { queryClient?: QueryClient }
) {
  const queryClient = options?.queryClient || new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        {component}
      </NavigationContainer>
    </QueryClientProvider>
  );
}

export function createMockWorkflowData() {
  return {
    campaign: {
      id: 'campaign-123',
      name: 'Test Campaign',
      status: 'draft',
      startDate: new Date(),
      endDate: new Date(),
      budget: 10000,
      objectives: ['Increase Sales'],
      targetAudience: 'Young Adults'
    },
    content: {
      id: 'content-123',
      type: 'image',
      url: 'https://example.com/image.jpg',
      title: 'Test Content'
    },
    bundle: {
      id: 'bundle-123',
      name: 'Test Bundle',
      products: []
    }
  };
}

export function validateWorkflowState(state: any, expectedState: any): void {
  Object.keys(expectedState).forEach(key => {
    expect(state[key]).toEqual(expectedState[key]);
  });
}