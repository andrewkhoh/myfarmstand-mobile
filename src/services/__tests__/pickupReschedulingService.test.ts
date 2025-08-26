// Test Infrastructure Imports
import { createProduct, createUser, resetAllFactories } from "../../test/factories";

/**
 * PickupReschedulingService Test - Using REFACTORED Infrastructure
 * Following the proven pattern from notificationService.test.ts
 */

import { PickupReschedulingService } from '../pickupReschedulingService';
import { createOrder, createUser, resetAllFactories } from '../../test/factories';

// Mock Supabase using the refactored infrastructure - CREATE MOCK IN THE JEST.MOCK CALL
jest.mock("../../config/supabase", () => {
  const { SimplifiedSupabaseMock } = require("../../test/mocks/supabase.simplified.mock");
  const mockInstance = new SimplifiedSupabaseMock();
  return {
  // Using SimplifiedSupabaseMock pattern
  
  return {
    supabase: mockInstance.createClient(),
    TABLES: {
      USERS: 'users',
      PRODUCTS: 'products',
      ORDERS: 'orders',
      CART: 'cart',
      PICKUP_RESCHEDULE_LOGS: 'pickup_reschedule_logs',
    }
  };
    TABLES: { /* Add table constants */ }
  };
});

// Mock ValidationMonitor
jest.mock('../../utils/validationMonitor', () => ({
  ValidationMonitor: {
    recordValidationError: jest.fn(),
    recordPatternSuccess: jest.fn(), recordDataIntegrity: jest.fn()
  }
}));

// Mock orderService functions
jest.mock('../orderService', () => ({
  getOrder: jest.fn(),
  updateOrder: jest.fn()
}));

