import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '../useAuth';

interface CampaignData {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  targetAudience: string;
  budget: number;
  selectedProducts: string[];
}

interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  criteria: Record<string, any>;
}

interface AvailableProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl?: string;
}

interface UseCampaignDataResult {
  campaign: CampaignData | null;
  isLoading: boolean;
  audienceSegments: AudienceSegment[];
  availableProducts: AvailableProduct[];
  error?: Error | null;
}

export function useCampaignData(campaignId?: string): UseCampaignDataResult {
  const { data: user } = useCurrentUser();

  // Fetch specific campaign if campaignId is provided
  const campaignQuery = useQuery({
    queryKey: ['marketing', 'campaigns', campaignId],
    queryFn: async (): Promise<CampaignData | null> => {
      if (!campaignId) {
        return null;
      }

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Mock implementation for now - replace with actual service call
      const mockCampaign: CampaignData = {
        id: campaignId,
        name: 'Sample Campaign',
        description: 'This is a sample campaign',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        targetAudience: 'all-customers',
        budget: 1000,
        selectedProducts: ['product-1', 'product-2']
      };

      return mockCampaign;
    },
    enabled: !!campaignId && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });

  // Fetch audience segments
  const audienceQuery = useQuery({
    queryKey: ['marketing', 'audience-segments'],
    queryFn: async (): Promise<AudienceSegment[]> => {
      return [
        {
          id: 'all-customers',
          name: 'All Customers',
          description: 'All registered customers',
          criteria: {}
        },
        {
          id: 'premium-customers',
          name: 'Premium Customers',
          description: 'Customers with high purchase value',
          criteria: { minPurchaseValue: 100 }
        },
        {
          id: 'repeat-customers',
          name: 'Repeat Customers',
          description: 'Customers with multiple orders',
          criteria: { minOrderCount: 3 }
        }
      ];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000 // 30 minutes
  });

  // Fetch available products
  const productsQuery = useQuery({
    queryKey: ['marketing', 'available-products'],
    queryFn: async (): Promise<AvailableProduct[]> => {
      return [
        {
          id: 'product-1',
          name: 'Fresh Apples',
          price: 2.99,
          description: 'Crisp and sweet apples',
          imageUrl: '/images/apples.jpg'
        },
        {
          id: 'product-2',
          name: 'Organic Bananas',
          price: 1.99,
          description: 'Organic bananas',
          imageUrl: '/images/bananas.jpg'
        },
        {
          id: 'product-3',
          name: 'Fresh Carrots',
          price: 1.49,
          description: 'Crunchy orange carrots',
          imageUrl: '/images/carrots.jpg'
        }
      ];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000 // 20 minutes
  });

  return {
    campaign: campaignQuery.data || null,
    isLoading: campaignQuery.isLoading || audienceQuery.isLoading || productsQuery.isLoading,
    audienceSegments: audienceQuery.data || [],
    availableProducts: productsQuery.data || [],
    error: campaignQuery.error || audienceQuery.error || productsQuery.error
  };
}