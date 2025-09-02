import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentService, campaignService, bundleService, analyticsService, workflowService } from './services';
import type { Content, Campaign, Bundle, ContentStatus, CampaignStatus } from './schema';

// Query key factories
export const marketingKeys = {
  all: ['marketing'] as const,
  
  content: {
    all: () => [...marketingKeys.all, 'content'] as const,
    lists: () => [...marketingKeys.content.all(), 'list'] as const,
    list: (filters?: any) => [...marketingKeys.content.lists(), filters] as const,
    details: () => [...marketingKeys.content.all(), 'detail'] as const,
    detail: (id: string) => [...marketingKeys.content.details(), id] as const,
    workflow: (id: string) => [...marketingKeys.content.detail(id), 'workflow'] as const,
    versions: (id: string) => [...marketingKeys.content.detail(id), 'versions'] as const,
  },
  
  campaigns: {
    all: () => [...marketingKeys.all, 'campaigns'] as const,
    lists: () => [...marketingKeys.campaigns.all(), 'list'] as const,
    list: (filters?: any) => [...marketingKeys.campaigns.lists(), filters] as const,
    details: () => [...marketingKeys.campaigns.all(), 'detail'] as const,
    detail: (id: string) => [...marketingKeys.campaigns.details(), id] as const,
    performance: (id: string) => [...marketingKeys.campaigns.detail(id), 'performance'] as const,
  },
  
  bundles: {
    all: () => [...marketingKeys.all, 'bundles'] as const,
    lists: () => [...marketingKeys.bundles.all(), 'list'] as const,
    list: (filters?: any) => [...marketingKeys.bundles.lists(), filters] as const,
    details: () => [...marketingKeys.bundles.all(), 'detail'] as const,
    detail: (id: string) => [...marketingKeys.bundles.details(), id] as const,
    availability: (id: string) => [...marketingKeys.bundles.detail(id), 'availability'] as const,
  },
  
  analytics: {
    all: () => [...marketingKeys.all, 'analytics'] as const,
    dashboard: (params: any) => [...marketingKeys.analytics.all(), 'dashboard', params] as const,
    content: (id: string, params: any) => [...marketingKeys.analytics.all(), 'content', id, params] as const,
    campaign: (id: string, params: any) => [...marketingKeys.analytics.all(), 'campaign', id, params] as const,
    bundle: (id: string, params: any) => [...marketingKeys.analytics.all(), 'bundle', id, params] as const,
    realtime: () => [...marketingKeys.analytics.all(), 'realtime'] as const,
  }
};

// Content Hooks
export const useContent = (id?: string, filters?: { status?: ContentStatus; type?: string }) => {
  return useQuery({
    queryKey: id ? marketingKeys.content.detail(id) : marketingKeys.content.list(filters),
    queryFn: async () => {
      if (id) {
        return contentService.getById(id);
      }
      if (filters?.status) {
        return contentService.getByStatus(filters.status);
      }
      return contentService.getAll();
    },
    enabled: true
  });
};

export const useCreateContent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<Content, 'id' | 'createdAt' | 'updatedAt'>) => contentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.content.lists() });
    }
  });
};

export const useUpdateContent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Content> }) => 
      contentService.update(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.content.detail(id) });
      queryClient.invalidateQueries({ queryKey: marketingKeys.content.lists() });
    }
  });
};

export const useDeleteContent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => contentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.content.lists() });
    }
  });
};

export const useContentWorkflow = () => {
  const queryClient = useQueryClient();
  
  const transition = async (contentId: string, to: ContentStatus, metadata?: any) => {
    const result = await workflowService.transition(contentId, to, metadata);
    queryClient.invalidateQueries({ queryKey: marketingKeys.content.detail(contentId) });
    queryClient.invalidateQueries({ queryKey: marketingKeys.content.workflow(contentId) });
    return result;
  };
  
  const batchTransition = async (contentIds: string[], to: ContentStatus, metadata?: any) => {
    const result = await workflowService.batchTransition(contentIds, to, metadata);
    contentIds.forEach(id => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.content.detail(id) });
    });
    queryClient.invalidateQueries({ queryKey: marketingKeys.content.lists() });
    return result;
  };
  
  return {
    transition,
    batchTransition,
    canTransition: workflowService.canTransition.bind(workflowService),
    getAvailableTransitions: workflowService.getAvailableTransitions.bind(workflowService)
  };
};

export const useContentActions = (contentId: string) => {
  const queryClient = useQueryClient();
  
  const schedule = useMutation({
    mutationFn: (scheduledFor: string) => contentService.schedule(contentId, scheduledFor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.content.detail(contentId) });
    }
  });
  
  const publish = useMutation({
    mutationFn: () => contentService.publish(contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.content.detail(contentId) });
    }
  });
  
  const archive = useMutation({
    mutationFn: () => contentService.archive(contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.content.detail(contentId) });
    }
  });
  
  const duplicate = useMutation({
    mutationFn: () => contentService.duplicate(contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.content.lists() });
    }
  });
  
  return {
    schedule: schedule.mutateAsync,
    publish: publish.mutateAsync,
    archive: archive.mutateAsync,
    duplicate: duplicate.mutateAsync,
    isLoading: schedule.isPending || publish.isPending || archive.isPending || duplicate.isPending
  };
};