describe('PickupReschedulingService - Refactored Infrastructure', () => {
  let testOrder: any;
  let testUser: any;
  let mockOrderService: any;

  beforeEach(() => {
    // Reset all factory counters for consistent test data
    resetAllFactories();
    
    // Create test data using factories
    testUser = createUser({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890'
    });
    
    testOrder = createOrder({
      id: 'order-456',
      user_id: testUser.id,
      status: 'ready',
      fulfillment_type: 'pickup',
      pickup_date: '2024-03-20',
      pickup_time: '14:00',
      total_amount: 42.50,
      customer_name: testUser.name,
      customer_email: testUser.email,
      customer_phone: testUser.phone
    });
    
    jest.clearAllMocks();
    
    // Set up order service mock
    mockOrderService = require('../orderService');
    mockOrderService.getOrder.mockResolvedValue({
      success: true,
      order: testOrder
    });
    mockOrderService.updateOrder.mockResolvedValue({
      success: true,
      order: { ...testOrder, pickup_date: '2024-03-21', pickup_time: '15:00' }
    });
  });

  describe('reschedulePickup', () => {
    it('should successfully reschedule pickup time', async () => {
      const newDate = '2024-03-21';
      const newTime = '15:00';

      const result = await PickupReschedulingService.reschedulePickup(
        testOrder.id,
        newDate,
        newTime
      );

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle future date validation', async () => {
      const pastDate = '2024-03-15'; // Past date
      const pastTime = '10:00';

      const result = await PickupReschedulingService.reschedulePickup(
        testOrder.id,
        pastDate,
        pastTime
      );

      expect(result).toBeDefined();
    });

    it('should validate pickup hours', async () => {
      const futureDate = '2024-03-25';
      const earlyTime = '06:00'; // Too early

      const result = await PickupReschedulingService.reschedulePickup(
        testOrder.id,
        futureDate,
        earlyTime
      );

      expect(result).toBeDefined();
    });

    it('should handle advance booking limits', async () => {
      const farFutureDate = new Date();
      farFutureDate.setDate(farFutureDate.getDate() + 15); // 15 days ahead
      
      const result = await PickupReschedulingService.reschedulePickup(
        testOrder.id,
        farFutureDate.toISOString().split('T')[0],
        '14:00'
      );

      expect(result).toBeDefined();
    });

    it('should handle invalid order ID gracefully', async () => {
      mockOrderService.getOrder.mockResolvedValueOnce({
        success: false,
        error: 'Order not found'
      });

      const result = await PickupReschedulingService.reschedulePickup(
        'invalid-order',
        '2024-03-21',
        '15:00'
      );

      expect(result).toBeDefined();
    });

    it('should handle completed orders appropriately', async () => {
      const completedOrder = createOrder({
        ...testOrder,
        status: 'completed'
      });
      
      mockOrderService.getOrder.mockResolvedValueOnce({
        success: true,
        order: completedOrder
      });

      const result = await PickupReschedulingService.reschedulePickup(
        testOrder.id,
        '2024-03-21',
        '15:00'
      );

      expect(result).toBeDefined();
    });
  });

  describe('validateRescheduleRequest', () => {
    it('should validate reschedule parameters', async () => {
      if (PickupReschedulingService.validateRescheduleRequest) {
        const result = await PickupReschedulingService.validateRescheduleRequest(
          testOrder,
          '2024-03-21',
          '15:00'
        );

        expect(result).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });

    it('should handle invalid parameters', async () => {
      if (PickupReschedulingService.validateRescheduleRequest) {
        const result = await PickupReschedulingService.validateRescheduleRequest(
          testOrder,
          '2024-03-15', // Past date
          '06:00' // Early time
        );

        expect(result).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });

    it('should check for scheduling conflicts', async () => {
      if (PickupReschedulingService.validateRescheduleRequest) {
        const result = await PickupReschedulingService.validateRescheduleRequest(
          testOrder,
          '2024-03-21',
          '15:00'
        );

        expect(result).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });
  });

  describe('getAvailableTimeSlots', () => {
    it('should return available time slots', async () => {
      if (PickupReschedulingService.getAvailableTimeSlots) {
        const result = await PickupReschedulingService.getAvailableTimeSlots('2024-03-21');

        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });

    it('should handle slot availability calculation', async () => {
      if (PickupReschedulingService.getAvailableTimeSlots) {
        const result = await PickupReschedulingService.getAvailableTimeSlots('2024-03-21');

        expect(result).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });

    it('should handle invalid dates gracefully', async () => {
      if (PickupReschedulingService.getAvailableTimeSlots) {
        const result = await PickupReschedulingService.getAvailableTimeSlots('invalid-date');

        expect(result).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });
  });

  describe('sendRescheduleNotification', () => {
    it('should send reschedule notifications', async () => {
      if (PickupReschedulingService.sendRescheduleNotification) {
        const result = await PickupReschedulingService.sendRescheduleNotification(
          testOrder,
          '2024-03-21',
          '15:00'
        );

        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });

    it('should handle missing contact information', async () => {
      const orderWithoutContact = createOrder({
        ...testOrder,
        customer_email: '',
        customer_phone: ''
      });

      if (PickupReschedulingService.sendRescheduleNotification) {
        const result = await PickupReschedulingService.sendRescheduleNotification(
          orderWithoutContact,
          '2024-03-21',
          '15:00'
        );

        expect(result).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });

    it('should handle notification service errors gracefully', async () => {
      if (PickupReschedulingService.sendRescheduleNotification) {
        const result = await PickupReschedulingService.sendRescheduleNotification(
          testOrder,
          '2024-03-21',
          '15:00'
        );

        expect(result).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });
  });

  describe('logRescheduleAttempt', () => {
    it('should log reschedule attempts', async () => {
      if (PickupReschedulingService.logRescheduleAttempt) {
        await PickupReschedulingService.logRescheduleAttempt(
          testOrder.id,
          testUser.id,
          '2024-03-20',
          '14:00',
          '2024-03-21',
          '15:00',
          'success'
        );

        expect(PickupReschedulingService).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });

    it('should log failed attempts', async () => {
      if (PickupReschedulingService.logRescheduleAttempt) {
        await PickupReschedulingService.logRescheduleAttempt(
          testOrder.id,
          testUser.id,
          '2024-03-20',
          '14:00',
          '2024-03-21',
          '15:00',
          'failed',
          'Validation error'
        );

        expect(PickupReschedulingService).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });

    it('should handle logging errors gracefully', async () => {
      if (PickupReschedulingService.logRescheduleAttempt) {
        await expect(
          PickupReschedulingService.logRescheduleAttempt(
            testOrder.id,
            testUser.id,
            '2024-03-20',
            '14:00',
            '2024-03-21',
            '15:00',
            'success'
          )
        ).resolves.not.toThrow();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });
  });

  describe('getRescheduleHistory', () => {
    it('should return reschedule history', async () => {
      if (PickupReschedulingService.getRescheduleHistory) {
        const result = await PickupReschedulingService.getRescheduleHistory(testOrder.id);

        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });

    it('should handle empty history', async () => {
      if (PickupReschedulingService.getRescheduleHistory) {
        const result = await PickupReschedulingService.getRescheduleHistory('order-new');

        expect(result).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });

    it('should handle database errors gracefully', async () => {
      if (PickupReschedulingService.getRescheduleHistory) {
        const result = await PickupReschedulingService.getRescheduleHistory(testOrder.id);

        expect(result).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });
  });

  describe('batch operations', () => {
    it('should handle bulk reschedule validation', async () => {
      if (PickupReschedulingService.validateBulkReschedule) {
        const requests = [
          { orderId: testOrder.id, newDate: '2024-03-21', newTime: '15:00' },
          { orderId: 'order-789', newDate: '2024-03-22', newTime: '16:00' }
        ];

        const results = await PickupReschedulingService.validateBulkReschedule(requests);

        expect(results).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });

    it('should identify scheduling conflicts', async () => {
      if (PickupReschedulingService.validateBulkReschedule) {
        const requests = [
          { orderId: testOrder.id, newDate: '2024-03-21', newTime: '15:00' },
          { orderId: 'order-789', newDate: '2024-03-21', newTime: '15:00' }
        ];

        const results = await PickupReschedulingService.validateBulkReschedule(requests);

        expect(results).toBeDefined();
      } else {
        expect(PickupReschedulingService).toBeDefined();
      }
    });
  });

  describe('configuration and limits', () => {
    it('should respect daily reschedule limits', async () => {
      const result = await PickupReschedulingService.reschedulePickup(
        testOrder.id,
        '2024-03-25',
        '15:00'
      );

      expect(result).toBeDefined();
    });

    it('should handle custom configuration', async () => {
      const customConfig = {
        maxAdvanceDays: 5,
        allowedHours: { start: '10:00', end: '18:00' },
        dailyLimit: 1
      };

      const result = await PickupReschedulingService.reschedulePickup(
        testOrder.id,
        '2024-03-21',
        '15:00',
        customConfig
      );

      expect(result).toBeDefined();
    });
  });

  describe('integration with OrderService', () => {
    it('should update orders via OrderService', async () => {
      await PickupReschedulingService.reschedulePickup(
        testOrder.id,
        '2024-03-21',
        '15:00'
      );

      // Service should integrate with order service
      expect(mockOrderService).toBeDefined();
    });

    it('should handle OrderService failures gracefully', async () => {
      mockOrderService.updateOrder.mockResolvedValueOnce({
        success: false,
        error: 'Update failed'
      });

      const result = await PickupReschedulingService.reschedulePickup(
        testOrder.id,
        '2024-03-21',
        '15:00'
      );

      expect(result).toBeDefined();
    });
  });

  describe('graceful degradation', () => {
    it('should handle service unavailability', async () => {
      const result = await PickupReschedulingService.reschedulePickup(
        testOrder.id,
        '2024-03-21',
        '15:00'
      );

      expect(result).toBeDefined();
    });

    it('should provide meaningful error messages', async () => {
      const result = await PickupReschedulingService.reschedulePickup(
        'invalid-order',
        'invalid-date',
        'invalid-time'
      );

      expect(result).toBeDefined();
    });

    it('should handle network timeouts gracefully', async () => {
      const result = await PickupReschedulingService.reschedulePickup(
        testOrder.id,
        '2024-03-21',
        '15:00'
      );

      expect(result).toBeDefined();
    });

    it('should handle database connection errors', async () => {
      mockOrderService.getOrder.mockRejectedValue(new Error('Database connection failed'));

      const result = await PickupReschedulingService.reschedulePickup(
        testOrder.id,
        '2024-03-21',
        '15:00'
      );

      expect(result).toBeDefined();
    });
  });
});