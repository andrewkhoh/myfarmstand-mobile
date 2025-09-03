import { Campaign, Content, MarketingAnalytics, ContentWorkflow, WorkflowStep } from '../../types/marketing.types';

// Mock data for testing
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Summer Sale 2025',
    description: 'Summer promotional campaign',
    status: 'active',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-08-31'),
    budget: 50000,
    metrics: {
      impressions: 150000,
      clicks: 7500,
      conversions: 375,
      ctr: 5,
      conversionRate: 5,
      spend: 25000,
      roi: 150
    },
    createdAt: new Date('2025-05-15'),
    updatedAt: new Date('2025-06-15')
  }
];

const mockContent: Content[] = [
  {
    id: '1',
    title: 'Summer Sale Announcement',
    type: 'blog',
    status: 'published',
    body: 'Get ready for amazing summer deals!',
    metadata: {
      tags: ['summer', 'sale', 'promotion'],
      category: 'promotions',
      seoTitle: 'Summer Sale 2025 - Up to 50% Off',
      seoDescription: 'Discover amazing summer deals with up to 50% off',
      keywords: ['summer sale', 'discount', 'promotion'],
      targetAudience: ['general']
    },
    campaignId: '1',
    authorId: 'user1',
    publishedAt: new Date('2025-06-01'),
    createdAt: new Date('2025-05-20'),
    updatedAt: new Date('2025-06-01')
  }
];

class MarketingService {
  private baseUrl = '/api/marketing';

  async getCampaigns(): Promise<Campaign[]> {
    // Simulate API delay
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Timer error:', error);
    }
    return [...mockCampaigns];
  }

  async createCampaign(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<Campaign> {
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Timer error:', error);
    }
    const newCampaign: Campaign = {
      ...campaign,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockCampaigns.push(newCampaign);
    return newCampaign;
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<void> {
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Timer error:', error);
    }
    const index = mockCampaigns.findIndex(c => c.id === id);
    if (index !== -1) {
      mockCampaigns[index] = { ...mockCampaigns[index], ...updates, updatedAt: new Date() };
    }
  }

  async deleteCampaign(id: string): Promise<void> {
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Timer error:', error);
    }
    const index = mockCampaigns.findIndex(c => c.id === id);
    if (index !== -1) {
      mockCampaigns.splice(index, 1);
    }
  }

  async getContent(): Promise<Content[]> {
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Timer error:', error);
    }
    return [...mockContent];
  }

  async createContent(content: Omit<Content, 'id' | 'createdAt' | 'updatedAt'>): Promise<Content> {
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Timer error:', error);
    }
    const newContent: Content = {
      ...content,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockContent.push(newContent);
    return newContent;
  }

  async updateContent(id: string, updates: Partial<Content>): Promise<void> {
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Timer error:', error);
    }
    const index = mockContent.findIndex(c => c.id === id);
    if (index !== -1) {
      mockContent[index] = { ...mockContent[index], ...updates, updatedAt: new Date() };
    }
  }

  async deleteContent(id: string): Promise<void> {
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Timer error:', error);
    }
    const index = mockContent.findIndex(c => c.id === id);
    if (index !== -1) {
      mockContent.splice(index, 1);
    }
  }

  async getAnalytics(): Promise<MarketingAnalytics> {
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Timer error:', error);
    }
    return {
      totalCampaigns: mockCampaigns.length,
      activeCampaigns: mockCampaigns.filter(c => c.status === 'active').length,
      totalContent: mockContent.length,
      publishedContent: mockContent.filter(c => c.status === 'published').length,
      overallMetrics: {
        impressions: 150000,
        clicks: 7500,
        conversions: 375,
        spend: 25000,
        roi: 150
      },
      performance: [
        { date: '2025-06-01', impressions: 50000, clicks: 2500, conversions: 125, spend: 8333 },
        { date: '2025-06-02', impressions: 50000, clicks: 2500, conversions: 125, spend: 8333 },
        { date: '2025-06-03', impressions: 50000, clicks: 2500, conversions: 125, spend: 8334 }
      ]
    };
  }

  async startWorkflow(contentId: string): Promise<ContentWorkflow> {
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Timer error:', error);
    }
    return {
      id: Date.now().toString(),
      contentId,
      steps: [
        { id: '1', name: 'Create Content', type: 'create', status: 'completed' },
        { id: '2', name: 'Review Content', type: 'review', status: 'in_progress' },
        { id: '3', name: 'Approve Content', type: 'approve', status: 'pending' },
        { id: '4', name: 'Publish Content', type: 'publish', status: 'pending' }
      ],
      currentStep: 1,
      status: 'in_progress',
      createdAt: new Date()
    };
  }

  async updateWorkflowStep(workflowId: string, stepId: string, updates: Partial<WorkflowStep>): Promise<void> {
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Timer error:', error);
    }
    // In real implementation, update the workflow step
  }

  async completeWorkflow(workflowId: string): Promise<void> {
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Timer error:', error);
    }
    // In real implementation, complete the workflow
  }
}

export const marketingService = new MarketingService();
