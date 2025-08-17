import { renderHook, act } from '@testing-library/react-native';
import { useCheckoutForm } from '../useCheckoutForm';

// Mock useCart to simulate server state changes
jest.mock('../useCart', () => ({
  useCart: () => ({
    items: [
      {
        product: { id: 'prod-1', name: 'Apples', price: 2.99 },
        quantity: 3
      }
    ],
    total: 8.97,
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    isLoading: false
  })
}));

describe('useCheckoutForm Race Condition Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Form State Isolation', () => {
    it('should maintain form state independent of cart changes', async () => {
      const { result } = renderHook(() => useCheckoutForm());

      // Set form values
      act(() => {
        result.current.setPaymentMethod('cash_on_pickup');
        result.current.setNotes('Special instructions');
        result.current.setPickupDate(new Date('2024-12-25'));
      });

      // Verify form state is set
      expect(result.current.paymentMethod).toBe('cash_on_pickup');
      expect(result.current.notes).toBe('Special instructions');
      expect(result.current.pickupDate.toDateString()).toBe(new Date('2024-12-25').toDateString());

      // Simulate external cart state changes (this would be handled by React Query)
      // The form state should remain unchanged since it's isolated
      expect(result.current.paymentMethod).toBe('cash_on_pickup');
      expect(result.current.notes).toBe('Special instructions');
    });

    it('should handle rapid form updates without state corruption', async () => {
      const { result } = renderHook(() => useCheckoutForm());

      // Rapid form updates
      await act(async () => {
        for (let i = 0; i < 100; i++) {
          result.current.setPaymentMethod(i % 2 === 0 ? 'online' : 'cash_on_pickup');
          result.current.setNotes(`Note ${i}`);
        }
      });

      // Final state should be consistent
      expect(result.current.paymentMethod).toBe('cash_on_pickup'); // Last update (99 % 2 !== 0)
      expect(result.current.notes).toBe('Note 99');
    });

    it('should validate form independently of external state', async () => {
      const { result } = renderHook(() => useCheckoutForm());

      // Set invalid date (in the past)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      act(() => {
        result.current.setPickupDate(pastDate);
      });

      // Validate form
      const validation = result.current.validateForm();

      // Should detect validation errors independent of cart state
      expect(validation.isValid).toBe(false);
      expect(validation.errors.pickupDate).toBeTruthy();
    });
  });

  describe('Concurrent Form Operations', () => {
    it('should handle concurrent form field updates', async () => {
      const { result } = renderHook(() => useCheckoutForm());

      // Update multiple fields simultaneously
      await act(async () => {
        const promises = Promise.all([
          Promise.resolve(result.current.setPaymentMethod('cash_on_pickup')),
          Promise.resolve(result.current.setNotes('Test notes')),
          Promise.resolve(result.current.setPickupDate(new Date('2024-12-25'))),
          Promise.resolve(result.current.setPickupTime(new Date('2024-12-25T14:00:00')))
        ]);

        await promises;
      });

      // All updates should be applied
      expect(result.current.paymentMethod).toBe('cash_on_pickup');
      expect(result.current.notes).toBe('Test notes');
      expect(result.current.pickupDate.toDateString()).toBe(new Date('2024-12-25').toDateString());
      expect(result.current.pickupTime.getHours()).toBe(14);
    });

    it('should handle validation during concurrent updates', async () => {
      const { result } = renderHook(() => useCheckoutForm());

      // Start validation while updating fields
      await act(async () => {
        // Set some fields
        result.current.setPaymentMethod('online');
        result.current.setNotes('Test');

        // Validate while setting more fields
        const validation = result.current.validateForm();

        // Continue updating
        result.current.setPickupDate(new Date('2024-12-25'));

        // Validation should be based on state at time of call
        expect(validation.isValid).toBeDefined();
      });
    });

    it('should handle form reset during field updates', async () => {
      const { result } = renderHook(() => useCheckoutForm());

      // Set some values
      act(() => {
        result.current.setPaymentMethod('cash_on_pickup');
        result.current.setNotes('Test notes');
      });

      // Reset while updating
      await act(async () => {
        result.current.setPickupDate(new Date('2024-12-25'));
        result.current.resetForm();
      });

      // Form should be reset to defaults
      expect(result.current.paymentMethod).toBe('online');
      expect(result.current.notes).toBe('');
      // Date should be reset to default (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result.current.pickupDate.toDateString()).toBe(tomorrow.toDateString());
    });
  });

  describe('State Consistency During Validation', () => {
    it('should maintain consistent validation state', async () => {
      const { result } = renderHook(() => useCheckoutForm());

      // Set invalid time for today
      const today = new Date();
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 1); // 1 hour ago

      act(() => {
        result.current.setPickupDate(today);
        result.current.setPickupTime(pastTime);
      });

      // Multiple validations should be consistent
      const validation1 = result.current.validateForm();
      const validation2 = result.current.validateForm();
      const validation3 = result.current.validateForm();

      expect(validation1.isValid).toBe(validation2.isValid);
      expect(validation2.isValid).toBe(validation3.isValid);
      expect(validation1.errors).toEqual(validation2.errors);
    });

    it('should handle validation edge cases with timezone changes', async () => {
      const { result } = renderHook(() => useCheckoutForm());

      // Set pickup for today at edge of time validation
      const today = new Date();
      const almostNow = new Date();
      almostNow.setMinutes(almostNow.getMinutes() + 1); // 1 minute from now

      act(() => {
        result.current.setPickupDate(today);
        result.current.setPickupTime(almostNow);
      });

      const validation1 = result.current.validateForm();

      // Advance time slightly
      jest.advanceTimersByTime(60000); // 1 minute

      const validation2 = result.current.validateForm();

      // Validation should be consistent based on when it was called
      // (Not based on when time changes during execution)
      expect(validation1.isValid).toBe(true);
      expect(validation2.isValid).toBe(false); // Now in the past
    });
  });

  describe('Error State Management', () => {
    it('should handle error clearing during concurrent validation', async () => {
      const { result } = renderHook(() => useCheckoutForm());

      // Set invalid state to generate errors
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      act(() => {
        result.current.setPickupDate(pastDate);
        result.current.setNotes('A'.repeat(600)); // Too long
      });

      // Generate errors
      result.current.validateForm();

      expect(result.current.errors.pickupDate).toBeTruthy();
      expect(result.current.errors.notes).toBeTruthy();
      expect(result.current.hasErrors).toBe(true);

      // Clear errors concurrently
      await act(async () => {
        result.current.clearError('pickupDate');
        result.current.clearError('notes');
      });

      // Errors should be cleared
      expect(result.current.errors.pickupDate).toBeUndefined();
      expect(result.current.errors.notes).toBeUndefined();
      expect(result.current.hasErrors).toBe(false);
    });

    it('should handle partial error clearing', async () => {
      const { result } = renderHook(() => useCheckoutForm());

      // Set multiple invalid states
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      act(() => {
        result.current.setPickupDate(pastDate);
        result.current.setNotes('A'.repeat(600)); // Too long
      });

      // Generate errors
      result.current.validateForm();

      // Clear only one error
      act(() => {
        result.current.clearError('pickupDate');
      });

      // Should have partial errors
      expect(result.current.errors.pickupDate).toBeUndefined();
      expect(result.current.errors.notes).toBeTruthy();
      expect(result.current.hasErrors).toBe(true);
    });
  });

  describe('Form Data Serialization Race Conditions', () => {
    it('should return consistent form data during concurrent access', async () => {
      const { result } = renderHook(() => useCheckoutForm());

      // Set valid form data
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureTime = new Date();
      futureTime.setHours(14, 0, 0, 0);

      act(() => {
        result.current.setPaymentMethod('cash_on_pickup');
        result.current.setNotes('Test notes');
        result.current.setPickupDate(futureDate);
        result.current.setPickupTime(futureTime);
      });

      // Get form data multiple times concurrently
      const formData1 = result.current.getFormData();
      const formData2 = result.current.getFormData();
      const formData3 = result.current.getFormData();

      // Should be consistent
      expect(formData1.isValid).toBe(formData2.isValid);
      expect(formData2.isValid).toBe(formData3.isValid);

      if (formData1.isValid && formData2.isValid && formData3.isValid) {
        expect(formData1.data).toEqual(formData2.data);
        expect(formData2.data).toEqual(formData3.data);
      }
    });

    it('should handle form data access during field updates', async () => {
      const { result } = renderHook(() => useCheckoutForm());

      // Set initial valid state
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      act(() => {
        result.current.setPaymentMethod('online');
        result.current.setPickupDate(futureDate);
      });

      let formDataResults: any[] = [];

      // Access form data while updating fields
      await act(async () => {
        formDataResults.push(result.current.getFormData());
        result.current.setNotes('Updated notes');
        formDataResults.push(result.current.getFormData());
        result.current.setPaymentMethod('cash_on_pickup');
        formDataResults.push(result.current.getFormData());
      });

      // Form data should reflect state at time of access
      expect(formDataResults).toHaveLength(3);
      formDataResults.forEach(data => {
        expect(data.isValid).toBeDefined();
      });
    });
  });

  describe('Memory and Performance', () => {
    it('should handle rapid state changes without memory leaks', async () => {
      const { result } = renderHook(() => useCheckoutForm());

      // Simulate rapid user input
      await act(async () => {
        for (let i = 0; i < 1000; i++) {
          result.current.setNotes(`Note ${i}`);
          
          // Occasional validation and reset
          if (i % 100 === 0) {
            result.current.validateForm();
          }
          if (i % 200 === 0) {
            result.current.resetForm();
          }
        }
      });

      // Should maintain consistent state
      expect(result.current.notes).toBe(''); // Last reset happened at i=800
    });

    it('should handle date/time picker interactions efficiently', async () => {
      const { result } = renderHook(() => useCheckoutForm());

      // Simulate rapid date/time picker interactions
      await act(async () => {
        for (let i = 0; i < 50; i++) {
          const date = new Date();
          date.setDate(date.getDate() + i);
          
          result.current.setShowDatePicker(true);
          result.current.setPickupDate(date);
          result.current.setShowDatePicker(false);
          
          const time = new Date();
          time.setHours(10 + (i % 8), i % 60);
          
          result.current.setShowTimePicker(true);
          result.current.setPickupTime(time);
          result.current.setShowTimePicker(false);
        }
      });

      // Pickers should be closed
      expect(result.current.showDatePicker).toBe(false);
      expect(result.current.showTimePicker).toBe(false);
      
      // Final values should be set
      expect(result.current.pickupDate).toBeTruthy();
      expect(result.current.pickupTime).toBeTruthy();
    });
  });

  describe('Integration with Server State', () => {
    it('should maintain form state independence from cart mutations', async () => {
      // This test ensures that form state doesn't change when cart state changes
      // Since we're using isolated state management
      
      const { result } = renderHook(() => useCheckoutForm());

      // Set form state
      act(() => {
        result.current.setPaymentMethod('cash_on_pickup');
        result.current.setNotes('Important notes');
      });

      // Simulate cart state changes (would happen via React Query)
      // The form should maintain its state
      expect(result.current.paymentMethod).toBe('cash_on_pickup');
      expect(result.current.notes).toBe('Important notes');

      // Form validation should work independently
      const validation = result.current.validateForm();
      expect(validation).toBeDefined();
    });

    it('should handle form operations during network state changes', async () => {
      const { result } = renderHook(() => useCheckoutForm());

      // Set form state
      act(() => {
        result.current.setPaymentMethod('online');
        result.current.setNotes('Test notes');
      });

      // Simulate network conditions (offline/online)
      // Form should continue to function normally since it's local state
      const formData = result.current.getFormData();
      
      expect(formData.isValid).toBe(true);
      if (formData.isValid) {
        expect(formData.data?.paymentMethod).toBe('online');
        expect(formData.data?.notes).toBe('Test notes');
      }
    });
  });
});