export const marketingKeys = {
  all: ['marketing'] as const,
  
  content: {
    all: () => [...marketingKeys.all, 'content'] as const,
    lists: () => [...marketingKeys.content.all(), 'list'] as const,
    list: (filters?: any) => [...marketingKeys.content.lists(), filters] as const,
    details: () => [...marketingKeys.content.all(), 'details'] as const,
    detail: (id: string) => [...marketingKeys.content.details(), id] as const,
    workflow: (id: string) => [...marketingKeys.content.detail(id), 'workflow'] as const,
    uploads: (id: string) => [...marketingKeys.content.detail(id), 'uploads'] as const,
  },
  
  campaigns: {
    all: () => [...marketingKeys.all, 'campaigns'] as const,
    lists: () => [...marketingKeys.campaigns.all(), 'list'] as const,
    list: (filters?: any) => [...marketingKeys.campaigns.lists(), filters] as const,
    details: () => [...marketingKeys.campaigns.all(), 'details'] as const,
    detail: (id: string) => [...marketingKeys.campaigns.details(), id] as const,
    performance: (id: string) => [...marketingKeys.campaigns.detail(id), 'performance'] as const,
    analytics: (id: string) => [...marketingKeys.campaigns.detail(id), 'analytics'] as const,
  },
  
  bundles: {
    all: () => [...marketingKeys.all, 'bundles'] as const,
    lists: () => [...marketingKeys.bundles.all(), 'list'] as const,
    list: (filters?: any) => [...marketingKeys.bundles.lists(), filters] as const,
    details: () => [...marketingKeys.bundles.all(), 'details'] as const,
    detail: (id: string) => [...marketingKeys.bundles.details(), id] as const,
  },
  
  analytics: {
    all: () => [...marketingKeys.all, 'analytics'] as const,
    overview: () => [...marketingKeys.analytics.all(), 'overview'] as const,
    campaigns: () => [...marketingKeys.analytics.all(), 'campaigns'] as const,
    content: () => [...marketingKeys.analytics.all(), 'content'] as const,
    performance: (type: string) => [...marketingKeys.analytics.all(), 'performance', type] as const,
  },
  
  search: {
    all: () => [...marketingKeys.all, 'search'] as const,
    query: (query: string, filters?: any) => [...marketingKeys.search.all(), query, filters] as const,
  }
};