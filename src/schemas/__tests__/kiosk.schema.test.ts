import {
  KioskSessionSchema,
  DbKioskSessionSchema,
  DbKioskSessionTransformSchema,
  KioskAuthRequestSchema,
  DbStaffPinSchema,
  DbStaffPinTransformSchema,
  KioskTransactionSchema,
  KioskAuthResponseSchema,
  KioskSessionResponseSchema
} from '../kiosk.schema';

describe('Kiosk Schemas', () => {
  describe('KioskSessionSchema', () => {
    const validSessionData = {
      id: 'session_123',
      staffId: 'staff_456',
      staffName: 'John Staff',
      sessionStart: new Date('2025-08-19T10:00:00Z'),
      sessionEnd: null,
      totalSales: 125.50,
      transactionCount: 5,
      isActive: true,
      deviceId: 'kiosk_001',
      currentCustomer: {
        email: 'customer@example.com',
        phone: '+1234567890',
        name: 'Jane Customer'
      }
    };

    it('should validate complete session data', () => {
      const result = KioskSessionSchema.parse(validSessionData);
      expect(result).toMatchObject(validSessionData);
    });

    it('should apply default values correctly', () => {
      const minimalData = {
        id: 'session_123',
        staffId: 'staff_456',
        staffName: 'John Staff',
        sessionStart: new Date('2025-08-19T10:00:00Z')
      };

      const result = KioskSessionSchema.parse(minimalData);
      expect(result.totalSales).toBe(0);
      expect(result.transactionCount).toBe(0);
      expect(result.isActive).toBe(true);
      expect(result.sessionEnd).toBeUndefined();
      expect(result.deviceId).toBeUndefined();
      expect(result.currentCustomer).toBeUndefined();
    });

    it('should validate nullable optional fields properly', () => {
      const dataWithNulls = {
        ...validSessionData,
        sessionEnd: null,
        deviceId: null,
        currentCustomer: null
      };

      const result = KioskSessionSchema.parse(dataWithNulls);
      expect(result.sessionEnd).toBeNull();
      expect(result.deviceId).toBeNull();
      expect(result.currentCustomer).toBeNull();
    });

    it('should reject invalid data', () => {
      expect(() => KioskSessionSchema.parse({
        id: '', // Empty string
        staffId: 'staff_456',
        staffName: 'John Staff',
        sessionStart: new Date()
      })).toThrow();

      expect(() => KioskSessionSchema.parse({
        id: 'session_123',
        staffId: 'staff_456',
        staffName: 'John Staff',
        sessionStart: new Date(),
        totalSales: -10 // Negative sales
      })).toThrow();
    });
  });

  describe('DbKioskSessionSchema', () => {
    const validDbData = {
      id: 'session_123',
      staff_id: 'staff_456',
      session_start: '2025-08-19T10:00:00Z',
      session_end: null,
      total_sales: 125.50,
      transaction_count: 5,
      is_active: true,
      device_id: 'kiosk_001',
      created_at: '2025-08-19T09:00:00Z',
      updated_at: '2025-08-19T10:00:00Z'
    };

    it('should validate database format', () => {
      const result = DbKioskSessionSchema.parse(validDbData);
      expect(result).toMatchObject(validDbData);
    });

    it('should handle nullable database fields correctly', () => {
      const minimalDbData = {
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

      const result = DbKioskSessionSchema.parse(minimalDbData);
      expect(result.session_start).toBeNull();
      expect(result.total_sales).toBeNull(); // Nullable field
      expect(result.transaction_count).toBeNull(); // Nullable field
      expect(result.is_active).toBeNull(); // Nullable field
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

      // Verify _dbData preservation
      expect(result._dbData).toEqual({
        staff_id: 'staff_456',
        session_start: '2025-08-19T10:00:00Z',
        session_end: null,
        created_at: '2025-08-19T09:00:00Z',
        updated_at: '2025-08-19T10:00:00Z'
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
      is_active: true,
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
        is_active: null,
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
      sessionId: 'session_456',
      customerId: 'customer_789',
      customerEmail: 'customer@example.com',
      customerPhone: '+1234567890',
      customerName: 'Jane Customer',
      items: [
        {
          productId: 'product_001',
          productName: 'Fresh Tomatoes',
          price: 4.99,
          quantity: 2,
          subtotal: 9.98
        }
      ],
      subtotal: 9.98,
      taxAmount: 0.80,
      totalAmount: 10.78,
      paymentMethod: 'card' as const,
      paymentStatus: 'completed' as const,
      completedAt: new Date('2025-08-19T11:00:00Z')
    };

    it('should validate complete transaction data', () => {
      const result = KioskTransactionSchema.parse(validTransactionData);
      expect(result).toMatchObject(validTransactionData);
    });

    it('should apply default values', () => {
      const minimalTransaction = {
        id: 'trans_123',
        sessionId: 'session_456',
        items: [
          {
            productId: 'product_001',
            productName: 'Fresh Tomatoes',
            price: 4.99,
            quantity: 2,
            subtotal: 9.98
          }
        ],
        subtotal: 9.98,
        totalAmount: 9.98,
        paymentMethod: 'cash' as const
      };

      const result = KioskTransactionSchema.parse(minimalTransaction);
      expect(result.taxAmount).toBe(0);
      expect(result.paymentStatus).toBe('pending');
    });

    it('should validate payment method enum', () => {
      const invalidPaymentMethod = {
        ...validTransactionData,
        paymentMethod: 'bitcoin' // Invalid payment method
      };

      expect(() => KioskTransactionSchema.parse(invalidPaymentMethod)).toThrow();
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
      expect(() => DbKioskSessionSchema.parse(dbSchemaWithAllNulls)).not.toThrow();
    });

    it('should preserve database field names in DB schemas', () => {
      // Verify snake_case preservation in database schemas
      const dbData = {
        id: 'session_123',
        staff_id: 'staff_456',  // snake_case preserved
        session_start: '2025-08-19T10:00:00Z', // snake_case preserved
        total_sales: 100,       // snake_case preserved
        transaction_count: 1,   // snake_case preserved
        is_active: true,        // snake_case preserved
        created_at: '2025-08-19T09:00:00Z' // snake_case preserved
      };

      const result = DbKioskSessionSchema.parse(dbData);
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
        is_active: true,
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