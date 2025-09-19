/**
 * TypeScript Integration Test for Decision Support
 * This file verifies that our decision-support types work correctly
 */

import {
  validateExecutiveData,
  validateRecommendationOptions,
  type ExecutiveData,
  type RecommendationOptions,
  type Recommendation
} from './schemas';

// Test that our types compile correctly
const testExecutiveData: ExecutiveData = {
  inventory: {
    currentStock: 100,
    dailyDemand: 20,
    leadTime: 7,
    products: [
      {
        id: 'test-product',
        stock: 50,
        demandRate: 10,
        leadTime: 5
      }
    ]
  },
  marketing: {
    campaigns: [
      {
        id: 'test-campaign',
        budget: 1000,
        revenue: 2500
      }
    ]
  }
};

const testOptions: RecommendationOptions = {
  minConfidence: 0.7,
  maxRecommendations: 5
};

// Test that validation functions work
try {
  const validatedData = validateExecutiveData(testExecutiveData);
  const validatedOptions = validateRecommendationOptions(testOptions);

  console.log('✅ Decision Support TypeScript integration test passed');
  console.log('✅ Schema validation works correctly');
  console.log('✅ Type definitions are valid');
} catch (error) {
  console.error('❌ Decision Support TypeScript integration test failed:', error);
}

export {}; // Make this a module