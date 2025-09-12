import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Supabase with inline implementation to avoid hoisting issues
jest.mock('@/config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn()
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn()
      }))
    },
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn()
    }
  }
}));

// Mock the service
jest.mock('../campaignService', () => ({
  campaignService: {
    createCampaign: jest.fn(),
    updateCampaign: jest.fn(),
    getCampaign: jest.fn(),
    deleteCampaign: jest.fn(),
    listCampaigns: jest.fn(),
    startCampaign: jest.fn(),
    pauseCampaign: jest.fn(),
    completeCampaign: jest.fn(),
    scheduleCampaign: jest.fn(),
    duplicateCampaign: jest.fn(),
    getCampaignMetrics: jest.fn(),
    updateTargeting: jest.fn(),
    addContent: jest.fn(),
    removeContent: jest.fn(),
    validateCampaignRules: jest.fn(),
    getCampaignContent: jest.fn(),
    calculateCampaignROI: jest.fn(),
    compareCampaigns: jest.fn(),
    searchCampaigns: jest.fn(),
    calculateAudienceSize: jest.fn()
  }
}));

describe('CampaignService', () => {
  let mockSupabase: any;
  let campaignService: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@/config/supabase').supabase;
    campaignService = require('../campaignService').campaignService;
  });
  
  describe('Campaign CRUD Operations', () => {
    it('should create a new campaign', async () => {
      const mockChain: any = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{
            id: 'camp123',
            name: 'Summer Sale',
            status: 'draft',
            start_date: '2025-06-01',
            end_date: '2025-08-31'
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await campaignService.createCampaign({
        name: 'Summer Sale',
        start_date: '2025-06-01',
        end_date: '2025-08-31',
        budget: 10000
      });
      
      expect(result.id).toBe('camp123');
      expect(result.status).toBe('draft');
    });

    it('should handle validation errors when creating campaign', async () => {
      const mockChain: any = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Start date must be before end date' }
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      await expect(campaignService.createCampaign({
        name: 'Invalid Campaign',
        start_date: '2025-08-31',
        end_date: '2025-06-01'
      })).rejects.toThrow('Start date must be before end date');
    });

    it('should update existing campaign', async () => {
      const mockChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{
            id: 'camp123',
            name: 'Updated Summer Sale',
            budget: 15000
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await campaignService.updateCampaign('camp123', {
        name: 'Updated Summer Sale',
        budget: 15000
      });
      
      expect(result.name).toBe('Updated Summer Sale');
      expect(result.budget).toBe(15000);
    });

    it('should get campaign by ID', async () => {
      const mockChain: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'camp123',
            name: 'Summer Sale',
            status: 'active',
            metrics: { impressions: 10000, clicks: 500 }
          },
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await campaignService.getCampaign('camp123');
      expect(result.status).toBe('active');
      expect(result.metrics.impressions).toBe(10000);
    });

    it('should soft delete campaign', async () => {
      const mockChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{
            id: 'camp123',
            deleted_at: '2025-01-15T10:00:00Z'
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await campaignService.deleteCampaign('camp123');
      expect(result.deleted_at).toBeDefined();
    });
  });
  
  describe('Campaign Lifecycle Management', () => {
    it('should start a scheduled campaign', async () => {
      const mockChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{
            id: 'camp123',
            status: 'active',
            started_at: '2025-06-01T00:00:00Z'
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await campaignService.startCampaign('camp123');
      expect(result.status).toBe('active');
      expect(result.started_at).toBeDefined();
    });

    it('should pause an active campaign', async () => {
      const mockChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{
            id: 'camp123',
            status: 'paused',
            paused_at: '2025-06-15T10:00:00Z'
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await campaignService.pauseCampaign('camp123');
      expect(result.status).toBe('paused');
      expect(result.paused_at).toBeDefined();
    });

    it('should complete a campaign', async () => {
      const mockChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{
            id: 'camp123',
            status: 'completed',
            completed_at: '2025-08-31T23:59:59Z'
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await campaignService.completeCampaign('camp123');
      expect(result.status).toBe('completed');
      expect(result.completed_at).toBeDefined();
    });

    it('should validate state transitions', async () => {
      await expect(campaignService.startCampaign('camp123', {
        from_status: 'completed'
      })).rejects.toThrow('Cannot start a completed campaign');
    });

    it('should schedule a campaign for future start', async () => {
      const mockChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{
            id: 'camp123',
            status: 'scheduled',
            scheduled_start: '2025-07-01T00:00:00Z'
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await campaignService.scheduleCampaign('camp123', {
        start_date: '2025-07-01',
        auto_start: true
      });
      
      expect(result.status).toBe('scheduled');
      expect(result.scheduled_start).toBeDefined();
    });
  });
  
  describe('Campaign Targeting', () => {
    it('should update campaign targeting criteria', async () => {
      const mockChain: any = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{
            id: 'camp123',
            targeting: {
              age_range: [25, 45],
              locations: ['US', 'CA'],
              interests: ['technology', 'gaming']
            }
          }],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await campaignService.updateTargeting('camp123', {
        age_range: [25, 45],
        locations: ['US', 'CA'],
        interests: ['technology', 'gaming']
      });
      
      expect(result.targeting.age_range).toEqual([25, 45]);
      expect(result.targeting.locations).toContain('US');
    });

    it('should validate targeting parameters', async () => {
      await expect(campaignService.updateTargeting('camp123', {
        age_range: [150, 200] // Invalid age range
      })).rejects.toThrow('Invalid age range');
    });

    it('should calculate target audience size', async () => {
      const mockChain: any = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            { user_id: '1' },
            { user_id: '2' },
            { user_id: '3' }
          ],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const size = await campaignService.calculateAudienceSize({
        age_range: [25, 45],
        locations: ['US']
      });
      
      expect(size).toBe(3);
    });
  });
  
  describe('Campaign Content Management', () => {
    it('should add content to campaign', async () => {
      const mockChain: any = {
        insert: jest.fn().mockResolvedValue({
          data: {
            campaign_id: 'camp123',
            content_id: 'content456',
            position: 1
          },
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await campaignService.addContent('camp123', 'content456', {
        position: 1
      });
      
      expect(result.content_id).toBe('content456');
      expect(result.position).toBe(1);
    });

    it('should remove content from campaign', async () => {
      const mockChain: any = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: { deleted: true },
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const result = await campaignService.removeContent('camp123', 'content456');
      expect(result.deleted).toBe(true);
    });

    it('should list campaign content', async () => {
      const mockChain: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            { content_id: 'content1', position: 1, type: 'banner' },
            { content_id: 'content2', position: 2, type: 'video' }
          ],
          error: null
        })
      };
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const content = await campaignService.getCampaignContent('camp123');
      expect(content).toHaveLength(2);
      expect(content[0].position).toBe(1);
    });
  });
  
  describe('Campaign Metrics and Analytics', () => {
    it('should retrieve campaign performance metrics', async () => {
      const mockChain: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
      };
      mockChain.single.mockResolvedValue({
        data: {
          impressions: 50000,
          clicks: 2500,
          conversions: 125,
          ctr: 0.05,
          conversion_rate: 0.05
        },
        error: null
      });
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const metrics = await campaignService.getCampaignMetrics('camp123');
      expect(metrics.impressions).toBe(50000);
      expect(metrics.ctr).toBe(0.05);
    });

    it('should calculate ROI for campaign', async () => {
      const mockChain: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
      };
      mockChain.single.mockResolvedValue({
        data: {
          budget_spent: 5000,
          revenue_generated: 15000
        },
        error: null
      });
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const roi = await campaignService.calculateCampaignROI('camp123');
      expect(roi.roi_percentage).toBe(200);
      expect(roi.profit).toBe(10000);
    });

    it('should compare campaign performance', async () => {
      const mockChain: any = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn()
      };
      mockChain.in.mockResolvedValue({
        data: [
          { id: 'camp1', ctr: 0.05, conversion_rate: 0.05 },
          { id: 'camp2', ctr: 0.03, conversion_rate: 0.02 }
        ],
        error: null
      });
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const comparison = await campaignService.compareCampaigns(['camp1', 'camp2']);
      expect(comparison.best_performer).toBe('camp1');
    });
  });
  
  describe('Campaign Duplication', () => {
    it('should duplicate campaign with new parameters', async () => {
      const mockChain: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
      };
      mockChain.single.mockResolvedValue({
        data: {
          id: 'camp123',
          name: 'Original Campaign',
          budget: 10000,
          targeting: { locations: ['US'] }
        },
        error: null
      });
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const duplicated = await campaignService.duplicateCampaign('camp123', {
        name: 'Copy of Original Campaign',
        budget: 12000
      });
      
      expect(duplicated.name).toBe('Copy of Original Campaign');
      expect(duplicated.budget).toBe(12000);
      expect(duplicated.id).not.toBe('camp123');
    });

    it('should duplicate campaign with content associations', async () => {
      const mockChain: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
      };
      mockChain.single.mockResolvedValue({
        data: {
          id: 'new123',
          name: 'Duplicated Campaign',
          content_count: 5
        },
        error: null
      });
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const duplicated = await campaignService.duplicateCampaign('camp123', {
        include_content: true
      });
      
      expect(duplicated.content_count).toBe(5);
    });
  });
  
  describe('Campaign Rules and Validation', () => {
    it('should validate campaign budget limits', async () => {
      await expect(campaignService.validateCampaignRules({
        budget: 100,
        min_budget: 1000
      })).rejects.toThrow('Budget below minimum threshold');
    });

    it('should validate campaign date ranges', async () => {
      await expect(campaignService.validateCampaignRules({
        start_date: '2025-01-01',
        end_date: '2024-12-31'
      })).rejects.toThrow('End date must be after start date');
    });

    it('should validate required content', async () => {
      const mockChain: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn()
      };
      mockChain.eq.mockResolvedValue({
        data: [],
        error: null
      });
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      await expect(campaignService.validateCampaignRules({
        campaign_id: 'camp123',
        require_content: true
      })).rejects.toThrow('Campaign requires at least one content item');
    });

    it('should validate targeting completeness', async () => {
      await expect(campaignService.validateCampaignRules({
        targeting: {},
        require_targeting: true
      })).rejects.toThrow('Campaign targeting is incomplete');
    });
  });
  
  describe('Campaign Search and Filtering', () => {
    it('should search campaigns by name', async () => {
      const mockChain: any = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn()
      };
      mockChain.order.mockResolvedValue({
        data: [
          { id: 'camp1', name: 'Summer Sale 2025' },
          { id: 'camp2', name: 'Summer Clearance' }
        ],
        error: null
      });
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const results = await campaignService.searchCampaigns('summer');
      expect(results).toHaveLength(2);
    });

    it('should filter campaigns by status', async () => {
      const mockChain: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn()
      };
      mockChain.order.mockResolvedValue({
        data: [
          { id: 'camp1', status: 'active' },
          { id: 'camp2', status: 'active' }
        ],
        error: null
      });
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const results = await campaignService.listCampaigns({
        status: 'active'
      });
      
      expect(results.every((c: any) => c.status === 'active')).toBe(true);
    });

    it('should filter campaigns by date range', async () => {
      const mockChain: any = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn()
      };
      mockChain.lte.mockResolvedValue({
        data: [
          { id: 'camp1', start_date: '2025-06-01' },
          { id: 'camp2', start_date: '2025-07-01' }
        ],
        error: null
      });
      
      mockSupabase.from.mockReturnValue(mockChain);
      
      const results = await campaignService.listCampaigns({
        start_date_from: '2025-06-01',
        start_date_to: '2025-08-31'
      });
      
      expect(results).toHaveLength(2);
    });
  });
});