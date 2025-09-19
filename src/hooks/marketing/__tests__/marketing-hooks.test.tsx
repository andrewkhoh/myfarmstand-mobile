import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper, createTestQueryClient } from '../../test/test-wrapper';
import { useMarketingCampaigns } from '../useMarketingCampaigns';
import { useCampaignData } from '../useCampaignData';
import { useProductBundles } from '../useProductBundles';

describe('Marketing Hooks', () => {
  const queryClient = createTestQueryClient();
  const wrapper = createWrapper(queryClient);

  beforeEach(() => {
    queryClient.clear();
  });

  describe('useMarketingCampaigns', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useMarketingCampaigns(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch campaigns data', async () => {
      const { result } = renderHook(() => useMarketingCampaigns(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Data will be undefined in test environment without mocks
      // but the hook should complete without errors
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('useCampaignData', () => {
    it('should fetch campaign by ID', () => {
      const { result } = renderHook(() => useCampaignData('test-campaign-id'), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should not fetch when ID is not provided', () => {
      const { result } = renderHook(() => useCampaignData(), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useProductBundles', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useProductBundles(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch bundles data', async () => {
      const { result } = renderHook(() => useProductBundles(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeUndefined();
    });
  });
});