import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMockSupabaseClient, createMockLogger } from '@/test/serviceSetup';

// Mock Supabase FIRST
jest.mock('@/config/supabase', () => ({
  supabase: createMockSupabaseClient()
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: createMockLogger()
}));

// Mock the service (it doesn't exist yet - RED phase)
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
    cloneCampaign: jest.fn(),
    getCampaignMetrics: jest.fn(),
    updateTargetAudience: jest.fn(),
    addCampaignContent: jest.fn(),
    removeCampaignContent: jest.fn(),
    getCampaignPerformance: jest.fn(),
    validateCampaign: jest.fn()
  }
}));

describe('CampaignService', () => {
  let mockSupabase: any;
  let mockLogger: any;
  let campaignService: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = require('@/config/supabase').supabase;
    mockLogger = require('@/utils/logger').logger;
    campaignService = require('../campaignService').campaignService;
    
    // Setup default mock behaviors
    setupDefaultMocks();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  function setupDefaultMocks() {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis() as any,
      insert: jest.fn().mockReturnThis() as any,
      update: jest.fn().mockReturnThis() as any,
      delete: jest.fn().mockReturnThis() as any,
      eq: jest.fn().mockReturnThis() as any,
      neq: jest.fn().mockReturnThis() as any,
      in: jest.fn().mockReturnThis() as any,
      gte: jest.fn().mockReturnThis() as any,
      lte: jest.fn().mockReturnThis() as any,
      order: jest.fn().mockReturnThis() as any,
      limit: jest.fn().mockReturnThis() as any,
      single: jest.fn().mockResolvedValue({ data: null, error: null }) as any,
      execute: jest.fn().mockResolvedValue({ data: [], error: null }) as any
    });
  }
  
  describe('createCampaign', () => {
    it('should create campaign with planning status', async () => {
      const mockData = {
        name: 'Summer Sale Campaign',
        description: 'Annual summer sale promotion',
        type: 'promotional',
        start_date: '2024-06-01',
        end_date: '2024-08-31',
        budget: 50000,
        target_audience: {
          demographics: ['25-45'],
          interests: ['fashion', 'outdoor']
        }
      };
      
      const expectedResult = {
        id: 'campaign-123',
        ...mockData,
        status: 'planning',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [expectedResult],
            error: null
          } as any)
        } as any)
      } as any);
      
      // This will fail - service doesn't exist (RED phase)
      const result = await campaignService.createCampaign(mockData);
      
      expect(result).toEqual(expectedResult);
      expect(result.status).toBe('planning');
      expect(mockSupabase.from).toHaveBeenCalledWith('marketing_campaigns');
    });
    
    it('should validate campaign dates', async () => {
      const invalidData = {
        name: 'Invalid Campaign',
        start_date: '2024-06-01',
        end_date: '2024-05-01' // End before start
      };
      
      await expect(campaignService.createCampaign(invalidData))
        .rejects.toThrow('End date must be after start date');
    });
    
    it('should validate budget constraints', async () => {
      const invalidData = {
        name: 'Zero Budget Campaign',
        budget: -1000
      };
      
      await expect(campaignService.createCampaign(invalidData))
        .rejects.toThrow('Budget must be positive');
    });
    
    it('should handle database errors during creation', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          } as any)
        } as any)
      } as any);
      
      await expect(campaignService.createCampaign({ name: 'Test' }))
        .rejects.toThrow('Failed to create campaign');
      
      expect(mockLogger.error).toHaveBeenCalled();
    });
    
    it('should set default values for optional fields', async () => {
      const minimalData = {
        name: 'Minimal Campaign'
      };
      
      const result = await campaignService.createCampaign(minimalData);
      
      expect(result.status).toBe('planning');
      expect(result.type).toBe('standard');
      expect(result.channels).toEqual(['email']);
    });
  });
  
  describe('updateCampaign', () => {
    it('should update existing campaign', async () => {
      const campaignId = 'campaign-123';
      const updateData = {
        name: 'Updated Campaign Name',
        budget: 75000
      };
      
      const expectedResult = {
        id: campaignId,
        ...updateData,
        updated_at: new Date().toISOString()
      };
      
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [expectedResult],
              error: null
            } as any)
          } as any)
        } as any)
      } as any);
      
      const result = await campaignService.updateCampaign(campaignId, updateData);
      
      expect(result).toEqual(expectedResult);
    });
    
    it('should prevent updates to active campaigns', async () => {
      const campaignId = 'campaign-123';
      
      // Get campaign to check status
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: campaignId, status: 'active' },
              error: null
            } as any)
          } as any)
        } as any)
      } as any);
      
      await expect(campaignService.updateCampaign(campaignId, { budget: 100000 }))
        .rejects.toThrow('Cannot update active campaign');
    });
    
    it('should handle campaign not found', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [],
              error: null
            } as any)
          } as any)
        } as any)
      } as any);
      
      await expect(campaignService.updateCampaign('non-existent', {}))
        .rejects.toThrow('Campaign not found');
    });
  });
  
  describe('Campaign Lifecycle', () => {
    describe('startCampaign', () => {
      it('should transition from planning to active', async () => {
        const campaignId = 'campaign-123';
        
        // Get current campaign
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { 
                  id: campaignId, 
                  status: 'planning',
                  start_date: new Date().toISOString()
                },
                error: null
              } as any)
            } as any)
          } as any)
        } as any);
        
        const result = await campaignService.startCampaign(campaignId);
        
        expect(result.status).toBe('active');
        expect(result.actual_start_date).toBeDefined();
      });
      
      it('should validate campaign is ready to start', async () => {
        const campaignId = 'campaign-123';
        
        // Campaign missing required content
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { 
                  id: campaignId, 
                  status: 'planning',
                  content_ids: []
                },
                error: null
              } as any)
            } as any)
          } as any)
        } as any);
        
        await expect(campaignService.startCampaign(campaignId))
          .rejects.toThrow('Campaign requires at least one content item');
      });
      
      it('should check start date is not in future', async () => {
        const campaignId = 'campaign-123';
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { 
                  id: campaignId, 
                  status: 'planning',
                  start_date: futureDate.toISOString()
                },
                error: null
              } as any)
            } as any)
          } as any)
        } as any);
        
        await expect(campaignService.startCampaign(campaignId))
          .rejects.toThrow('Campaign start date has not arrived');
      });
    });
    
    describe('pauseCampaign', () => {
      it('should pause active campaign', async () => {
        const campaignId = 'campaign-123';
        
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: campaignId, status: 'active' },
                error: null
              } as any)
            } as any)
          } as any)
        } as any);
        
        const result = await campaignService.pauseCampaign(campaignId);
        
        expect(result.status).toBe('paused');
        expect(result.paused_at).toBeDefined();
      });
      
      it('should only pause active campaigns', async () => {
        const campaignId = 'campaign-123';
        
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: campaignId, status: 'completed' },
                error: null
              } as any)
            } as any)
          } as any)
        } as any);
        
        await expect(campaignService.pauseCampaign(campaignId))
          .rejects.toThrow('Can only pause active campaigns');
      });
    });
    
    describe('completeCampaign', () => {
      it('should complete active campaign', async () => {
        const campaignId = 'campaign-123';
        
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: campaignId, status: 'active' },
                error: null
              } as any)
            } as any)
          } as any)
        } as any);
        
        const result = await campaignService.completeCampaign(campaignId);
        
        expect(result.status).toBe('completed');
        expect(result.actual_end_date).toBeDefined();
      });
      
      it('should calculate final metrics on completion', async () => {
        const campaignId = 'campaign-123';
        
        const result = await campaignService.completeCampaign(campaignId);
        
        expect(result.final_metrics).toBeDefined();
        expect(result.final_metrics.total_reach).toBeGreaterThanOrEqual(0);
        expect(result.final_metrics.conversion_rate).toBeGreaterThanOrEqual(0);
      });
    });
  });
  
  describe('scheduleCampaign', () => {
    it('should schedule campaign for future date', async () => {
      const campaignId = 'campaign-123';
      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + 7);
      
      const result = await campaignService.scheduleCampaign(
        campaignId, 
        scheduleDate.toISOString()
      );
      
      expect(result.status).toBe('scheduled');
      expect(result.scheduled_start_date).toBe(scheduleDate.toISOString());
    });
    
    it('should validate schedule date is in future', async () => {
      const campaignId = 'campaign-123';
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      await expect(
        campaignService.scheduleCampaign(campaignId, pastDate.toISOString())
      ).rejects.toThrow('Schedule date must be in the future');
    });
    
    it('should create scheduled job for auto-start', async () => {
      const campaignId = 'campaign-123';
      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + 1);
      
      await campaignService.scheduleCampaign(campaignId, scheduleDate.toISOString());
      
      // Should create a scheduled job
      expect(mockSupabase.from).toHaveBeenCalledWith('scheduled_jobs');
    });
  });
  
  describe('cloneCampaign', () => {
    it('should create copy of existing campaign', async () => {
      const sourceId = 'campaign-123';
      const cloneName = 'Cloned Campaign';
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: sourceId,
                name: 'Original Campaign',
                description: 'Original description',
                target_audience: { demographics: ['25-45'] }
              },
              error: null
            } as any)
          } as any)
        } as any)
      } as any);
      
      const result = await campaignService.cloneCampaign(sourceId, cloneName);
      
      expect(result.name).toBe(cloneName);
      expect(result.status).toBe('planning');
      expect(result.target_audience).toEqual({ demographics: ['25-45'] });
      expect(result.id).not.toBe(sourceId);
    });
    
    it('should reset status and dates for cloned campaign', async () => {
      const sourceId = 'campaign-123';
      
      const result = await campaignService.cloneCampaign(sourceId);
      
      expect(result.status).toBe('planning');
      expect(result.actual_start_date).toBeNull();
      expect(result.actual_end_date).toBeNull();
      expect(result.metrics).toEqual({});
    });
  });
  
  describe('Target Audience Management', () => {
    it('should update target audience', async () => {
      const campaignId = 'campaign-123';
      const newAudience = {
        demographics: ['18-24', '25-34'],
        interests: ['technology', 'gaming'],
        locations: ['US', 'CA']
      };
      
      const result = await campaignService.updateTargetAudience(campaignId, newAudience);
      
      expect(result.target_audience).toEqual(newAudience);
    });
    
    it('should validate audience parameters', async () => {
      const campaignId = 'campaign-123';
      const invalidAudience = {
        demographics: [], // Empty demographics
        interests: []
      };
      
      await expect(
        campaignService.updateTargetAudience(campaignId, invalidAudience)
      ).rejects.toThrow('Target audience must have at least one demographic');
    });
    
    it('should estimate audience reach', async () => {
      const campaignId = 'campaign-123';
      const audience = {
        demographics: ['25-34'],
        interests: ['fashion'],
        locations: ['US']
      };
      
      const result = await campaignService.updateTargetAudience(campaignId, audience);
      
      expect(result.estimated_reach).toBeGreaterThan(0);
    });
  });
  
  describe('Content Management', () => {
    it('should add content to campaign', async () => {
      const campaignId = 'campaign-123';
      const contentIds = ['content-1', 'content-2'];
      
      const result = await campaignService.addCampaignContent(campaignId, contentIds);
      
      expect(result.content_ids).toContain('content-1');
      expect(result.content_ids).toContain('content-2');
    });
    
    it('should validate content exists before adding', async () => {
      const campaignId = 'campaign-123';
      const contentIds = ['non-existent-content'];
      
      await expect(
        campaignService.addCampaignContent(campaignId, contentIds)
      ).rejects.toThrow('Content not found');
    });
    
    it('should remove content from campaign', async () => {
      const campaignId = 'campaign-123';
      const contentId = 'content-1';
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: campaignId,
                content_ids: ['content-1', 'content-2', 'content-3']
              },
              error: null
            } as any)
          } as any)
        } as any)
      } as any);
      
      const result = await campaignService.removeCampaignContent(campaignId, contentId);
      
      expect(result.content_ids).not.toContain('content-1');
      expect(result.content_ids).toHaveLength(2);
    });
  });
  
  describe('Metrics and Performance', () => {
    it('should get campaign metrics', async () => {
      const campaignId = 'campaign-123';
      
      const metrics = await campaignService.getCampaignMetrics(campaignId);
      
      expect(metrics).toHaveProperty('impressions');
      expect(metrics).toHaveProperty('clicks');
      expect(metrics).toHaveProperty('conversions');
      expect(metrics).toHaveProperty('roi');
    });
    
    it('should calculate campaign performance', async () => {
      const campaignId = 'campaign-123';
      
      const performance = await campaignService.getCampaignPerformance(campaignId);
      
      expect(performance).toHaveProperty('conversion_rate');
      expect(performance).toHaveProperty('click_through_rate');
      expect(performance).toHaveProperty('cost_per_acquisition');
    });
    
    it('should track performance over time', async () => {
      const campaignId = 'campaign-123';
      const dateRange = {
        start: '2024-06-01',
        end: '2024-06-30'
      };
      
      const performance = await campaignService.getCampaignPerformance(
        campaignId, 
        dateRange
      );
      
      expect(performance.timeline).toBeInstanceOf(Array);
      expect(performance.timeline.length).toBeGreaterThan(0);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Network timeout'))
      } as any);
      
      await expect(campaignService.getCampaign('campaign-123'))
        .rejects.toThrow('Network timeout');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Network timeout')
      );
    });
    
    it('should validate required fields', async () => {
      const invalidData = {};
      
      await expect(campaignService.createCampaign(invalidData))
        .rejects.toThrow('Campaign name is required');
    });
    
    it('should handle concurrent modifications', async () => {
      const campaignId = 'campaign-123';
      
      // Simulate version mismatch
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [],
                error: { code: 'PGRST301' }
              } as any)
            } as any)
          } as any)
        } as any)
      } as any);
      
      await expect(campaignService.updateCampaign(campaignId, {}))
        .rejects.toThrow('Campaign was modified by another user');
    });
  });
});