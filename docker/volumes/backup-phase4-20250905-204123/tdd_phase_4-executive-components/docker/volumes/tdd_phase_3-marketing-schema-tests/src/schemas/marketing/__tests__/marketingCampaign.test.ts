import { describe, it, expect } from '@jest/globals';
// @ts-expect-error - Schema not implemented yet (RED phase)
import { marketingCampaignSchema } from '../marketingCampaign';

describe('MarketingCampaign Schema', () => {
  describe('Validation', () => {
    it('should validate complete marketing campaign', () => {
      const valid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Summer Sale 2024',
        description: 'Annual summer sale with discounts on all seasonal products',
        campaign_type: 'seasonal',
        status: 'active',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 50000.00,
        spent: 12500.50,
        target_audience: {
          segments: ['returning_customers', 'high_value'],
          age_range: { min: 25, max: 65 },
          locations: ['US', 'CA']
        },
        discount_rules: {
          type: 'percentage',
          value: 25,
          min_purchase: 100.00,
          applicable_products: ['category:summer', 'category:outdoor']
        },
        channels: ['email', 'social_media', 'website'],
        created_by: 'marketing_user1',
        updated_by: 'marketing_user2',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-06-01T08:30:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject missing required field: id', () => {
      const invalid = {
        name: 'Summer Sale 2024',
        description: 'Summer sale campaign',
        campaign_type: 'seasonal',
        status: 'active',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 50000.00,
        spent: 0,
        target_audience: { segments: ['all'] },
        discount_rules: { type: 'percentage', value: 20 },
        channels: ['email'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid campaign_type enum value', () => {
      const invalid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Invalid Campaign',
        description: 'Test campaign',
        campaign_type: 'invalid_type',
        status: 'active',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 10000.00,
        spent: 0,
        target_audience: { segments: ['all'] },
        discount_rules: { type: 'fixed', value: 10 },
        channels: ['email'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept all valid campaign types', () => {
      const types = ['seasonal', 'flash_sale', 'clearance', 'new_product', 'loyalty', 'referral'];
      
      types.forEach(type => {
        const data = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: `${type} Campaign`,
          description: 'Test campaign',
          campaign_type: type,
          status: 'draft',
          start_date: '2024-06-01T00:00:00Z',
          end_date: '2024-08-31T23:59:59Z',
          budget: 10000.00,
          spent: 0,
          target_audience: { segments: ['all'] },
          discount_rules: { type: 'percentage', value: 10 },
          channels: ['email'],
          created_by: 'user1',
          updated_by: 'user1',
          created_at: '2024-05-15T10:00:00Z',
          updated_at: '2024-05-15T10:00:00Z'
        };
        
        const result = marketingCampaignSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid status enum value', () => {
      const invalid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Campaign',
        description: 'Test campaign',
        campaign_type: 'seasonal',
        status: 'invalid_status',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 10000.00,
        spent: 0,
        target_audience: { segments: ['all'] },
        discount_rules: { type: 'percentage', value: 10 },
        channels: ['email'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept all valid status values', () => {
      const statuses = ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'];
      
      statuses.forEach(status => {
        const data = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Test Campaign',
          description: 'Test campaign',
          campaign_type: 'seasonal',
          status: status,
          start_date: '2024-06-01T00:00:00Z',
          end_date: '2024-08-31T23:59:59Z',
          budget: 10000.00,
          spent: 0,
          target_audience: { segments: ['all'] },
          discount_rules: { type: 'percentage', value: 10 },
          channels: ['email'],
          created_by: 'user1',
          updated_by: 'user1',
          created_at: '2024-05-15T10:00:00Z',
          updated_at: '2024-05-15T10:00:00Z'
        };
        
        const result = marketingCampaignSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject negative budget amount', () => {
      const invalid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Campaign',
        description: 'Test campaign',
        campaign_type: 'seasonal',
        status: 'draft',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: -1000.00,
        spent: 0,
        target_audience: { segments: ['all'] },
        discount_rules: { type: 'percentage', value: 10 },
        channels: ['email'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject spent amount exceeding budget', () => {
      const invalid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Campaign',
        description: 'Test campaign',
        campaign_type: 'seasonal',
        status: 'active',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 10000.00,
        spent: 15000.00,
        target_audience: { segments: ['all'] },
        discount_rules: { type: 'percentage', value: 10 },
        channels: ['email'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Date Range Validation', () => {
    it('should reject end_date before start_date', () => {
      const invalid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Campaign',
        description: 'Test campaign',
        campaign_type: 'seasonal',
        status: 'scheduled',
        start_date: '2024-08-01T00:00:00Z',
        end_date: '2024-07-01T00:00:00Z',
        budget: 10000.00,
        spent: 0,
        target_audience: { segments: ['all'] },
        discount_rules: { type: 'percentage', value: 10 },
        channels: ['email'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept same day start and end dates for flash sales', () => {
      const valid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Flash Sale',
        description: '24-hour flash sale',
        campaign_type: 'flash_sale',
        status: 'scheduled',
        start_date: '2024-07-01T00:00:00Z',
        end_date: '2024-07-01T23:59:59Z',
        budget: 5000.00,
        spent: 0,
        target_audience: { segments: ['all'] },
        discount_rules: { type: 'percentage', value: 50 },
        channels: ['email', 'push_notification'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-06-30T10:00:00Z',
        updated_at: '2024-06-30T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate long-running campaigns (over 1 year)', () => {
      const valid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Loyalty Program',
        description: 'Annual loyalty rewards program',
        campaign_type: 'loyalty',
        status: 'active',
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2025-12-31T23:59:59Z',
        budget: 100000.00,
        spent: 25000.00,
        target_audience: { segments: ['loyalty_members'] },
        discount_rules: { type: 'tiered', value: 0, tiers: [5, 10, 15] },
        channels: ['email', 'app', 'website'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2023-12-01T10:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Discount Rules Validation', () => {
    it('should validate percentage discount with constraints', () => {
      const valid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Percentage Discount Campaign',
        description: 'Test campaign',
        campaign_type: 'seasonal',
        status: 'active',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 10000.00,
        spent: 0,
        target_audience: { segments: ['all'] },
        discount_rules: {
          type: 'percentage',
          value: 25,
          min_purchase: 50.00,
          max_discount: 100.00,
          applicable_products: ['SKU123', 'SKU456']
        },
        channels: ['email'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate fixed amount discount', () => {
      const valid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Fixed Discount Campaign',
        description: 'Test campaign',
        campaign_type: 'seasonal',
        status: 'active',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 10000.00,
        spent: 0,
        target_audience: { segments: ['all'] },
        discount_rules: {
          type: 'fixed',
          value: 10.00,
          min_purchase: 30.00
        },
        channels: ['website'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate BOGO (buy one get one) discount', () => {
      const valid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'BOGO Campaign',
        description: 'Buy one get one free',
        campaign_type: 'clearance',
        status: 'active',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-06-30T23:59:59Z',
        budget: 20000.00,
        spent: 5000.00,
        target_audience: { segments: ['all'] },
        discount_rules: {
          type: 'bogo',
          value: 1,
          buy_quantity: 1,
          get_quantity: 1,
          applicable_products: ['category:clearance']
        },
        channels: ['website', 'store'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject percentage discount over 100', () => {
      const invalid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Invalid Discount',
        description: 'Test campaign',
        campaign_type: 'seasonal',
        status: 'draft',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 10000.00,
        spent: 0,
        target_audience: { segments: ['all'] },
        discount_rules: {
          type: 'percentage',
          value: 150
        },
        channels: ['email'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject negative discount values', () => {
      const invalid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Invalid Discount',
        description: 'Test campaign',
        campaign_type: 'seasonal',
        status: 'draft',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 10000.00,
        spent: 0,
        target_audience: { segments: ['all'] },
        discount_rules: {
          type: 'fixed',
          value: -10
        },
        channels: ['email'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Target Audience Validation', () => {
    it('should validate complex target audience criteria', () => {
      const valid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Targeted Campaign',
        description: 'Highly targeted campaign',
        campaign_type: 'new_product',
        status: 'active',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-07-31T23:59:59Z',
        budget: 25000.00,
        spent: 3000.00,
        target_audience: {
          segments: ['high_value', 'frequent_buyers', 'early_adopters'],
          age_range: { min: 25, max: 45 },
          locations: ['US-CA', 'US-NY', 'US-TX'],
          interests: ['technology', 'gadgets', 'innovation'],
          purchase_history: {
            min_purchases: 5,
            timeframe_days: 365,
            categories: ['electronics', 'accessories']
          }
        },
        discount_rules: { type: 'percentage', value: 15 },
        channels: ['email', 'push_notification', 'social_media'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid age range (min > max)', () => {
      const invalid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Campaign',
        description: 'Test campaign',
        campaign_type: 'seasonal',
        status: 'draft',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 10000.00,
        spent: 0,
        target_audience: {
          segments: ['all'],
          age_range: { min: 50, max: 30 }
        },
        discount_rules: { type: 'percentage', value: 10 },
        channels: ['email'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept empty segments array for all customers', () => {
      const valid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Universal Campaign',
        description: 'Campaign for all customers',
        campaign_type: 'seasonal',
        status: 'active',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 50000.00,
        spent: 10000.00,
        target_audience: {
          segments: []
        },
        discount_rules: { type: 'percentage', value: 10 },
        channels: ['email', 'website'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Transformations', () => {
    it('should transform date strings to Date objects', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Campaign',
        description: 'Test campaign',
        campaign_type: 'seasonal',
        status: 'draft',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 10000.00,
        spent: 0,
        target_audience: { segments: ['all'] },
        discount_rules: { type: 'percentage', value: 10 },
        channels: ['email'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.start_date).toBeInstanceOf(Date);
        expect(result.data.end_date).toBeInstanceOf(Date);
        expect(result.data.created_at).toBeInstanceOf(Date);
        expect(result.data.updated_at).toBeInstanceOf(Date);
      }
    });

    it('should normalize and trim string fields', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: '  Summer Sale  ',
        description: '  Annual summer discount event  ',
        campaign_type: 'seasonal',
        status: 'draft',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 10000.00,
        spent: 0,
        target_audience: { segments: ['  all  '] },
        discount_rules: { type: 'percentage', value: 10 },
        channels: ['  email  '],
        created_by: '  user1  ',
        updated_by: '  user2  ',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Summer Sale');
        expect(result.data.description).toBe('Annual summer discount event');
        expect(result.data.created_by).toBe('user1');
        expect(result.data.updated_by).toBe('user2');
        expect(result.data.channels[0]).toBe('email');
      }
    });

    it('should round monetary values to 2 decimal places', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Campaign',
        description: 'Test campaign',
        campaign_type: 'seasonal',
        status: 'active',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 10000.999,
        spent: 2500.555,
        target_audience: { segments: ['all'] },
        discount_rules: { 
          type: 'fixed', 
          value: 9.999,
          min_purchase: 29.996
        },
        channels: ['email'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.budget).toBe(10001.00);
        expect(result.data.spent).toBe(2500.56);
        expect(result.data.discount_rules.value).toBe(10.00);
        expect(result.data.discount_rules.min_purchase).toBe(30.00);
      }
    });
  });

  describe('Contract Tests', () => {
    it('should match TypeScript interface for complete campaign', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Complete Campaign',
        description: 'Full featured campaign',
        campaign_type: 'seasonal',
        status: 'active',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 50000.00,
        spent: 12500.00,
        target_audience: {
          segments: ['high_value'],
          age_range: { min: 25, max: 65 },
          locations: ['US']
        },
        discount_rules: {
          type: 'percentage',
          value: 25,
          min_purchase: 100.00
        },
        channels: ['email', 'website'],
        created_by: 'user1',
        updated_by: 'user2',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-06-01T08:30:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(data);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(typeof result.data.id).toBe('string');
        expect(typeof result.data.name).toBe('string');
        expect(typeof result.data.description).toBe('string');
        expect(typeof result.data.campaign_type).toBe('string');
        expect(typeof result.data.status).toBe('string');
        expect(result.data.start_date).toBeInstanceOf(Date);
        expect(result.data.end_date).toBeInstanceOf(Date);
        expect(typeof result.data.budget).toBe('number');
        expect(typeof result.data.spent).toBe('number');
        expect(typeof result.data.target_audience).toBe('object');
        expect(typeof result.data.discount_rules).toBe('object');
        expect(Array.isArray(result.data.channels)).toBe(true);
        expect(typeof result.data.created_by).toBe('string');
        expect(typeof result.data.updated_by).toBe('string');
        expect(result.data.created_at).toBeInstanceOf(Date);
        expect(result.data.updated_at).toBeInstanceOf(Date);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum budget value', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'High Budget Campaign',
        description: 'Maximum budget test',
        campaign_type: 'seasonal',
        status: 'active',
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-12-31T23:59:59Z',
        budget: 999999999.99,
        spent: 0,
        target_audience: { segments: ['all'] },
        discount_rules: { type: 'percentage', value: 5 },
        channels: ['all'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should handle empty channels array', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'No Channel Campaign',
        description: 'Campaign with no channels',
        campaign_type: 'seasonal',
        status: 'draft',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 10000.00,
        spent: 0,
        target_audience: { segments: ['all'] },
        discount_rules: { type: 'percentage', value: 10 },
        channels: [],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should handle all available channels', () => {
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Omnichannel Campaign',
        description: 'Campaign using all channels',
        campaign_type: 'new_product',
        status: 'active',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 100000.00,
        spent: 25000.00,
        target_audience: { segments: ['all'] },
        discount_rules: { type: 'percentage', value: 20 },
        channels: ['email', 'sms', 'push_notification', 'social_media', 'website', 'app', 'store', 'affiliate'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-06-01T00:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.channels.length).toBe(8);
      }
    });

    it('should handle campaign name with maximum length (200 chars)', () => {
      const longName = 'Campaign ' + 'x'.repeat(191);
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: longName,
        description: 'Test campaign',
        campaign_type: 'seasonal',
        status: 'draft',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 10000.00,
        spent: 0,
        target_audience: { segments: ['all'] },
        discount_rules: { type: 'percentage', value: 10 },
        channels: ['email'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject campaign name exceeding maximum length', () => {
      const tooLongName = 'x'.repeat(201);
      const data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: tooLongName,
        description: 'Test campaign',
        campaign_type: 'seasonal',
        status: 'draft',
        start_date: '2024-06-01T00:00:00Z',
        end_date: '2024-08-31T23:59:59Z',
        budget: 10000.00,
        spent: 0,
        target_audience: { segments: ['all'] },
        discount_rules: { type: 'percentage', value: 10 },
        channels: ['email'],
        created_by: 'user1',
        updated_by: 'user1',
        created_at: '2024-05-15T10:00:00Z',
        updated_at: '2024-05-15T10:00:00Z'
      };
      
      const result = marketingCampaignSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});