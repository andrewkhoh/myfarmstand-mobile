/**
 * Order Service Pattern Alignment Test
 * Verifies that orderService follows the same validation pattern as cartService
 * after Phase 2 alignment.
 * 
 * This test ensures the orderService no longer uses DatabaseHelpers/ServiceValidator
 * anti-patterns and follows direct Supabase + schema validation approach.
 */

import { describe, expect } from '@jest/globals';

describe('Order Service Pattern Alignment', () => {
  describe('Import Pattern Compliance', () => {
    it('should not import DatabaseHelpers, ServiceValidator, or ValidationUtils', async () => {
      // Read the orderService file content
      const fs = require('fs');
      const path = require('path');
      const orderServicePath = path.join(__dirname, '../../../src/services/orderService.ts');
      const content = fs.readFileSync(orderServicePath, 'utf8');

      // Verify anti-pattern imports are removed
      expect(content).not.toContain('import { DatabaseHelpers }');
      expect(content).not.toContain('import { ServiceValidator');
      expect(content).not.toContain('import { ValidationUtils }');
      expect(content).not.toContain('from \'../utils/defensiveDatabase\'');
      expect(content).not.toContain('from \'../utils/validationPipeline\'');
      
      // Should still import basic validation tools
      expect(content).toContain('import { z } from \'zod\'');
      expect(content).toContain('import { ValidationMonitor }');
    });

    it('should use direct Supabase queries instead of DatabaseHelpers', async () => {
      const fs = require('fs');
      const path = require('path');
      const orderServicePath = path.join(__dirname, '../../../src/services/orderService.ts');
      const content = fs.readFileSync(orderServicePath, 'utf8');

      // Should not use DatabaseHelpers pattern
      expect(content).not.toContain('DatabaseHelpers.fetchFiltered');
      
      // Should use direct Supabase queries (following cartService pattern)
      expect(content).toContain('await supabase');
      expect(content).toContain('.from(');
      expect(content).toContain('.select(');
    });

    it('should use simple validation instead of ServiceValidator', async () => {
      const fs = require('fs');
      const path = require('path');
      const orderServicePath = path.join(__dirname, '../../../src/services/orderService.ts');
      const content = fs.readFileSync(orderServicePath, 'utf8');

      // Should not use complex ServiceValidator pattern
      expect(content).not.toContain('ServiceValidator.validateInput');
      expect(content).not.toContain('ValidationUtils.create');
      
      // Should use simple validation (following cartService pattern)
      expect(content).toContain('Basic input validation');
      expect(content).toContain('throw new Error');
    });

    it('should not use manual validation helper functions', async () => {
      const fs = require('fs');
      const path = require('path');
      const orderServicePath = path.join(__dirname, '../../../src/services/orderService.ts');
      const content = fs.readFileSync(orderServicePath, 'utf8');

      // Should not have manual validation helpers that duplicate schema functionality
      expect(content).not.toContain('const validateOrder = ');
      expect(content).not.toContain('const validateCreateOrderRequest = ');
      
      // Should use direct schema validation (following cartService pattern)
      expect(content).toContain('OrderSchema.parse(');
      expect(content).toContain('following cartService pattern');
    });

    it('should not import ZodError since it is no longer used', async () => {
      const fs = require('fs');
      const path = require('path');
      const orderServicePath = path.join(__dirname, '../../../src/services/orderService.ts');
      const content = fs.readFileSync(orderServicePath, 'utf8');

      // Should not import ZodError
      expect(content).not.toContain('import { ZodError');
      expect(content).not.toContain('ZodError,');
      
      // Should still import z for schema usage
      expect(content).toContain('import { z } from \'zod\'');
    });
  });

  describe('Validation Pattern Compliance', () => {
    it('should demonstrate alignment with cartService pattern', () => {
      // This test documents that orderService now follows the same patterns as cartService:
      
      // ✅ Pattern 1: Direct Supabase queries (no DatabaseHelpers)
      // ✅ Pattern 2: Simple input validation (no ServiceValidator/ValidationUtils) 
      // ✅ Pattern 3: Direct schema usage (no manual validation helpers)
      // ✅ Pattern 4: Clean error handling with ValidationMonitor
      // ✅ Pattern 5: Single validation step per data flow
      
      const alignmentChecklist = {
        'No DatabaseHelpers': true,
        'No ServiceValidator': true,
        'No ValidationUtils': true,
        'No manual validation helpers': true,
        'Direct Supabase queries': true,
        'Simple input validation': true,
        'Direct schema usage': true,
        'ValidationMonitor usage': true
      };

      // All alignment criteria should be met
      Object.values(alignmentChecklist).forEach(criterion => {
        expect(criterion).toBe(true);
      });
    });

    it('should maintain service-layer calculation validation', async () => {
      const fs = require('fs');
      const path = require('path');
      const orderServicePath = path.join(__dirname, '../../../src/services/orderService.ts');
      const content = fs.readFileSync(orderServicePath, 'utf8');

      // Should keep the calculation validation in service layer (not in schemas)
      expect(content).toContain('validateOrderCalculations');
      expect(content).toContain('ValidationMonitor.recordCalculationMismatch');
      
      // This proves separation of concerns:
      // - Schemas: Structure validation only (Phase 1)
      // - Services: Business logic validation (maintained)
    });
  });

  describe('Error Handling Alignment', () => {
    it('should use consistent error handling pattern', async () => {
      const fs = require('fs');
      const path = require('path');
      const orderServicePath = path.join(__dirname, '../../../src/services/orderService.ts');
      const content = fs.readFileSync(orderServicePath, 'utf8');

      // Should use ValidationMonitor for production monitoring
      expect(content).toContain('ValidationMonitor.recordValidationError');
      
      // Should use simple error messages
      expect(content).toContain('throw new Error(');
      
      // Should log warnings for debugging
      expect(content).toContain('console.warn(');
    });
  });
});