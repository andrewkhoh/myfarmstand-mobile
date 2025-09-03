import { useState, useEffect } from 'react';

export interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
}

export interface Content {
  id: string;
  title: string;
  type: 'blog' | 'social' | 'email' | 'video';
  status: 'draft' | 'review' | 'published';
  author: string;
  publishedAt?: string;
  engagement: number;
}

export interface Metrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalContent: number;
  publishedContent: number;
  totalBudget: number;
  totalSpent: number;
  avgEngagement: number;
}

export function useMarketingDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefetching(true);
      else setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setCampaigns([
        {
          id: '1',
          name: 'Q4 Product Launch',
          status: 'active',
          startDate: '2025-01-01',
          endDate: '2025-03-31',
          budget: 50000,
          spent: 23500,
          impressions: 150000,
          clicks: 3200
        },
        {
          id: '2',
          name: 'Holiday Campaign',
          status: 'active',
          startDate: '2025-02-01',
          endDate: '2025-02-28',
          budget: 30000,
          spent: 15000,
          impressions: 85000,
          clicks: 1800
        }
      ]);
      
      setContent([
        {
          id: '1',
          title: 'New Feature Announcement',
          type: 'blog',
          status: 'published',
          author: 'Marketing Team',
          publishedAt: '2025-01-15',
          engagement: 450
        },
        {
          id: '2',
          title: 'Customer Success Story',
          type: 'video',
          status: 'review',
          author: 'Content Team',
          engagement: 0
        }
      ]);
      
      setMetrics({
        totalCampaigns: 2,
        activeCampaigns: 2,
        totalContent: 2,
        publishedContent: 1,
        totalBudget: 80000,
        totalSpent: 38500,
        avgEngagement: 225
      });
      
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refetch = () => fetchData(true);

  return {
    campaigns,
    content,
    metrics,
    isLoading,
    error,
    refetch,
    isRefetching
  };
}