// Campaign Hooks
export const useCampaigns = (id?: string, filters?: { status?: CampaignStatus }) => {
  return useQuery({
    queryKey: id ? marketingKeys.campaigns.detail(id) : marketingKeys.campaigns.list(filters),
    queryFn: async () => {
      if (id) {
        return campaignService.getById(id);
      }
      if (filters?.status) {
        return campaignService.getByStatus(filters.status);
      }
      return campaignService.getAll();
    },
    enabled: true
  });
};

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>) => campaignService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.campaigns.lists() });
    }
  });
};

export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Campaign> }) => 
      campaignService.update(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.campaigns.detail(id) });
      queryClient.invalidateQueries({ queryKey: marketingKeys.campaigns.lists() });
    }
  });
};

export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => campaignService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.campaigns.lists() });
    }
  });
};

export const useCampaignActions = (campaignId: string) => {
  const queryClient = useQueryClient();
  
  const activate = async () => {
    const result = await campaignService.activate(campaignId);
    queryClient.invalidateQueries({ queryKey: marketingKeys.campaigns.detail(campaignId) });
    return result;
  };
  
  const pause = async () => {
    const result = await campaignService.pause(campaignId);
    queryClient.invalidateQueries({ queryKey: marketingKeys.campaigns.detail(campaignId) });
    return result;
  };
  
  const complete = async () => {
    const result = await campaignService.complete(campaignId);
    queryClient.invalidateQueries({ queryKey: marketingKeys.campaigns.detail(campaignId) });
    return result;
  };
  
  const addContent = async (contentIds: string[]) => {
    const result = await campaignService.addContent(campaignId, contentIds);
    queryClient.invalidateQueries({ queryKey: marketingKeys.campaigns.detail(campaignId) });
    return result;
  };
  
  const removeContent = async (contentIds: string[]) => {
    const result = await campaignService.removeContent(campaignId, contentIds);
    queryClient.invalidateQueries({ queryKey: marketingKeys.campaigns.detail(campaignId) });
    return result;
  };
  
  const addBundles = async (bundleIds: string[]) => {
    const result = await campaignService.addBundles(campaignId, bundleIds);
    queryClient.invalidateQueries({ queryKey: marketingKeys.campaigns.detail(campaignId) });
    return result;
  };
  
  const removeBundles = async (bundleIds: string[]) => {
    const result = await campaignService.removeBundles(campaignId, bundleIds);
    queryClient.invalidateQueries({ queryKey: marketingKeys.campaigns.detail(campaignId) });
    return result;
  };
  
  return {
    activate,
    pause,
    complete,
    addContent,
    removeContent,
    addBundles,
    removeBundles
  };
};

export const useCampaignPerformance = (campaignId: string) => {
  return useQuery({
    queryKey: marketingKeys.campaigns.performance(campaignId),
    queryFn: () => campaignService.getPerformance(campaignId),
    enabled: !!campaignId
  });
};

// Bundle Hooks
export const useBundles = (id?: string, filters?: { active?: boolean; featured?: boolean }) => {
  return useQuery({
    queryKey: id ? marketingKeys.bundles.detail(id) : marketingKeys.bundles.list(filters),
    queryFn: async () => {
      if (id) {
        return bundleService.getById(id);
      }
      if (filters?.active) {
        return bundleService.getActive();
      }
      if (filters?.featured) {
        return bundleService.getFeatured();
      }
      return bundleService.getAll();
    },
    enabled: true
  });
};

export const useCreateBundle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<Bundle, 'id' | 'createdAt' | 'updatedAt'>) => bundleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.bundles.lists() });
    }
  });
};

export const useUpdateBundle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Bundle> }) => 
      bundleService.update(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.bundles.detail(id) });
      queryClient.invalidateQueries({ queryKey: marketingKeys.bundles.lists() });
    }
  });
};

export const useDeleteBundle = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => bundleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingKeys.bundles.lists() });
    }
  });
};

export const useBundleActions = (bundleId: string) => {
  const queryClient = useQueryClient();
  
  const activate = async () => {
    const result = await bundleService.activate(bundleId);
    queryClient.invalidateQueries({ queryKey: marketingKeys.bundles.detail(bundleId) });
    return result;
  };
  
  const deactivate = async () => {
    const result = await bundleService.deactivate(bundleId);
    queryClient.invalidateQueries({ queryKey: marketingKeys.bundles.detail(bundleId) });
    return result;
  };
  
  const calculatePricing = async (params: { discountPercentage?: number; discountAmount?: number }) => {
    return bundleService.calculatePricing(bundleId, params);
  };
  
  const checkAvailability = async () => {
    return bundleService.checkAvailability(bundleId);
  };
  
  const updateInventory = async (quantity: number) => {
    const result = await bundleService.updateInventory(bundleId, quantity);
    queryClient.invalidateQueries({ queryKey: marketingKeys.bundles.detail(bundleId) });
    queryClient.invalidateQueries({ queryKey: marketingKeys.bundles.availability(bundleId) });
    return result;
  };
  
  return {
    activate,
    deactivate,
    calculatePricing,
    checkAvailability,
    updateInventory
  };
};

