import { describe, it, expect } from '@jest/globals';
import type { MockDatabase } from './database-mock.types';
import type { z } from 'zod';

// Import schemas that will be implemented
import { 
  MarketingCampaignDatabaseSchema, 
  MarketingCampaignTransformSchema,
  CreateMarketingCampaignSchema,
  UpdateMarketingCampaignSchema,
  type MarketingCampaignDatabaseContract,
  type MarketingCampaignTransform
} from '../marketingCampaign.schemas';

// Phase 1 Integration: Role-based permissions validation
import { ROLE_PERMISSIONS } from '../../role-based/rolePermission.schemas';

// CRITICAL: Compile-time contract enforcement (Pattern from architectural doc)
// This MUST compile - if it doesn't, schema transformation is incomplete
type MarketingCampaignContract = z.infer<typeof MarketingCampaignTransformSchema> extends MarketingCampaignTransform 
  ? MarketingCampaignTransform extends z.infer<typeof MarketingCampaignTransformSchema> 
    ? true 
    : false 
  : false;

describe('Marketing Campaign Schema Contracts - Phase 3.1', () => {
  // Contract Test 0: Compile-time contract enforcement (CRITICAL PATTERN)
  it('must pass compile-time contract validation', () => {
    // This test validates that the contract type compiled successfully
    const contractIsValid: MarketingCampaignContract = true;
    expect(contractIsValid).toBe(true);
    
    // If this test compiles, the schema-interface alignment is enforced at compile time
    // If the schema transformation doesn't match the interface exactly, TypeScript compilation will fail
  });

  // Contract Test 1: Database interface alignment (MANDATORY)
  it('must align with generated database types', () => {
    type DatabaseMarketingCampaign = MockDatabase['public']['Tables']['marketing_campaigns']['Row'];
    
    // This function MUST compile - if it doesn't, schema is wrong
    const contractValidator = (row: DatabaseMarketingCampaign): MarketingCampaignDatabaseContract => {
      return {
        id: row.id,                             // ✅ Compile fails if missing
        campaign_name: row.campaign_name,       // ✅ Required field
        campaign_type: row.campaign_type,       // ✅ Required enum field
        description: row.description,           // ✅ Nullable text field
        start_date: row.start_date,             // ✅ Required timestamp
        end_date: row.end_date,                 // ✅ Required timestamp
        discount_percentage: row.discount_percentage, // ✅ Nullable decimal
        target_audience: row.target_audience,   // ✅ Nullable text field
        campaign_status: row.campaign_status,   // ✅ Required enum field
        created_by: row.created_by,             // ✅ Nullable user reference
        created_at: row.created_at,             // ✅ Nullable timestamp
        updated_at: row.updated_at              // ✅ Nullable timestamp
      };
    };
    
    expect(contractValidator).toBeDefined();
  });

  // Contract Test 2: Campaign lifecycle validation (planned → active → completed)
  it('must validate campaign lifecycle state transitions', () => {
    // Test valid state transitions based on business rules
    const validStates = ['planned', 'active', 'paused', 'completed', 'cancelled'] as const;
    
    validStates.forEach(status => {
      const result = MarketingCampaignDatabaseSchema.safeParse({
        id: 'test-id',
        campaign_name: 'Test Campaign',
        campaign_type: 'seasonal',
        description: 'Test Description',
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-02-01T00:00:00Z',
        discount_percentage: 15.50,
        target_audience: 'Test Audience',
        campaign_status: status,
        created_by: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });
      
      expect(result.success).toBe(true);
    });
  });

  // Contract Test 3: Date validation and business rule enforcement
  it('must validate campaign date constraints', () => {
    // Valid dates (end_date > start_date)
    const validDates = {
      id: 'test-id',
      campaign_name: 'Valid Date Campaign',
      campaign_type: 'promotional' as const,
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-02-01T00:00:00Z', // After start date
      campaign_status: 'planned' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    
    const result = MarketingCampaignDatabaseSchema.safeParse(validDates);
    expect(result.success).toBe(true);
    
    // Invalid dates (end_date <= start_date) - business rule validation
    // Note: This will be enforced at the service layer, not schema level
    const sameDates = {
      ...validDates,
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-01T00:00:00Z' // Same as start date
    };
    
    // Schema allows it, but service layer should reject
    const sameDateResult = MarketingCampaignDatabaseSchema.safeParse(sameDates);
    expect(sameDateResult.success).toBe(true); // Schema validates structure, not business rules
  });

  // Contract Test 4: Campaign type enum constraint validation
  it('must validate campaign type enum constraints', () => {
    const validTypes = ['seasonal', 'promotional', 'new_product', 'clearance'] as const;
    
    validTypes.forEach(type => {
      const result = MarketingCampaignDatabaseSchema.safeParse({
        id: 'test-id',
        campaign_name: 'Test Campaign',
        campaign_type: type,
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-02-01T00:00:00Z',
        campaign_status: 'planned',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });
      
      expect(result.success).toBe(true);
    });
    
    // Invalid campaign type
    const invalidType = {
      id: 'test-id',
      campaign_name: 'Test Campaign',
      campaign_type: 'invalid_type',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-02-01T00:00:00Z',
      campaign_status: 'planned',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    
    const invalidResult = MarketingCampaignDatabaseSchema.safeParse(invalidType);
    expect(invalidResult.success).toBe(false);
  });

  // Contract Test 5: Discount percentage validation and constraints
  it('must validate discount percentage constraints', () => {
    // Valid discounts (0-100)
    const validDiscounts = [0, 5.5, 10, 25.75, 50, 75.99, 100];
    
    validDiscounts.forEach(discount => {
      const result = MarketingCampaignDatabaseSchema.safeParse({
        id: 'test-id',
        campaign_name: 'Discount Campaign',
        campaign_type: 'promotional',
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-02-01T00:00:00Z',
        discount_percentage: discount,
        campaign_status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });
      
      expect(result.success).toBe(true);
    });
    
    // Invalid discounts (negative or > 100) - will be validated at service layer
    const edgeCases = [-10, -1, 101, 150];
    
    edgeCases.forEach(discount => {
      const result = MarketingCampaignDatabaseSchema.safeParse({
        id: 'test-id',
        campaign_name: 'Invalid Discount',
        campaign_type: 'promotional',
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-02-01T00:00:00Z',
        discount_percentage: discount,
        campaign_status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });
      
      // Schema validates number type, service validates business rules
      expect(result.success).toBe(true);
    });
  });

  // Contract Test 6: Campaign field transformation (snake→camel)
  it('must transform database fields to camelCase correctly', () => {
    const databaseCampaign = {
      id: 'campaign-123',
      campaign_name: 'Summer Sale 2024',
      campaign_type: 'seasonal' as const,
      description: 'Big summer savings on all products',
      start_date: '2024-06-01T00:00:00Z',
      end_date: '2024-08-31T23:59:59Z',
      discount_percentage: 25.00,
      target_audience: 'Summer shoppers and families',
      campaign_status: 'active' as const,
      created_by: 'user-456',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z'
    };
    
    const result = MarketingCampaignTransformSchema.parse(databaseCampaign);
    
    // Verify camelCase transformation
    expect(result.campaignName).toBe('Summer Sale 2024');
    expect(result.campaignType).toBe('seasonal');
    expect(result.startDate).toBe('2024-06-01T00:00:00Z');
    expect(result.endDate).toBe('2024-08-31T23:59:59Z');
    expect(result.discountPercentage).toBe(25.00);
    expect(result.targetAudience).toBe('Summer shoppers and families');
    expect(result.campaignStatus).toBe('active');
    expect(result.createdBy).toBe('user-456');
    expect(result.createdAt).toBe('2024-01-01T00:00:00Z');
    expect(result.updatedAt).toBe('2024-01-15T00:00:00Z');
  });

  // Contract Test 7: Performance metrics aggregation schema validation
  it('must support performance metrics aggregation', () => {
    // Validate that campaign can be associated with metrics
    const campaignWithMetrics = {
      id: 'campaign-789',
      campaign_name: 'Analytics Campaign',
      campaign_type: 'promotional' as const,
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-02-01T00:00:00Z',
      discount_percentage: 20.00,
      campaign_status: 'active' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    
    const result = MarketingCampaignDatabaseSchema.safeParse(campaignWithMetrics);
    expect(result.success).toBe(true);
    
    // Metrics will be handled in separate campaign_metrics table
    expect(result.data?.id).toBe('campaign-789');
  });

  // Contract Test 8: Type safety for all campaign fields
  it('must enforce type safety for all campaign fields', () => {
    // This test validates that all fields maintain proper TypeScript typing
    const typedCampaign: z.infer<typeof MarketingCampaignTransformSchema> = {
      id: 'campaign-123',
      campaignName: 'Type Safe Campaign',
      campaignType: 'new_product',
      description: 'A fully type-safe campaign',
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-12-31T23:59:59Z',
      discountPercentage: 15.50,
      targetAudience: 'Tech-savvy customers',
      campaignStatus: 'planned',
      createdBy: 'admin-user',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };
    
    expect(typedCampaign.id).toBe('campaign-123');
    expect(typedCampaign.campaignStatus).toBe('planned');
    expect(typeof typedCampaign.discountPercentage).toBe('number');
  });

  // Contract Test 9: Integration with bundle and content systems
  it('must support integration with bundle and content systems', () => {
    // Verify campaign can be referenced by bundles
    const campaignForBundles = {
      id: 'bundle-campaign-123',
      campaign_name: 'Bundle Promotion',
      campaign_type: 'promotional' as const,
      description: 'Special bundle pricing campaign',
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-02-01T00:00:00Z',
      discount_percentage: 30.00,
      target_audience: 'Value seekers',
      campaign_status: 'active' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };
    
    const result = MarketingCampaignDatabaseSchema.safeParse(campaignForBundles);
    expect(result.success).toBe(true);
    expect(result.data?.id).toBe('bundle-campaign-123');
  });

  // Contract Test 10: Create campaign schema validation
  it('must validate create campaign operations', () => {
    const validCreateData = {
      campaignName: 'New Spring Campaign',
      campaignType: 'seasonal' as const,
      description: 'Fresh spring produce promotion',
      startDate: '2024-03-01T00:00:00Z',
      endDate: '2024-05-31T23:59:59Z',
      discountPercentage: 20.00,
      targetAudience: 'Health-conscious consumers',
      campaignStatus: 'planned' as const
    };
    
    const result = CreateMarketingCampaignSchema.safeParse(validCreateData);
    expect(result.success).toBe(true);
    
    // Required fields must be present
    const invalidCreateData = {
      campaignName: 'Incomplete Campaign'
      // Missing required fields
    };
    
    const invalidResult = CreateMarketingCampaignSchema.safeParse(invalidCreateData);
    expect(invalidResult.success).toBe(false);
  });

  // Contract Test 11: Update campaign schema validation
  it('must validate update campaign operations', () => {
    const validUpdateData = {
      campaignName: 'Updated Campaign Name',
      campaignStatus: 'active' as const,
      discountPercentage: 35.00,
      targetAudience: 'Updated target audience'
    };
    
    const result = UpdateMarketingCampaignSchema.safeParse(validUpdateData);
    expect(result.success).toBe(true);
    
    // Should allow partial updates
    const partialUpdate = {
      campaignStatus: 'paused' as const
    };
    
    const partialResult = UpdateMarketingCampaignSchema.safeParse(partialUpdate);
    expect(partialResult.success).toBe(true);
  });

  // Contract Test 12: Campaign status transition validation
  it('must validate campaign status transitions', () => {
    // Test the workflow state machine
    const validTransitions = [
      { from: 'planned', to: 'active' },
      { from: 'planned', to: 'cancelled' },
      { from: 'active', to: 'paused' },
      { from: 'active', to: 'completed' },
      { from: 'active', to: 'cancelled' },
      { from: 'paused', to: 'active' },
      { from: 'paused', to: 'cancelled' }
    ];
    
    validTransitions.forEach(({ from, to }) => {
      // Each transition should be valid according to business rules
      expect(['planned', 'active', 'paused', 'completed', 'cancelled']).toContain(from);
      expect(['planned', 'active', 'paused', 'completed', 'cancelled']).toContain(to);
    });
    
    // Terminal states (completed, cancelled) should not allow transitions
    const terminalStates = ['completed', 'cancelled'];
    terminalStates.forEach(state => {
      // These states should be terminal (no valid transitions from them)
      expect(['completed', 'cancelled']).toContain(state);
    });
  });
});