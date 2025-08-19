/**
 * Kiosk Order Integration Test
 * 
 * Purpose: Verify kiosk session tracking works with order flow
 * Test ID: KIOSK-ORDER-INTEGRATION-001
 * Created: 2025-08-19
 * 
 * Tests:
 * - Order creation includes kiosk session ID when provided
 * - Kiosk transaction is created successfully 
 * - Session statistics are updated
 */

import { submitOrder } from '../orderService';
import { supabase } from '../../config/supabase';
import { CreateOrderRequest } from '../../types';

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/broadcastFactory', () => ({
  sendOrderBroadcast: jest.fn().mockResolvedValue(true)
}));
jest.mock('../notificationService', () => ({
  sendPickupReadyNotification: jest.fn().mockResolvedValue(true),
  sendOrderConfirmationNotification: jest.fn().mockResolvedValue(true)
}));

describe('Kiosk Order Integration', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create kiosk transaction when session ID provided', async () => {
    // Arrange
    const mockOrderRequest: CreateOrderRequest = {
      customerInfo: {
        name: 'John Customer',
        email: 'john@customer.com',
        phone: '555-0123',
        address: '123 Main St, City, State 12345'
      },
      items: [
        {
          productId: 'prod-123',
          productName: 'Test Product',
          price: 10.99,
          quantity: 2,
          subtotal: 21.98
        }
      ],
      fulfillmentType: 'pickup',
      paymentMethod: 'cash_on_pickup',
      pickupDate: '2025-08-20',
      pickupTime: '10:00 AM'
    };

    const kioskSessionId = 'session-123';

    // Mock successful user auth
    mockSupabase.auth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-456' } }
      })
    } as any;

    // Mock successful order creation
    mockSupabase.rpc = jest.fn().mockResolvedValue({
      data: {
        success: true,
        order: {
          id: 'order-789',
          customer_name: 'John Customer',
          customer_email: 'john@customer.com',
          customer_phone: '555-0123',
          subtotal: 21.98,
          tax_amount: 2.20,
          total_amount: 24.18,
          fulfillment_type: 'pickup',
          status: 'pending',
          payment_method: 'cash_on_pickup',
          payment_status: 'pending',
          pickup_date: '2025-08-20',
          pickup_time: '10:00',
          delivery_address: '123 Main St, City, State 12345',
          special_instructions: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      },
      error: null
    });

    // Mock kiosk transaction insertion
    const mockFromChain = {
      insert: jest.fn().mockResolvedValue({ error: null })
    };
    
    mockSupabase.from = jest.fn().mockImplementation((table) => {
      if (table === 'kiosk_transactions') {
        return mockFromChain;
      }
      return {};
    });

    // Act
    const result = await submitOrder(mockOrderRequest, kioskSessionId);

    // Assert
    expect(result.success).toBe(true);
    
    // Verify kiosk transaction was created
    expect(mockSupabase.from).toHaveBeenCalledWith('kiosk_transactions');
    expect(mockFromChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: kioskSessionId,
        customer_id: 'user-456',
        customer_email: 'john@customer.com',
        customer_phone: '555-0123',
        customer_name: 'John Customer',
        subtotal: 21.98,
        tax_amount: 1.87, // Calculated: 21.98 * 0.085
        total_amount: 23.85, // Calculated: 21.98 + 1.87
        payment_method: 'cash',
        payment_status: 'pending'
      })
    );

    // Verify session stats update was called
    expect(mockSupabase.rpc).toHaveBeenCalledWith('update_kiosk_session_stats', {
      session_id: kioskSessionId,
      sale_amount: 23.85 // Calculated total: 21.98 + 1.87
    });
  });

  it('should NOT create kiosk transaction when no session ID provided', async () => {
    // Arrange
    const mockOrderRequest: CreateOrderRequest = {
      customerInfo: {
        name: 'Jane Customer',
        email: 'jane@customer.com',
        phone: '555-0456',
        address: '456 Oak Ave, Town, State 67890'
      },
      items: [
        {
          productId: 'prod-456',
          productName: 'Another Product',
          price: 15.99,
          quantity: 1,
          subtotal: 15.99
        }
      ],
      fulfillmentType: 'pickup',
      paymentMethod: 'online',
      pickupDate: '2025-08-20',
      pickupTime: '2:00 PM'
    };

    // Mock successful user auth
    mockSupabase.auth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-789' } }
      })
    } as any;

    // Mock successful order creation
    mockSupabase.rpc = jest.fn().mockResolvedValue({
      data: {
        success: true,
        order: {
          id: 'order-456',
          customer_name: 'Jane Customer',
          customer_email: 'jane@customer.com',
          customer_phone: '555-0456',
          subtotal: 15.99,
          tax_amount: 1.60,
          total_amount: 17.59,
          fulfillment_type: 'pickup',
          status: 'pending',
          payment_method: 'online',
          payment_status: 'paid',
          pickup_date: '2025-08-20',
          pickup_time: '14:00',
          delivery_address: '456 Oak Ave, Town, State 67890',
          special_instructions: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      },
      error: null
    });

    mockSupabase.from = jest.fn();

    // Act - No kiosk session ID provided
    const result = await submitOrder(mockOrderRequest, null);

    // Assert
    expect(result.success).toBe(true);
    
    // Verify kiosk transaction was NOT created
    expect(mockSupabase.from).not.toHaveBeenCalledWith('kiosk_transactions');
    
    // Verify session stats update was NOT called for kiosk
    const rpcCalls = mockSupabase.rpc.mock.calls;
    const kioskStatsCalls = rpcCalls.filter(call => call[0] === 'update_kiosk_session_stats');
    expect(kioskStatsCalls).toHaveLength(0);
  });

  it('should handle kiosk transaction creation errors gracefully', async () => {
    // Arrange
    const mockOrderRequest: CreateOrderRequest = {
      customerInfo: {
        name: 'Error Customer',
        email: 'error@customer.com', 
        phone: '555-0999',
        address: '789 Pine Rd, Village, State 11111'
      },
      items: [
        {
          productId: 'prod-999',
          productName: 'Error Product',
          price: 5.00,
          quantity: 1,
          subtotal: 5.00
        }
      ],
      fulfillmentType: 'pickup',
      paymentMethod: 'cash_on_pickup',
      pickupDate: '2025-08-20',
      pickupTime: '4:00 PM'
    };

    const kioskSessionId = 'session-error';

    // Mock successful user auth
    mockSupabase.auth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-error' } }
      })
    } as any;

    // Mock successful order creation
    mockSupabase.rpc = jest.fn()
      .mockResolvedValueOnce({
        data: {
          success: true,
          order: {
            id: 'order-error',
            customer_name: 'Error Customer',
            customer_email: 'error@customer.com',
            customer_phone: '555-0999',
            subtotal: 5.00,
            tax_amount: 0.50,
            total_amount: 5.50,
            fulfillment_type: 'pickup',
            status: 'pending',
            payment_method: 'cash_on_pickup',
            payment_status: 'pending',
            pickup_date: '2025-08-20',
            pickup_time: '16:00',
            delivery_address: '789 Pine Rd, Village, State 11111',
            special_instructions: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        },
        error: null
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Session stats update failed' }
      });

    // Mock kiosk transaction insertion failure
    const mockFromChain = {
      insert: jest.fn().mockResolvedValue({ 
        error: { message: 'Transaction creation failed' }
      })
    };
    
    mockSupabase.from = jest.fn().mockReturnValue(mockFromChain);

    // Act
    const result = await submitOrder(mockOrderRequest, kioskSessionId);

    // Assert - Order should still succeed even if kiosk tracking fails
    expect(result.success).toBe(true);
    expect(result.order).toBeDefined();
    
    // Verify attempts were made to create kiosk tracking
    expect(mockSupabase.from).toHaveBeenCalledWith('kiosk_transactions');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('update_kiosk_session_stats', {
      session_id: kioskSessionId,
      sale_amount: 5.43 // Calculated: 5.00 + 0.43 (5.00 * 0.085)
    });
  });
});

/**
 * Test Execution Report Template
 * ================================
 * Test Suite: Kiosk Order Integration
 * Date: [EXECUTION_DATE]
 * 
 * Results:
 * - Total Tests: 3
 * - Passed: [PASSED_COUNT]
 * - Failed: [FAILED_COUNT] 
 * 
 * Integration Verified:
 * ✅ Kiosk transaction creation when session active
 * ✅ No kiosk tracking when session inactive  
 * ✅ Graceful error handling for kiosk failures
 * ✅ Order success not dependent on kiosk tracking
 * ✅ Session statistics update integration
 * 
 * Notes:
 * [ADD_EXECUTION_NOTES]
 */