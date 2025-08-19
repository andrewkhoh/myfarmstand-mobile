/**
 * Kiosk Schema Aligned Pattern Tests
 * 
 * Purpose: Verify kiosk schemas follow transformation architecture
 * Test ID: KIOSK-SCHEMA-ALIGNED-001
 * Created: 2025-08-19
 * 
 * Traceable Requirements:
 * - REQ-001: Database-first validation (handle nullable fields)
 * - REQ-002: Single validation pass with transformation
 * - REQ-003: Raw → Transform schema separation
 * - REQ-004: Proper default application during transformation
 * - REQ-005: Internal metadata preservation
 */

import {
  KioskAuthRequestSchema,
  DbKioskSessionTransformSchema,
  DbStaffPinTransformSchema,
  KioskAuthResponseSchema,
  KioskSessionResponseSchema,
  KioskSessionsListResponseSchema,
  type KioskSession,
  type StaffPin
} from '../kiosk.schema';

describe('Kiosk Schema - Aligned Pattern Compliance', () => {
  
  describe('REQ-001: Database-First Validation', () => {
    it('TEST-001-A: should handle nullable database fields gracefully', () => {
      // Arrange
      const rawDbSession = {
        id: 'session-123',
        staff_id: 'user-456',
        session_start: null, // Database allows null
        session_end: null,
        total_sales: null,
        transaction_count: null,
        is_active: null,
        device_id: null,
        created_at: null,
        updated_at: null,
        staff: {
          name: 'John Staff',
          role: 'staff'
        }
      };

      // Act & Assert - Should not throw
      expect(() => {
        const result = DbKioskSessionTransformSchema.parse(rawDbSession);
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('TEST-001-B: should handle missing optional relations', () => {
      // Arrange
      const rawDbPin = {
        id: 'pin-123',
        user_id: 'user-456',
        pin: '1234',
        is_active: null,
        last_used: null,
        created_at: null,
        updated_at: null,
        users: null // Relation might be missing
      };

      // Act & Assert
      expect(() => {
        const result = DbStaffPinTransformSchema.parse(rawDbPin);
        expect(result.user).toBeNull();
      }).not.toThrow();
    });
  });

  describe('REQ-002: Single Validation Pass', () => {
    it('TEST-002-A: transformation should validate and transform in one pass', () => {
      // Arrange
      const rawInput = {
        id: 'session-123',
        staff_id: 'user-456',
        session_start: '2025-08-19T10:00:00Z',
        session_end: null,
        total_sales: 150.75,
        transaction_count: 3,
        is_active: true,
        device_id: 'kiosk-001',
        created_at: '2025-08-19T09:55:00Z',
        updated_at: '2025-08-19T10:05:00Z',
        staff: {
          name: 'John Staff',
          role: 'manager'
        }
      };

      // Act
      const result = DbKioskSessionTransformSchema.parse(rawInput);

      // Assert - Verify single pass validation + transformation
      expect(result.id).toBe('session-123');
      expect(result.staffId).toBe('user-456'); // snake_case → camelCase
      expect(result.staffName).toBe('John Staff');
      expect(result.sessionStart).toBeInstanceOf(Date);
      expect(result.sessionEnd).toBeNull();
      expect(result.totalSales).toBe(150.75);
      expect(result.transactionCount).toBe(3);
      expect(result.isActive).toBe(true);
      expect(result.deviceId).toBe('kiosk-001');
      expect(result.currentCustomer).toBeNull(); // Runtime value
      
      // Verify internal metadata
      expect(result._dbData).toBeDefined();
      expect(result._dbData.staff_id).toBe('user-456');
      expect(result._dbData.session_start).toBe('2025-08-19T10:00:00Z');
    });

    it('TEST-002-B: should fail validation for truly invalid data', () => {
      // Arrange
      const invalidInput = {
        id: '', // Required field empty
        staff_id: 'user-456',
        session_start: '2025-08-19T10:00:00Z'
      };

      // Act & Assert
      expect(() => {
        DbKioskSessionTransformSchema.parse(invalidInput);
      }).toThrow();
    });
  });

  describe('REQ-003: Raw → Transform Schema Separation', () => {
    it('TEST-003-A: schemas should follow Raw → Transform pattern', () => {
      // Verify that transform schemas exist and work
      const rawSessionData = {
        id: 'session-123',
        staff_id: 'user-456',
        session_start: '2025-08-19T10:00:00Z',
        session_end: null,
        total_sales: null,
        transaction_count: null,
        is_active: null,
        device_id: null,
        created_at: null,
        updated_at: null,
        staff: {
          name: 'John Staff',
          role: 'staff'
        }
      };

      // Should work with transform schema
      const transformedSession = DbKioskSessionTransformSchema.parse(rawSessionData);
      expect(transformedSession).toBeDefined();
      expect(transformedSession.staffId).toBe('user-456');
    });

    it('TEST-003-B: staff PIN schema should follow same pattern', () => {
      const rawStaffData = {
        id: 'pin-123',
        user_id: 'user-456',
        pin: '1234',
        is_active: true,
        last_used: '2025-08-19T09:00:00Z',
        created_at: '2025-08-19T08:00:00Z',
        updated_at: '2025-08-19T09:00:00Z',
        users: {
          id: 'user-456',
          name: 'John Staff',
          email: 'john@farm.com',
          raw_user_meta_data: { role: 'staff' }
        }
      };

      const transformedStaff = DbStaffPinTransformSchema.parse(rawStaffData);
      expect(transformedStaff.userId).toBe('user-456');
      expect(transformedStaff.user?.role).toBe('staff');
      expect(transformedStaff._dbData).toBeDefined();
    });
  });

  describe('REQ-004: Proper Default Application', () => {
    it('TEST-004-A: should apply defaults during transformation', () => {
      // Arrange
      const dbWithNulls = {
        id: 'session-123',
        staff_id: 'user-456',
        session_start: null, // Will get default
        session_end: null,
        total_sales: null, // Will get default of 0
        transaction_count: null, // Will get default of 0
        is_active: null, // Will get default of true
        device_id: null,
        created_at: null,
        updated_at: null,
        staff: {
          name: 'John Staff',
          role: 'staff'
        }
      };

      // Act
      const result = DbKioskSessionTransformSchema.parse(dbWithNulls);

      // Assert - Defaults applied during transformation
      expect(result.totalSales).toBe(0);
      expect(result.transactionCount).toBe(0);
      expect(result.isActive).toBe(true);
      expect(result.sessionStart).toBeInstanceOf(Date);
      expect(result.staffName).toBe('John Staff');
    });

    it('TEST-004-B: should preserve actual values when present', () => {
      // Arrange
      const dbWithValues = {
        id: 'session-123',
        staff_id: 'user-456',
        session_start: '2025-08-19T10:00:00Z',
        session_end: '2025-08-19T12:00:00Z',
        total_sales: 250.50,
        transaction_count: 5,
        is_active: false,
        device_id: 'kiosk-002',
        created_at: '2025-08-19T09:55:00Z',
        updated_at: '2025-08-19T12:05:00Z',
        staff: {
          name: 'Jane Manager',
          role: 'manager'
        }
      };

      // Act
      const result = DbKioskSessionTransformSchema.parse(dbWithValues);

      // Assert - Actual values preserved
      expect(result.totalSales).toBe(250.50);
      expect(result.transactionCount).toBe(5);
      expect(result.isActive).toBe(false);
      expect(result.deviceId).toBe('kiosk-002');
      expect(result.staffName).toBe('Jane Manager');
      expect(result.sessionEnd).toBeInstanceOf(Date);
    });
  });

  describe('REQ-005: Internal Metadata Preservation', () => {
    it('TEST-005-A: should preserve original database fields', () => {
      // Arrange
      const originalData = {
        id: 'session-123',
        staff_id: 'user-456',
        session_start: '2025-08-19T10:00:00Z',
        session_end: null,
        total_sales: 150.75,
        transaction_count: 3,
        is_active: true,
        device_id: 'kiosk-001',
        created_at: '2025-08-19T09:55:00Z',
        updated_at: '2025-08-19T10:05:00Z',
        staff: {
          name: 'John Staff',
          role: 'staff'
        }
      };

      // Act
      const result = DbKioskSessionTransformSchema.parse(originalData);

      // Assert - Internal metadata preserved
      expect(result._dbData).toEqual({
        staff_id: 'user-456',
        session_start: '2025-08-19T10:00:00Z',
        session_end: null,
        raw_total_sales: 150.75,
        raw_transaction_count: 3,
        raw_is_active: true,
        created_at: '2025-08-19T09:55:00Z',
        updated_at: '2025-08-19T10:05:00Z'
      });
    });

    it('TEST-005-B: should preserve metadata for staff PIN schema', () => {
      // Arrange
      const originalStaff = {
        id: 'pin-123',
        user_id: 'user-456',
        pin: '1234',
        is_active: false,
        last_used: '2025-08-19T09:00:00Z',
        created_at: '2025-08-19T08:00:00Z',
        updated_at: '2025-08-19T09:00:00Z',
        users: {
          id: 'user-456',
          name: 'John Staff',
          email: 'john@farm.com',
          raw_user_meta_data: { role: 'manager' }
        }
      };

      // Act
      const result = DbStaffPinTransformSchema.parse(originalStaff);

      // Assert
      expect(result._dbData).toEqual({
        user_id: 'user-456',
        raw_is_active: false,
        last_used: '2025-08-19T09:00:00Z',
        created_at: '2025-08-19T08:00:00Z',
        updated_at: '2025-08-19T09:00:00Z'
      });
    });
  });

  describe('Input and Response Schemas', () => {
    it('TEST-INPUT-001: KioskAuthRequestSchema should validate PIN format', () => {
      // Valid PIN
      expect(() => KioskAuthRequestSchema.parse({ pin: '1234' })).not.toThrow();
      
      // Invalid PINs
      expect(() => KioskAuthRequestSchema.parse({ pin: '123' })).toThrow(); // Too short
      expect(() => KioskAuthRequestSchema.parse({ pin: '12345' })).toThrow(); // Too long
      expect(() => KioskAuthRequestSchema.parse({ pin: 'abcd' })).toThrow(); // Non-numeric
      expect(() => KioskAuthRequestSchema.parse({ pin: '12a4' })).toThrow(); // Mixed
    });

    it('TEST-RESPONSE-001: response schemas should handle success/error states', () => {
      // Success response
      const successAuth = {
        success: true,
        sessionId: 'session-123',
        staffId: 'user-456',
        staffName: 'John Staff'
      };
      expect(() => KioskAuthResponseSchema.parse(successAuth)).not.toThrow();

      // Error response
      const errorAuth = {
        success: false,
        message: 'Invalid PIN'
      };
      expect(() => KioskAuthResponseSchema.parse(errorAuth)).not.toThrow();

      // Session response with data
      const sessionResponse = {
        success: true,
        session: DbKioskSessionTransformSchema.parse({
          id: 'session-123',
          staff_id: 'user-456',
          session_start: '2025-08-19T10:00:00Z',
          session_end: null,
          total_sales: null,
          transaction_count: null,
          is_active: null,
          device_id: null,
          created_at: null,
          updated_at: null,
          staff: { name: 'John', role: 'staff' }
        })
      };
      expect(() => KioskSessionResponseSchema.parse(sessionResponse)).not.toThrow();
    });
  });
});

/**
 * Test Execution Report Template
 * ================================
 * Test Suite: Kiosk Schema - Aligned Pattern Compliance  
 * Date: [EXECUTION_DATE]
 * 
 * Results:
 * - Total Tests: 12
 * - Passed: [PASSED_COUNT]
 * - Failed: [FAILED_COUNT]
 * - Skipped: [SKIPPED_COUNT]
 * 
 * Pattern Compliance:
 * ✅ REQ-001: Database-first validation (2/2 tests)
 * ✅ REQ-002: Single validation pass (2/2 tests)
 * ✅ REQ-003: Raw → Transform separation (2/2 tests)
 * ✅ REQ-004: Proper defaults (2/2 tests)
 * ✅ REQ-005: Metadata preservation (2/2 tests)
 * ✅ INPUT: Input schema validation (1/1 test)
 * ✅ RESPONSE: Response schemas (1/1 test)
 * 
 * Schema Architecture Verified:
 * - Raw database schemas properly handle nullable fields
 * - Transform schemas apply defaults and convert formats
 * - Internal metadata (_dbData) preserved for debugging
 * - Single-pass validation + transformation working
 * - Type safety maintained throughout pipeline
 * 
 * Notes:
 * [ADD_EXECUTION_NOTES]
 */