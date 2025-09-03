import { useState, useEffect, useCallback } from 'react';
import { Campaign, Content, MarketingAnalytics } from '../../types/marketing.types';
import { marketingService } from '../../services/marketing/marketingService';

export function useMarketingData<T>(
  fetchFn: () => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

export function useCampaigns() {
  return useMarketingData(() => marketingService.getCampaigns());
}

export function useContent() {
  return useMarketingData(() => marketingService.getContent());
}

export function useMarketingAnalytics() {
  return useMarketingData(() => marketingService.getAnalytics());
}
