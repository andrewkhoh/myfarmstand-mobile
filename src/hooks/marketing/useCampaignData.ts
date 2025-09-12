import { useQuery } from '@tanstack/react-query';
import { MarketingCampaign } from '@/types/marketing';

interface CampaignDataParams {
  campaignId?: string;
  status?: 'draft' | 'scheduled' | 'active' | 'completed' | 'all';
  type?: 'email' | 'social' | 'sms' | 'multi-channel' | 'all';
}

const mockCampaigns: MarketingCampaign[] = [
  {
    id: 'campaign_1',
    name: 'Summer Sale 2024',
    description: 'Seasonal promotion for summer products',
    type: 'multi-channel',
    status: 'active',
    startDate: '2024-06-01',
    endDate: '2024-08-31',
    targetAudience: ['existing_customers', 'newsletter_subscribers'],
    budget: 5000,
    createdAt: '2024-05-15T10:00:00Z',
    updatedAt: '2024-06-01T09:00:00Z',
    metrics: {
      impressions: 15000,
      clicks: 1200,
      conversions: 89,
      revenue: 4567.89,
    },
  },
  {
    id: 'campaign_2',
    name: 'New Product Launch',
    description: 'Email campaign for new organic produce line',
    type: 'email',
    status: 'scheduled',
    startDate: '2024-07-15',
    targetAudience: ['all_customers'],
    budget: 2000,
    createdAt: '2024-06-20T14:30:00Z',
    updatedAt: '2024-06-20T14:30:00Z',
    metrics: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    },
  },
];

export const useCampaignData = (params: CampaignDataParams = {}) => {
  const { campaignId, status = 'all', type = 'all' } = params;

  return useQuery({
    queryKey: ['campaigns', campaignId, status, type],
    queryFn: async (): Promise<MarketingCampaign | MarketingCampaign[]> => {
      // Simulate API call
      return new Promise((resolve) => {
        setTimeout(() => {
          if (campaignId) {
            const campaign = mockCampaigns.find(c => c.id === campaignId);
            resolve(campaign || mockCampaigns[0]);
          } else {
            let filtered = [...mockCampaigns];
            
            if (status !== 'all') {
              filtered = filtered.filter(c => c.status === status);
            }
            
            if (type !== 'all') {
              filtered = filtered.filter(c => c.type === type);
            }
            
            resolve(filtered);
          }
        }, 500);
      });
    },
    enabled: true,
  });
};