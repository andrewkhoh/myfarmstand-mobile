export const marketingKeys = {
  all: ['marketing'] as const,
  
  content: {
    all: () => [...marketingKeys.all, 'content'] as const,
    lists: () => [...marketingKeys.content.all(), 'list'] as const,
    list: (filters?: any) => [...marketingKeys.content.lists(), filters] as const,
    details: () => [...marketingKeys.content.all(), 'detail'] as const,
    detail: (id: string) => [...marketingKeys.content.details(), id] as const,
    pending: () => [...marketingKeys.content.all(), 'pending'] as const,
  },
  
  campaign: {
    all: () => [...marketingKeys.all, 'campaign'] as const,
    lists: () => [...marketingKeys.campaign.all(), 'list'] as const,
    list: (filters?: any) => [...marketingKeys.campaign.lists(), filters] as const,
    details: () => [...marketingKeys.campaign.all(), 'detail'] as const,
    detail: (id: string) => [...marketingKeys.campaign.details(), id] as const,
    performance: (id: string) => [...marketingKeys.campaign.detail(id), 'performance'] as const,
    active: () => [...marketingKeys.campaign.all(), 'active'] as const,
  },
  
  analytics: {
    all: () => [...marketingKeys.all, 'analytics'] as const,
    dashboard: () => [...marketingKeys.analytics.all(), 'dashboard'] as const,
    revenue: () => [...marketingKeys.analytics.all(), 'revenue'] as const,
  },
};