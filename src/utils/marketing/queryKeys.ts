export const marketingKeys = {
  all: ['marketing'] as const,
  
  content: {
    all: ['marketing', 'content'] as const,
    lists: () => [...marketingKeys.content.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...marketingKeys.content.lists(), { filters }] as const,
    details: () => [...marketingKeys.content.all, 'detail'] as const,
    detail: (id: string) => [...marketingKeys.content.details(), id] as const,
    workflow: (id: string) => [...marketingKeys.content.detail(id), 'workflow'] as const,
    versions: (id: string) => [...marketingKeys.content.detail(id), 'versions'] as const,
    analytics: (id: string) => [...marketingKeys.content.detail(id), 'analytics'] as const,
  },
  
  campaigns: {
    all: ['marketing', 'campaigns'] as const,
    lists: () => [...marketingKeys.campaigns.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...marketingKeys.campaigns.lists(), { filters }] as const,
    details: () => [...marketingKeys.campaigns.all, 'detail'] as const,
    detail: (id: string) => [...marketingKeys.campaigns.details(), id] as const,
    performance: (id: string) => [...marketingKeys.campaigns.detail(id), 'performance'] as const,
    content: (id: string) => [...marketingKeys.campaigns.detail(id), 'content'] as const,
  },
  
  bundles: {
    all: ['marketing', 'bundles'] as const,
    lists: () => [...marketingKeys.bundles.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...marketingKeys.bundles.lists(), { filters }] as const,
    details: () => [...marketingKeys.bundles.all, 'detail'] as const,
    detail: (id: string) => [...marketingKeys.bundles.details(), id] as const,
    items: (id: string) => [...marketingKeys.bundles.detail(id), 'items'] as const,
    analytics: (id: string) => [...marketingKeys.bundles.detail(id), 'analytics'] as const,
  },
  
  workflow: {
    all: ['marketing', 'workflow'] as const,
    states: () => [...marketingKeys.workflow.all, 'states'] as const,
    state: (id: string) => [...marketingKeys.workflow.states(), id] as const,
    transitions: () => [...marketingKeys.workflow.all, 'transitions'] as const,
    transition: (id: string, toState: string) => [...marketingKeys.workflow.transitions(), { id, toState }] as const,
  },
  
  analytics: {
    all: ['marketing', 'analytics'] as const,
    performance: () => [...marketingKeys.analytics.all, 'performance'] as const,
    engagement: () => [...marketingKeys.analytics.all, 'engagement'] as const,
    conversions: () => [...marketingKeys.analytics.all, 'conversions'] as const,
  }
};