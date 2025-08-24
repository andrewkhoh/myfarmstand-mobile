/**
 * Kiosk Schema Tests
 * Following MyFarmstand Mobile Architectural Patterns
 */

import { z } from 'zod';
import {
  DbKioskSessionTransformSchema,
  DbKioskTransactionTransformSchema,
  KioskAuthRequestSchema,
  DbStaffPinTransformSchema,
  KioskAuthResponseSchema,
  KioskSessionResponseSchema,
  RawDbKioskSessionSchema,
  RawDbStaffPinSchema,
  RawDbKioskTransactionSchema
} from '../kiosk.schema';

describe('Kiosk Schema Tests', () => {
  // 1️⃣ Database-First Validation Tests
  describe('Database Schema Validation', () => {
    it('should handle database nulls gracefully', () => {
      const dbData = {
        id: 'session-123',
        staff_id: 'staff-456',
        session_start: null,
        session_end: null,
        total_sales: null,
        transaction_count: null,
        is_active: null,
        device_id: null,
        created_at: null,
        updated_at: null
      };

      const result = RawDbKioskSessionSchema.parse(dbData);
      
      // Should preserve nulls from database
      expect(result.session_start).toBeNull();
      expect(result.total_sales).toBeNull();
      expect(result.is_active).toBeNull();
    });

    it('should validate required fields from database', () => {
      const invalidData = {
        // Missing required id and staff_id
        session_start: '2025-01-01T00:00:00Z'
      };

      expect(() => RawDbKioskSessionSchema.parse(invalidData)).toThrow();
    });

  });

  // 2️⃣ Transformation Tests (snake_case → camelCase)
  describe('Schema Transformation', () => {
    it('should transform database format to app format with defaults', () => {
      const dbData = {
        id: 'session-123',
        staff_id: 'staff-456',
        session_start: null,
        session_end: null,
        total_sales: null,
        transaction_count: null,
        is_active: null,
        device_id: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      const result = DbKioskSessionTransformSchema.parse(dbData);
      
      // Should apply defaults during transformation
      expect(result.id).toBe('session-123');
      expect(result.staffId).toBe('staff-456');
      expect(result.staffName).toBe('Unknown Staff');
      expect(result.totalSales).toBe(0);
      expect(result.transactionCount).toBe(0);
      expect(result.isActive).toBe(true);
      expect(result.deviceId).toBeNull();
      expect(result.sessionStart).toBeInstanceOf(Date);
    });

    it('should transform with complete database data', () => {
      const dbData = {
        id: 'session-123',
        staff_id: 'staff-456',
        session_start: '2025-01-01T10:00:00Z',
        session_end: '2025-01-01T18:00:00Z',
        total_sales: 125.50,
        transaction_count: 5,
        is_active: false,
        device_id: 'kiosk-001',
        created_at: '2025-01-01T09:00:00Z',
        updated_at: '2025-01-01T18:00:00Z',
        staff: {
          name: 'John Staff',
          role: 'staff'
        }
      };

      const result = DbKioskSessionTransformSchema.parse(dbData);
      
      expect(result.staffName).toBe('John Staff');
      expect(result.sessionStart).toEqual(new Date('2025-01-01T10:00:00Z'));
      expect(result.sessionEnd).toEqual(new Date('2025-01-01T18:00:00Z'));
      expect(result.totalSales).toBe(125.50);
      expect(result.isActive).toBe(false);
    });

    it('should preserve debug metadata', () => {
      const dbData = {
        id: 'session-123',
        staff_id: 'staff-456',
        session_start: '2025-01-01T10:00:00Z',
        total_sales: 100.00,
        transaction_count: 3,
        is_active: true,
        created_at: '2025-01-01T09:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      const result = DbKioskSessionTransformSchema.parse(dbData);
      
      expect(result._dbData).toEqual({
        staff_id: 'staff-456',
        session_start: '2025-01-01T10:00:00Z',
        session_end: undefined,
        raw_total_sales: 100.00,
        raw_transaction_count: 3,
        raw_is_active: true,
        created_at: undefined,
        updated_at: undefined
      });
    });
  });

  // 3️⃣ Staff PIN Schema Tests
  describe('Staff PIN Schemas', () => {
    it('should validate staff PIN database format', () => {
      const dbData = {
        id: 'pin-123',
        user_id: 'user-456',
        pin: '1234',
        is_available: null,
        last_used: null,
        created_at: null,
        updated_at: null
      };

      const result = RawDbStaffPinSchema.parse(dbData);
      expect(result.id).toBe('pin-123');
      expect(result.pin).toBe('1234');
      expect(result.is_available).toBeNull();
    });

    it('should transform staff PIN with user data', () => {
      const dbData = {
        id: 'pin-123',
        user_id: 'user-456',
        pin: '1234',
        is_available: true,
        last_used: '2025-01-01T12:00:00Z',
        created_at: '2025-01-01T09:00:00Z',
        updated_at: '2025-01-01T12:00:00Z',
        users: {
          id: 'user-456',
          name: 'John Staff',
          email: 'john@example.com',
          raw_user_meta_data: {
            role: 'staff'
          }
        }
      };

      const result = DbStaffPinTransformSchema.parse(dbData);
      
      expect(result.id).toBe('pin-123');
      expect(result.userId).toBe('user-456');
      expect(result.pin).toBe('1234');
      expect(result.isActive).toBe(true);
      expect(result.user?.name).toBe('John Staff');
      expect(result.user?.role).toBe('staff');
    });

    it('should handle missing user data gracefully', () => {
      const dbData = {
        id: 'pin-123',
        user_id: 'user-456',
        pin: '1234',
        is_available: null,
        last_used: null,
        users: null
      };

      const result = DbStaffPinTransformSchema.parse(dbData);
      
      expect(result.isActive).toBe(true); // Default applied
      expect(result.user).toBeNull();
    });
  });

  describe('DbKioskSessionTransformSchema', () => {
    const validDbTransformData = {
      id: 'session_123',
      staff_id: 'staff_456',
      session_start: '2025-08-19T10:00:00Z',
      session_end: null,
      total_sales: 125.50,
      transaction_count: 5,
      is_active: true,
      device_id: 'kiosk_001',
      created_at: '2025-08-19T09:00:00Z',
      updated_at: '2025-08-19T10:00:00Z',
      staff: {
        name: 'John Staff',
        role: 'staff'
      }
    };

    it('should transform database format to app format', () => {
      const result = DbKioskSessionTransformSchema.parse(validDbTransformData);
      
      expect(result).toMatchObject({
        id: 'session_123',
        staffId: 'staff_456',
        staffName: 'John Staff',
        sessionStart: new Date('2025-08-19T10:00:00Z'),
        sessionEnd: null,
        totalSales: 125.50,
        transactionCount: 5,
        isActive: true,
        deviceId: 'kiosk_001',
        currentCustomer: null
      });

      // Verify _dbData preservation (includes raw fields)
      expect(result._dbData).toEqual({
        staff_id: 'staff_456',
        session_start: '2025-08-19T10:00:00Z',
        session_end: null,
        created_at: '2025-08-19T09:00:00Z',
        updated_at: '2025-08-19T10:00:00Z',
        raw_is_active: true,
        raw_total_sales: 125.5,
        raw_transaction_count: 5
      });
    });

    it('should handle missing staff data gracefully', () => {
      const dataWithoutStaff = {
        ...validDbTransformData,
        staff: null
      };

      const result = DbKioskSessionTransformSchema.parse(dataWithoutStaff);
      expect(result.staffName).toBe('Unknown Staff');
    });

    it('should handle null database timestamps', () => {
      const dataWithNullTimestamps = {
        ...validDbTransformData,
        session_start: null,
        created_at: null
      };

      const result = DbKioskSessionTransformSchema.parse(dataWithNullTimestamps);
      expect(result.sessionStart).toBeInstanceOf(Date);
      // Should use current time when session_start is null
      expect(result.sessionStart.getTime()).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe('KioskAuthRequestSchema', () => {
    it('should validate correct PIN format', () => {
      const validRequest = { pin: '1234', deviceId: 'kiosk_001' };
      const result = KioskAuthRequestSchema.parse(validRequest);
      expect(result).toEqual(validRequest);
    });

    it('should validate PIN without deviceId', () => {
      const minimalRequest = { pin: '1234' };
      const result = KioskAuthRequestSchema.parse(minimalRequest);
      expect(result.pin).toBe('1234');
      expect(result.deviceId).toBeUndefined();
    });

    it('should reject invalid PIN formats', () => {
      // Too short
      expect(() => KioskAuthRequestSchema.parse({ pin: '123' })).toThrow('PIN must be exactly 4 digits');
      
      // Too long
      expect(() => KioskAuthRequestSchema.parse({ pin: '12345' })).toThrow('PIN must be exactly 4 digits');
      
      // Non-numeric
      expect(() => KioskAuthRequestSchema.parse({ pin: '12ab' })).toThrow('PIN must contain only numbers');
      
      // Empty
      expect(() => KioskAuthRequestSchema.parse({ pin: '' })).toThrow('PIN must be exactly 4 digits');
    });
  });

  describe('DbStaffPinTransformSchema', () => {
    const validStaffPinData = {
      id: 'pin_123',
      user_id: 'user_456',
      pin: '1234',
      is_available: true,
      last_used: '2025-08-19T09:00:00Z',
      created_at: '2025-08-18T10:00:00Z',
      updated_at: '2025-08-19T09:00:00Z',
      users: {
        id: 'user_456',
        name: 'John Staff',
        email: 'john@farmstand.com',
        role: 'staff'
      }
    };

    it('should transform staff PIN data correctly', () => {
      const result = DbStaffPinTransformSchema.parse(validStaffPinData);
      
      expect(result).toMatchObject({
        id: 'pin_123',
        userId: 'user_456',
        pin: '1234',
        isActive: true,
        lastUsed: new Date('2025-08-19T09:00:00Z'),
        user: {
          id: 'user_456',
          name: 'John Staff',
          email: 'john@farmstand.com',
          role: 'staff'
        }
      });
    });

    it('should handle nullable fields correctly', () => {
      const dataWithNulls = {
        ...validStaffPinData,
        is_available: null,
        last_used: null,
        users: null
      };

      const result = DbStaffPinTransformSchema.parse(dataWithNulls);
      expect(result.isActive).toBe(true); // Default applied
      expect(result.lastUsed).toBeNull();
      expect(result.user).toBeNull();
    });
  });

  describe('KioskTransactionSchema', () => {
    const validTransactionData = {
      id: 'trans_123',
      session_id: 'session_456',
      customer_id: 'customer_789',
      customer_email: 'customer@example.com',
      customer_phone: '+1234567890',
      customer_name: 'Jane Customer',
      subtotal: 9.98,
      tax_amount: 0.80,
      total_amount: 10.78,
      payment_method: 'card' as const,
      payment_status: 'completed' as const,
      completed_at: '2025-08-19T11:00:00Z',
      created_at: '2025-08-19T10:00:00Z',
      updated_at: '2025-08-19T11:00:00Z'
    };

    it('should validate complete transaction data', () => {
      const result = DbKioskTransactionTransformSchema.parse(validTransactionData);
      expect(result.id).toBe('trans_123');
      expect(result.sessionId).toBe('session_456');
      expect(result.customerId).toBe('customer_789');
      expect(result.paymentMethod).toBe('card');
      expect(result.paymentStatus).toBe('completed');
    });

    it('should apply default values', () => {
      const minimalTransaction = {
        id: 'trans_123',
        session_id: 'session_456',
        subtotal: 9.98,
        total_amount: 9.98,
        payment_method: 'cash' as const
      };

      const result = DbKioskTransactionTransformSchema.parse(minimalTransaction);
      expect(result.taxAmount).toBe(0);
      expect(result.paymentStatus).toBe('pending');
    });

    it('should validate payment method enum', () => {
      const invalidPaymentMethod = {
        ...validTransactionData,
        payment_method: 'bitcoin' // Invalid payment method
      };

      expect(() => DbKioskTransactionTransformSchema.parse(invalidPaymentMethod)).toThrow();
    });
  });

  describe('Response Schemas', () => {
    describe('KioskAuthResponseSchema', () => {
      it('should validate successful auth response', () => {
        const successResponse = {
          success: true,
          sessionId: 'session_123',
          staffId: 'staff_456',
          staffName: 'John Staff'
        };

        const result = KioskAuthResponseSchema.parse(successResponse);
        expect(result).toEqual(successResponse);
      });

      it('should validate failed auth response', () => {
        const failureResponse = {
          success: false,
          message: 'Invalid PIN'
        };

        const result = KioskAuthResponseSchema.parse(failureResponse);
        expect(result).toEqual(failureResponse);
      });
    });

    describe('KioskSessionResponseSchema', () => {
      it('should validate session response with session data', () => {
        const sessionResponse = {
          success: true,
          session: {
            id: 'session_123',
            staffId: 'staff_456',
            staffName: 'John Staff',
            sessionStart: new Date('2025-08-19T10:00:00Z'),
            totalSales: 125.50,
            transactionCount: 5,
            isActive: true
          }
        };

        const result = KioskSessionResponseSchema.parse(sessionResponse);
        expect(result.success).toBe(true);
        expect(result.session).toMatchObject(sessionResponse.session);
      });
    });
  });

  describe('Schema Validation Pattern Compliance', () => {
    it('should follow nullable field patterns consistently', () => {
      // Test that all nullable fields follow .nullable().optional() pattern
      const dbSchemaWithAllNulls = {
        id: 'session_123',
        staff_id: 'staff_456',
        session_start: null,
        session_end: null,
        total_sales: null,
        transaction_count: null,
        is_active: null,
        device_id: null,
        created_at: null,
        updated_at: null
      };

      // Should not throw - nullable fields should be handled properly
      expect(() => RawDbKioskSessionSchema.parse(dbSchemaWithAllNulls)).not.toThrow();
    });

    it('should preserve database field names in DB schemas', () => {
      // Verify snake_case preservation in database schemas
      const dbData = {
        id: 'session_123',
        staff_id: 'staff_456',  // snake_case preserved
        session_start: '2025-08-19T10:00:00Z', // snake_case preserved
        total_sales: 100,       // snake_case preserved
        transaction_count: 1,   // snake_case preserved
        is_available: true,        // snake_case preserved
        created_at: '2025-08-19T09:00:00Z' // snake_case preserved
      };

      const result = RawDbKioskSessionSchema.parse(dbData);
      expect(result.staff_id).toBe('staff_456');
      expect(result.session_start).toBe('2025-08-19T10:00:00Z');
    });

    it('should transform snake_case to camelCase in transform schemas', () => {
      const dbData = {
        id: 'session_123',
        staff_id: 'staff_456',
        session_start: '2025-08-19T10:00:00Z',
        total_sales: 100,
        transaction_count: 1,
        is_available: true,
        staff: { name: 'John Staff', role: 'staff' }
      };

      const result = DbKioskSessionTransformSchema.parse(dbData);
      expect(result.staffId).toBe('staff_456');       // Transformed to camelCase
      expect(result.totalSales).toBe(100);            // Transformed to camelCase
      expect(result.transactionCount).toBe(1);        // Transformed to camelCase
      expect(result.isActive).toBe(true);             // Transformed to camelCase
    });
  });
});

// Test completed - Kiosk schemas follow the established patterns:
// ✅ Database-first validation with nullable field handling
// ✅ Single validation pass with transformation
// ✅ Debug metadata preservation
// ✅ Snake_case to camelCase transformation
// ✅ Proper error handling and validation constraints