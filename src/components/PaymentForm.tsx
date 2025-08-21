/**
 * PaymentForm Component
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * Secure payment form component with PCI compliance patterns, validation,
 * and graceful error handling. Follows established component patterns.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ViewStyle, Alert } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../utils/theme';
import { 
  PaymentMethod, 
  PaymentError, 
  CreatePaymentMethodRequest, 
  PaymentTokenizationRequest,
  BillingAddress 
} from '../types';
import { Card } from './Card';
import { Input } from './Input';
import { Button } from './Button';
import { useCreatePaymentMethod } from '../hooks/usePayment';
import { ValidationMonitor } from '../utils/validationMonitor';

interface PaymentFormProps {
  onSuccess?: (paymentMethod: PaymentMethod) => void;
  onError?: (error: PaymentError) => void;
  onCancel?: () => void;
  initialBillingAddress?: BillingAddress;
  customerId?: string;
  style?: ViewStyle;
  title?: string;
  submitButtonText?: string;
  requiresBillingAddress?: boolean;
}

interface FormData {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  cardholderName: string;
  billingAddress: {
    name: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  savePaymentMethod: boolean;
}

interface FormErrors {
  cardNumber?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvc?: string;
  cardholderName?: string;
  billingAddress?: {
    name?: string;
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

// Following Pattern: Comprehensive validation with meaningful error messages
const validateCardNumber = (cardNumber: string): string | undefined => {
  const cleaned = cardNumber.replace(/\s/g, '');
  
  if (!cleaned) return 'Card number is required';
  if (cleaned.length < 13 || cleaned.length > 19) return 'Card number must be 13-19 digits';
  if (!/^\d+$/.test(cleaned)) return 'Card number must contain only digits';
  
  // Basic Luhn algorithm check
  const luhnCheck = (num: string) => {
    let sum = 0;
    let isEven = false;
    
    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };
  
  if (!luhnCheck(cleaned)) return 'Invalid card number';
  
  return undefined;
};

const validateExpiry = (month: string, year: string): { month?: string; year?: string } => {
  const errors: { month?: string; year?: string } = {};
  
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  if (!month || monthNum < 1 || monthNum > 12) {
    errors.month = 'Invalid month';
  }
  
  if (!year || yearNum < currentYear || yearNum > currentYear + 20) {
    errors.year = 'Invalid year';
  }
  
  // Check if card is expired
  if (!errors.month && !errors.year) {
    if (yearNum === currentYear && monthNum < currentMonth) {
      errors.month = 'Card is expired';
    }
  }
  
  return errors;
};

const validateCVC = (cvc: string): string | undefined => {
  if (!cvc) return 'CVC is required';
  if (cvc.length < 3 || cvc.length > 4) return 'CVC must be 3-4 digits';
  if (!/^\d+$/.test(cvc)) return 'CVC must contain only digits';
  return undefined;
};

// Helper function to format card number with spaces
const formatCardNumber = (value: string): string => {
  const cleaned = value.replace(/\s/g, '');
  const chunks = cleaned.match(/.{1,4}/g);
  return chunks ? chunks.join(' ') : cleaned;
};

export const PaymentForm: React.FC<PaymentFormProps> = ({
  onSuccess,
  onError,
  onCancel,
  initialBillingAddress,
  customerId,
  style,
  title = 'Add Payment Method',
  submitButtonText = 'Save Payment Method',
  requiresBillingAddress = true,
}) => {
  const { mutate: createPaymentMethod, isLoading } = useCreatePaymentMethod();
  
  const [formData, setFormData] = useState<FormData>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    cardholderName: '',
    billingAddress: {
      name: initialBillingAddress?.name || '',
      line1: initialBillingAddress?.line1 || '',
      line2: initialBillingAddress?.line2 || '',
      city: initialBillingAddress?.city || '',
      state: initialBillingAddress?.state || '',
      postalCode: initialBillingAddress?.postalCode || '',
      country: initialBillingAddress?.country || 'US',
    },
    savePaymentMethod: true,
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Following Pattern: Real-time validation for better UX
  const validateField = useCallback((field: string, value: string) => {
    let error: string | undefined;
    
    switch (field) {
      case 'cardNumber':
        error = validateCardNumber(value);
        break;
      case 'cvc':
        error = validateCVC(value);
        break;
      case 'cardholderName':
        error = !value.trim() ? 'Cardholder name is required' : undefined;
        break;
      default:
        break;
    }
    
    if (field === 'expiryMonth' || field === 'expiryYear') {
      const expiryErrors = validateExpiry(
        field === 'expiryMonth' ? value : formData.expiryMonth,
        field === 'expiryYear' ? value : formData.expiryYear
      );
      error = expiryErrors[field as keyof typeof expiryErrors];
    }
    
    setErrors(prev => ({
      ...prev,
      [field]: error,
    }));
    
    return !error;
  }, [formData.expiryMonth, formData.expiryYear]);

  // Following Pattern: Comprehensive form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Card validation
    newErrors.cardNumber = validateCardNumber(formData.cardNumber);
    newErrors.cvc = validateCVC(formData.cvc);
    newErrors.cardholderName = !formData.cardholderName.trim() ? 'Cardholder name is required' : undefined;
    
    const expiryErrors = validateExpiry(formData.expiryMonth, formData.expiryYear);
    newErrors.expiryMonth = expiryErrors.month;
    newErrors.expiryYear = expiryErrors.year;
    
    // Billing address validation (if required)
    if (requiresBillingAddress) {
      const billingErrors: FormErrors['billingAddress'] = {};
      
      if (!formData.billingAddress.name.trim()) billingErrors.name = 'Name is required';
      if (!formData.billingAddress.line1.trim()) billingErrors.line1 = 'Address is required';
      if (!formData.billingAddress.city.trim()) billingErrors.city = 'City is required';
      if (!formData.billingAddress.state.trim()) billingErrors.state = 'State is required';
      if (!formData.billingAddress.postalCode.trim()) billingErrors.postalCode = 'Postal code is required';
      
      if (Object.keys(billingErrors).length > 0) {
        newErrors.billingAddress = billingErrors;
      }
    }
    
    setErrors(newErrors);
    
    // Check if any errors exist
    const hasErrors = Object.values(newErrors).some(error => 
      typeof error === 'string' ? !!error : 
      typeof error === 'object' ? Object.values(error).some(Boolean) : 
      false
    );
    
    return !hasErrors;
  };

  // Following Pattern: Secure form submission with error handling
  const handleSubmit = useCallback(async () => {
    setHasAttemptedSubmit(true);
    
    if (!validateForm()) {
      ValidationMonitor.recordValidationError({
        context: 'PaymentForm.handleSubmit',
        errorMessage: 'Form validation failed',
        errorCode: 'FORM_VALIDATION_FAILED'
      });
      return;
    }

    try {
      const paymentMethodRequest: CreatePaymentMethodRequest = {
        type: 'card',
        customerId: customerId || '',
        card: {
          number: formData.cardNumber.replace(/\s/g, ''),
          expMonth: parseInt(formData.expiryMonth, 10),
          expYear: parseInt(formData.expiryYear, 10),
          cvc: formData.cvc,
        },
      };

      // Following Pattern: Secure tokenization (no raw card data storage)
      createPaymentMethod(paymentMethodRequest, {
        onSuccess: (result) => {
          if (result.success && result.paymentMethod) {
            ValidationMonitor.recordPatternSuccess({
              service: 'PaymentForm',
              pattern: 'secure_tokenization',
              operation: 'createPaymentMethod'
            });
            
            onSuccess?.(result.paymentMethod);
          } else {
            const error: PaymentError = {
              code: 'PROCESSING_ERROR',
              message: 'Failed to create payment method',
              userMessage: 'Unable to save payment method. Please try again.',
            };
            onError?.(error);
          }
        },
        onError: (error) => {
          ValidationMonitor.recordValidationError({
            context: 'PaymentForm.createPaymentMethod',
            errorMessage: error.message || 'Unknown error',
            errorCode: 'PAYMENT_METHOD_CREATION_FAILED'
          });
          
          const paymentError: PaymentError = {
            code: 'PAYMENT_METHOD_UNACTIVATED',
            message: error.message || 'Payment method creation failed',
            userMessage: 'Unable to add payment method. Please check your information and try again.',
          };
          onError?.(paymentError);
        }
      });
    } catch (error) {
      console.error('Payment form submission error:', error);
      const paymentError: PaymentError = {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        userMessage: 'Network error. Please check your connection and try again.',
      };
      onError?.(paymentError);
    }
  }, [formData, customerId, createPaymentMethod, onSuccess, onError, requiresBillingAddress]);

  // Following Pattern: User-friendly input handlers
  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;
    
    // Format card number with spaces
    if (field === 'cardNumber') {
      processedValue = formatCardNumber(value.replace(/\s/g, '').slice(0, 19));
    }
    
    // Limit numeric fields
    if (field === 'expiryMonth' && value.length > 2) return;
    if (field === 'expiryYear' && value.length > 4) return;
    if (field === 'cvc' && value.length > 4) return;
    
    setFormData(prev => {
      if (field.startsWith('billingAddress.')) {
        const addressField = field.replace('billingAddress.', '');
        return {
          ...prev,
          billingAddress: {
            ...prev.billingAddress,
            [addressField]: processedValue,
          },
        };
      }
      
      return {
        ...prev,
        [field]: processedValue,
      };
    });
    
    // Validate field if user has attempted submit
    if (hasAttemptedSubmit) {
      validateField(field, processedValue);
    }
  };

  return (
    <Card variant="elevated" padding="lg" style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      
      {/* Card Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Card Information</Text>
        
        <Input
          label="Card Number"
          value={formData.cardNumber}
          onChangeText={(value) => handleInputChange('cardNumber', value)}
          placeholder="1234 5678 9012 3456"
          keyboardType="numeric"
          error={errors.cardNumber}
          maxLength={23} // 19 digits + 4 spaces
          autoComplete="cc-number"
          secureTextEntry={false}
        />
        
        <View style={styles.row}>
          <Input
            label="MM"
            value={formData.expiryMonth}
            onChangeText={(value) => handleInputChange('expiryMonth', value)}
            placeholder="12"
            keyboardType="numeric"
            error={errors.expiryMonth}
            containerStyle={styles.expiryInput}
            maxLength={2}
            autoComplete="cc-exp-month"
          />
          
          <Input
            label="YYYY"
            value={formData.expiryYear}
            onChangeText={(value) => handleInputChange('expiryYear', value)}
            placeholder="2025"
            keyboardType="numeric"
            error={errors.expiryYear}
            containerStyle={styles.expiryInput}
            maxLength={4}
            autoComplete="cc-exp-year"
          />
          
          <Input
            label="CVC"
            value={formData.cvc}
            onChangeText={(value) => handleInputChange('cvc', value)}
            placeholder="123"
            keyboardType="numeric"
            error={errors.cvc}
            containerStyle={styles.cvcInput}
            maxLength={4}
            secureTextEntry={true}
            autoComplete="cc-csc"
          />
        </View>
        
        <Input
          label="Cardholder Name"
          value={formData.cardholderName}
          onChangeText={(value) => handleInputChange('cardholderName', value)}
          placeholder="John Doe"
          error={errors.cardholderName}
          autoComplete="cc-name"
          autoCapitalize="words"
        />
      </View>
      
      {/* Billing Address */}
      {requiresBillingAddress && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing Address</Text>
          
          <Input
            label="Full Name"
            value={formData.billingAddress.name}
            onChangeText={(value) => handleInputChange('billingAddress.name', value)}
            placeholder="John Doe"
            error={errors.billingAddress?.name}
            autoComplete="name"
            autoCapitalize="words"
          />
          
          <Input
            label="Address Line 1"
            value={formData.billingAddress.line1}
            onChangeText={(value) => handleInputChange('billingAddress.line1', value)}
            placeholder="123 Main St"
            error={errors.billingAddress?.line1}
            autoComplete="address-line1"
          />
          
          <Input
            label="Address Line 2 (Optional)"
            value={formData.billingAddress.line2}
            onChangeText={(value) => handleInputChange('billingAddress.line2', value)}
            placeholder="Apt 4B"
            autoComplete="address-line2"
          />
          
          <View style={styles.row}>
            <Input
              label="City"
              value={formData.billingAddress.city}
              onChangeText={(value) => handleInputChange('billingAddress.city', value)}
              placeholder="New York"
              error={errors.billingAddress?.city}
              containerStyle={styles.cityInput}
              autoComplete="address-level2"
            />
            
            <Input
              label="State"
              value={formData.billingAddress.state}
              onChangeText={(value) => handleInputChange('billingAddress.state', value)}
              placeholder="NY"
              error={errors.billingAddress?.state}
              containerStyle={styles.stateInput}
              autoComplete="address-level1"
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
          
          <Input
            label="Postal Code"
            value={formData.billingAddress.postalCode}
            onChangeText={(value) => handleInputChange('billingAddress.postalCode', value)}
            placeholder="10001"
            error={errors.billingAddress?.postalCode}
            keyboardType="numeric"
            autoComplete="postal-code"
          />
        </View>
      )}
      
      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={onCancel}
          disabled={isLoading}
          style={styles.cancelButton}
        />
        
        <Button
          title={submitButtonText}
          variant="primary"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          style={styles.submitButton}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: 400,
    alignSelf: 'center',
  },
  
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  
  section: {
    marginBottom: spacing.lg,
  },
  
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.medium,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  expiryInput: {
    flex: 1,
    marginRight: spacing.sm,
  },
  
  cvcInput: {
    flex: 1,
  },
  
  cityInput: {
    flex: 2,
    marginRight: spacing.sm,
  },
  
  stateInput: {
    flex: 1,
  },
  
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  
  cancelButton: {
    flex: 1,
    marginRight: spacing.md,
  },
  
  submitButton: {
    flex: 2,
  },
});

export type { PaymentFormProps };