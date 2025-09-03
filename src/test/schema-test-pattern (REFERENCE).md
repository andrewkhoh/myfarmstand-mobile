# Schema Test Pattern Reference

## Test Structure Template

```typescript
import { describe, it, expect } from '@jest/globals';
// @ts-expect-error - Schema not implemented yet (RED phase)
import { schemaName } from '../schemaFile';

describe('[SchemaName] Schema', () => {
  describe('Validation', () => {
    it('should validate correct data', () => {
      const validData = {
        // Complete valid object with all required fields
      };
      const result = schemaName.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        // Missing required fields
      };
      const result = schemaName.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid field types', () => {
      const invalidData = {
        // Wrong types for fields
      };
      const result = schemaName.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Transformations', () => {
    it('should transform date strings to Date objects', () => {
      const data = {
        created_at: '2024-01-01T00:00:00Z'
      };
      const result = schemaName.safeParse(data);
      if (result.success) {
        expect(result.data.created_at).toBeInstanceOf(Date);
      }
    });
  });

  describe('Contract Tests', () => {
    it('should match TypeScript interface', () => {
      // Verify schema output matches expected interface
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values', () => {
      // Test min/max values, empty arrays, etc.
    });
  });
});
```

## Test Categories

1. **Validation Tests**: Verify valid/invalid data
2. **Transformation Tests**: Check data transformations
3. **Contract Tests**: Ensure TypeScript compatibility
4. **Edge Case Tests**: Handle boundary conditions
5. **State Transition Tests**: For workflow states