export const useBundleAvailability = (bundleId: string) => {
  return useQuery({
    queryKey: marketingKeys.bundles.availability(bundleId),
    queryFn: () => bundleService.checkAvailability(bundleId),
    enabled: !!bundleId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });
};

// Analytics Hooks
export const useAnalytics = (params: { startDate: string; endDate: string; channels?: string[] }) => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: marketingKeys.analytics.dashboard(params),
    queryFn: () => analyticsService.getDashboard(params),
    enabled: !!params.startDate && !!params.endDate
  });
  
  const trackEvent = async (event: Parameters<typeof analyticsService.trackEvent>[0]) => {
    await analyticsService.trackEvent(event);
    // Invalidate relevant queries based on event type
    if (event.entityType === 'content') {
      queryClient.invalidateQueries({ 
        queryKey: marketingKeys.analytics.content(event.entityId, params) 
      });
    } else if (event.entityType === 'campaign') {
      queryClient.invalidateQueries({ 
        queryKey: marketingKeys.analytics.campaign(event.entityId, params) 
      });
    } else if (event.entityType === 'bundle') {
      queryClient.invalidateQueries({ 
        queryKey: marketingKeys.analytics.bundle(event.entityId, params) 
      });
    }
  };
  
  return {
    ...query,
    trackEvent
  };
};

export const useContentAnalytics = (contentId: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: marketingKeys.analytics.content(contentId, { startDate, endDate }),
    queryFn: () => analyticsService.getContentAnalytics(contentId, startDate, endDate),
    enabled: !!contentId && !!startDate && !!endDate
  });
};

export const useCampaignAnalytics = (campaignId: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: marketingKeys.analytics.campaign(campaignId, { startDate, endDate }),
    queryFn: () => analyticsService.getCampaignAnalytics(campaignId, startDate, endDate),
    enabled: !!campaignId && !!startDate && !!endDate
  });
};

export const useBundleAnalytics = (bundleId: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: marketingKeys.analytics.bundle(bundleId, { startDate, endDate }),
    queryFn: () => analyticsService.getBundleAnalytics(bundleId, startDate, endDate),
    enabled: !!bundleId && !!startDate && !!endDate
  });
};

export const useRealtimeAnalytics = () => {
  return useQuery({
    queryKey: marketingKeys.analytics.realtime(),
    queryFn: () => analyticsService.getRealTimeStats(),
    refetchInterval: 5000 // Refresh every 5 seconds
  });
};

export const useTopPerformers = (type: 'content' | 'campaign' | 'bundle', metric: 'views' | 'conversions' | 'revenue', limit = 10) => {
  return useQuery({
    queryKey: [...marketingKeys.analytics.all(), 'top-performers', { type, metric, limit }],
    queryFn: () => analyticsService.getTopPerformers({ type, metric, limit }),
    enabled: true
  });
};

export const useExportAnalytics = () => {
  return useMutation({
    mutationFn: (params: Parameters<typeof analyticsService.exportAnalytics>[0]) => 
      analyticsService.exportAnalytics(params)
  });
};

// Workflow History Hook
export const useWorkflowHistory = (contentId: string) => {
  return useQuery({
    queryKey: marketingKeys.content.workflow(contentId),
    queryFn: () => workflowService.getHistory(contentId),
    enabled: !!contentId
  });
};

// Version History Hook
export const useContentVersions = (contentId: string) => {
  return useQuery({
    queryKey: marketingKeys.content.versions(contentId),
    queryFn: () => contentService.getVersionHistory(contentId),
    enabled: !!contentId
  });
};

// Search Hooks
export const useContentSearch = (query: string, type?: string, tags?: string[]) => {
  return useQuery({
    queryKey: [...marketingKeys.content.lists(), 'search', { query, type, tags }],
    queryFn: () => contentService.search({ query, type, tags }),
    enabled: !!query
  });
};

export const useCampaignSearch = (query: string, channels?: string[], dateRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: [...marketingKeys.campaigns.lists(), 'search', { query, channels, dateRange }],
    queryFn: () => campaignService.search({ query, channels, dateRange }),
    enabled: !!query
  });
};

export const useBundleSearch = (query: string, tags?: string[], priceRange?: { min: number; max: number }) => {
  return useQuery({
    queryKey: [...marketingKeys.bundles.lists(), 'search', { query, tags, priceRange }],
    queryFn: () => bundleService.search({ query, tags, priceRange }),
    enabled: !!query
  });
};