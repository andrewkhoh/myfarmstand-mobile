import { useState, useCallback, useMemo } from 'react';

export type PaymentMethod = 'online' | 'cash_on_pickup';

interface CheckoutFormData {
  paymentMethod: PaymentMethod;
  notes: string;
  pickupDate: Date;
  pickupTime: Date;
  showDatePicker: boolean;
  showTimePicker: boolean;
}

interface CheckoutFormErrors {
  [key: string]: string;
}

interface CheckoutFormValidation {
  isValid: boolean;
  errors: CheckoutFormErrors;
}

// Generate default pickup date/time (next business day)
const generateDefaultDateTime = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  
  // Set to 10 AM as default pickup time
  const defaultTime = new Date(tomorrow);
  defaultTime.setHours(10, 0, 0, 0);
  
  return {
    date: tomorrow,
    time: defaultTime
  };
};

/**
 * Custom hook to manage checkout form state independently from cart state
 * This prevents race conditions between form updates and cart changes
 */
export const useCheckoutForm = () => {
  const defaultDateTime = useMemo(() => generateDefaultDateTime(), []);
  
  // Form state isolated from React Query/cart state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online');
  const [notes, setNotes] = useState('');
  const [pickupDate, setPickupDate] = useState<Date>(defaultDateTime.date);
  const [pickupTime, setPickupTime] = useState<Date>(defaultDateTime.time);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [errors, setErrors] = useState<CheckoutFormErrors>({});

  // Validation logic
  const validateForm = useCallback((): CheckoutFormValidation => {
    const newErrors: CheckoutFormErrors = {};
    
    // Validate pickup date (not in the past)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDate = new Date(pickupDate.getFullYear(), pickupDate.getMonth(), pickupDate.getDate());
    
    if (selectedDate < today) {
      newErrors.pickupDate = 'Pickup date cannot be in the past';
    }
    
    // Validate pickup time (if today, must be in future)
    if (selectedDate.getTime() === today.getTime()) {
      const selectedDateTime = new Date(pickupDate);
      selectedDateTime.setHours(pickupTime.getHours(), pickupTime.getMinutes());
      
      if (selectedDateTime <= now) {
        newErrors.pickupTime = 'Pickup time must be in the future';
      }
    }
    
    // Validate notes length
    if (notes.length > 500) {
      newErrors.notes = 'Notes cannot exceed 500 characters';
    }
    
    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  }, [pickupDate, pickupTime, notes]);

  // Form reset function
  const resetForm = useCallback(() => {
    const defaultDateTime = generateDefaultDateTime();
    setPaymentMethod('online');
    setNotes('');
    setPickupDate(defaultDateTime.date);
    setPickupTime(defaultDateTime.time);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setErrors({});
  }, []);

  // Get form data for submission
  const getFormData = useCallback(() => {
    const validation = validateForm();
    if (!validation.isValid) {
      return { isValid: false, errors: validation.errors };
    }

    return {
      isValid: true,
      data: {
        paymentMethod,
        notes: notes.trim(),
        pickupDate,
        pickupTime,
      }
    };
  }, [paymentMethod, notes, pickupDate, pickupTime, validateForm]);

  // Computed values
  const formattedPickupDateTime = useMemo(() => {
    const dateStr = pickupDate.toLocaleDateString();
    const timeStr = pickupTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return `${dateStr} at ${timeStr}`;
  }, [pickupDate, pickupTime]);

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  return {
    // Form state
    paymentMethod,
    setPaymentMethod,
    notes,
    setNotes,
    pickupDate,
    setPickupDate,
    pickupTime,
    setPickupTime,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    errors,
    
    // Computed values
    formattedPickupDateTime,
    hasErrors,
    
    // Actions
    validateForm,
    resetForm,
    getFormData,
    
    // Convenience
    clearError: (field: string) => {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    },
  };
};