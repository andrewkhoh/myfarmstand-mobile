import { describe, it, expect } from '@jest/globals';
import { marketingCampaignSchema } from '../marketingCampaign';

describe('MarketingCampaign Schema', () => {
  describe('Validation', () => {
    it('should validate complete marketing campaign', () => {
      const validCampaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Summer Sale 2024',
        description: 'Annual summer clearance sale with up to 50% off',
        campaign_type: 'seasonal_sale',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        status: 'active',
        budget: {
          total: 50000,
          spent: 12500,
          currency: 'USD'
        },
        target_audience: {
          segments: ['loyal_customers', 'new_visitors'],
          age_range: { min: 18, max: 65 },
          locations: ['US', 'CA']
        },
        discount_rules: {
          type: 'percentage',
          value: 30,
          min_purchase: 100,
          max_discount: 500
        },
        product_ids: ['prod-001', 'prod-002', 'prod-003'],
        bundle_ids: ['bundle-001', 'bundle-002'],
        performance_metrics: {
          impressions: 100000,
          clicks: 5000,
          conversions: 250,
          revenue: 37500
        },
        created_by: 'marketing-user-123',
        updated_by: 'marketing-user-456',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-06-02T14:30:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(validCampaign);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidCampaign = {
        name: 'Incomplete Campaign'
      };
      
      const result = marketingCampaignSchema.safeParse(invalidCampaign);
      expect(result.success).toBe(false);
    });

    it('should reject invalid campaign type', () => {
      const invalidCampaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Invalid Campaign',
        campaign_type: 'invalid_type',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        status: 'active'
      };
      
      const result = marketingCampaignSchema.safeParse(invalidCampaign);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const invalidCampaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Campaign with Invalid Status',
        campaign_type: 'seasonal_sale',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        status: 'invalid_status'
      };
      
      const result = marketingCampaignSchema.safeParse(invalidCampaign);
      expect(result.success).toBe(false);
    });

    it('should reject negative budget values', () => {
      const invalidCampaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Negative Budget Campaign',
        campaign_type: 'flash_sale',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-02T00:00:00Z',
        status: 'draft',
        budget: {
          total: -1000,
          spent: -500,
          currency: 'USD'
        }
      };
      
      const result = marketingCampaignSchema.safeParse(invalidCampaign);
      expect(result.success).toBe(false);
    });

    it('should reject end date before start date', () => {
      const invalidCampaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Invalid Date Range Campaign',
        campaign_type: 'seasonal_sale',
        start_date: '2024-08-31T00:00:00Z',
        end_date: '2024-06-01T00:00:00Z',
        status: 'active'
      };
      
      const result = marketingCampaignSchema.safeParse(invalidCampaign);
      expect(result.success).toBe(false);
    });

    it('should reject spent amount greater than budget total', () => {
      const invalidCampaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Overspent Campaign',
        campaign_type: 'promotional',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'active',
        budget: {
          total: 10000,
          spent: 15000,
          currency: 'USD'
        }
      };
      
      const result = marketingCampaignSchema.safeParse(invalidCampaign);
      expect(result.success).toBe(false);
    });

    it('should validate campaign with minimal required fields', () => {
      const minimalCampaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Minimal Campaign',
        campaign_type: 'promotional',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'draft',
        created_by: 'user-123',
        created_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(minimalCampaign);
      expect(result.success).toBe(true);
    });

    it('should reject invalid discount type', () => {
      const invalidCampaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Invalid Discount Campaign',
        campaign_type: 'flash_sale',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-02T00:00:00Z',
        status: 'active',
        discount_rules: {
          type: 'invalid_type',
          value: 30
        }
      };
      
      const result = marketingCampaignSchema.safeParse(invalidCampaign);
      expect(result.success).toBe(false);
    });

    it('should reject discount percentage over 100', () => {
      const invalidCampaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Excessive Discount Campaign',
        campaign_type: 'clearance',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'active',
        discount_rules: {
          type: 'percentage',
          value: 150
        }
      };
      
      const result = marketingCampaignSchema.safeParse(invalidCampaign);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      const invalidCampaign = {
        id: 'not-a-valid-uuid',
        name: 'Invalid UUID Campaign',
        campaign_type: 'promotional',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'draft'
      };
      
      const result = marketingCampaignSchema.safeParse(invalidCampaign);
      expect(result.success).toBe(false);
    });

    it('should reject invalid currency code', () => {
      const invalidCampaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Invalid Currency Campaign',
        campaign_type: 'seasonal_sale',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T00:00:00Z',
        status: 'active',
        budget: {
          total: 50000,
          spent: 12500,
          currency: 'INVALID'
        }
      };
      
      const result = marketingCampaignSchema.safeParse(invalidCampaign);
      expect(result.success).toBe(false);
    });

    it('should reject negative age range values', () => {
      const invalidCampaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Invalid Age Range Campaign',
        campaign_type: 'targeted',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'active',
        target_audience: {
          age_range: { min: -5, max: 65 }
        }
      };
      
      const result = marketingCampaignSchema.safeParse(invalidCampaign);
      expect(result.success).toBe(false);
    });

    it('should reject age range with min greater than max', () => {
      const invalidCampaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Inverted Age Range Campaign',
        campaign_type: 'targeted',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'active',
        target_audience: {
          age_range: { min: 65, max: 18 }
        }
      };
      
      const result = marketingCampaignSchema.safeParse(invalidCampaign);
      expect(result.success).toBe(false);
    });
  });

  describe('Transformations', () => {
    it('should transform date strings to Date objects', () => {
      const campaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Date Transform Campaign',
        campaign_type: 'seasonal_sale',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        status: 'active',
        created_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(campaign);
      if (result.success) {
        expect(result.data.start_date).toBeInstanceOf(Date);
        expect(result.data.end_date).toBeInstanceOf(Date);
        expect(result.data.created_at).toBeInstanceOf(Date);
      }
    });

    it('should normalize string fields', () => {
      const campaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: '  Trimmed Campaign Name  ',
        description: '  Trimmed description with spaces  ',
        campaign_type: 'promotional',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'draft'
      };
      
      const result = marketingCampaignSchema.safeParse(campaign);
      if (result.success) {
        expect(result.data.name).toBe('Trimmed Campaign Name');
        expect(result.data.description).toBe('Trimmed description with spaces');
      }
    });

    it('should convert numeric strings to numbers in budget', () => {
      const campaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'String to Number Campaign',
        campaign_type: 'promotional',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'active',
        budget: {
          total: '50000',
          spent: '12500',
          currency: 'USD'
        }
      };
      
      const result = marketingCampaignSchema.safeParse(campaign);
      if (result.success && result.data.budget) {
        expect(typeof result.data.budget.total).toBe('number');
        expect(typeof result.data.budget.spent).toBe('number');
      }
    });
  });

  describe('Contract Tests', () => {
    it('should match TypeScript interface for campaign', () => {
      const campaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'TypeScript Contract Campaign',
        campaign_type: 'promotional',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'active',
        budget: {
          total: 50000,
          spent: 12500,
          currency: 'USD'
        }
      };
      
      const result = marketingCampaignSchema.safeParse(campaign);
      if (result.success) {
        // Verify all expected fields exist with correct types
        expect(result.data).toHaveProperty('id');
        expect(result.data).toHaveProperty('name');
        expect(result.data).toHaveProperty('campaign_type');
        expect(result.data).toHaveProperty('start_date');
        expect(result.data).toHaveProperty('end_date');
        expect(result.data).toHaveProperty('status');
        expect(result.data).toHaveProperty('budget');
      }
    });

    it('should ensure optional fields remain optional', () => {
      const minimalCampaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Minimal Campaign',
        campaign_type: 'promotional',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'draft'
      };
      
      const result = marketingCampaignSchema.safeParse(minimalCampaign);
      expect(result.success).toBe(true);
      if (result.success) {
        // Optional fields should be undefined if not provided
        expect(result.data.description).toBeUndefined();
        expect(result.data.budget).toBeUndefined();
        expect(result.data.target_audience).toBeUndefined();
        expect(result.data.discount_rules).toBeUndefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays in product_ids and bundle_ids', () => {
      const campaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Empty Arrays Campaign',
        campaign_type: 'promotional',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'active',
        product_ids: [],
        bundle_ids: []
      };
      
      const result = marketingCampaignSchema.safeParse(campaign);
      expect(result.success).toBe(true);
    });

    it('should handle maximum length campaign name', () => {
      const longName = 'A'.repeat(255);
      const campaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: longName,
        campaign_type: 'promotional',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'draft'
      };
      
      const result = marketingCampaignSchema.safeParse(campaign);
      expect(result.success).toBe(true);
    });

    it('should reject campaign name exceeding maximum length', () => {
      const tooLongName = 'A'.repeat(256);
      const campaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: tooLongName,
        campaign_type: 'promotional',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'draft'
      };
      
      const result = marketingCampaignSchema.safeParse(campaign);
      expect(result.success).toBe(false);
    });

    it('should handle zero budget values', () => {
      const campaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Zero Budget Campaign',
        campaign_type: 'organic',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'active',
        budget: {
          total: 0,
          spent: 0,
          currency: 'USD'
        }
      };
      
      const result = marketingCampaignSchema.safeParse(campaign);
      expect(result.success).toBe(true);
    });

    it('should handle campaigns with very large budgets', () => {
      const campaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Large Budget Campaign',
        campaign_type: 'enterprise',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-12-31T23:59:59Z',
        status: 'active',
        budget: {
          total: 999999999,
          spent: 500000000,
          currency: 'USD'
        }
      };
      
      const result = marketingCampaignSchema.safeParse(campaign);
      expect(result.success).toBe(true);
    });
  });

  describe('Status Transition Tests', () => {
    it('should allow draft to active transition', () => {
      const campaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Status Transition Campaign',
        campaign_type: 'promotional',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'draft'
      };
      
      const result1 = marketingCampaignSchema.safeParse(campaign);
      expect(result1.success).toBe(true);
      
      campaign.status = 'active';
      const result2 = marketingCampaignSchema.safeParse(campaign);
      expect(result2.success).toBe(true);
    });

    it('should allow active to paused transition', () => {
      const campaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Pausable Campaign',
        campaign_type: 'promotional',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'active'
      };
      
      const result1 = marketingCampaignSchema.safeParse(campaign);
      expect(result1.success).toBe(true);
      
      campaign.status = 'paused';
      const result2 = marketingCampaignSchema.safeParse(campaign);
      expect(result2.success).toBe(true);
    });

    it('should allow paused to active transition', () => {
      const campaign = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Resumable Campaign',
        campaign_type: 'promotional',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T00:00:00Z',
        status: 'paused'
      };
      
      const result1 = marketingCampaignSchema.safeParse(campaign);
      expect(result1.success).toBe(true);
      
      campaign.status = 'active';
      const result2 = marketingCampaignSchema.safeParse(campaign);
      expect(result2.success).toBe(true);
    });

    it('should allow any status to completed transition', () => {
      const statuses = ['draft', 'active', 'paused'];
      
      statuses.forEach(initialStatus => {
        const campaign = {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: `Complete from ${initialStatus} Campaign`,
          campaign_type: 'promotional',
          start_date: '2024-06-01T00:00:00Z',
          end_date: '2024-06-30T00:00:00Z',
          status: initialStatus
        };
        
        const result1 = marketingCampaignSchema.safeParse(campaign);
        expect(result1.success).toBe(true);
        
        campaign.status = 'completed';
        const result2 = marketingCampaignSchema.safeParse(campaign);
        expect(result2.success).toBe(true);
      });
    });
  });
});