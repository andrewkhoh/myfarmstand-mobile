/**
 * Payment Security Utilities
 * Following MyFarmstand Mobile Architectural Patterns & Best Practices
 * 
 * Implements PCI compliance patterns, secure data handling, and cryptographic security
 * following the established security patterns from the codebase.
 */

import CryptoJS from 'crypto-js';
import Constants from 'expo-constants';
import { ValidationMonitor } from './validationMonitor';

// PCI Compliance Constants
const PCI_SENSITIVE_FIELDS = [
  'cardNumber', 'cvc', 'cvv', 'securityCode', 'pin',
  'accountNumber', 'routingNumber', 'bankAccount'
] as const;

const PCI_LOG_SAFE_FIELDS = [
  'last4', 'brand', 'expMonth', 'expYear', 'type',
  'id', 'userId', 'customerId', 'status', 'currency'
] as const;

// Following Pattern: Cryptographic security implementation
export class PaymentSecurityManager {
  private static readonly ENCRYPTION_SECRET = (() => {
    // SECURITY: Load from Expo Constants (same pattern as broadcastFactory)
    const secret = Constants.expoConfig?.extra?.paymentEncryptionSecret || process.env.EXPO_PUBLIC_PAYMENT_ENCRYPTION_SECRET;
    
    if (!secret) {
      throw new Error(
        '🚨 SECURITY ERROR: EXPO_PUBLIC_PAYMENT_ENCRYPTION_SECRET environment variable is required for payment data encryption.\n\n' +
        'SETUP INSTRUCTIONS:\n' +
        '1. Add to .env.secret: EXPO_PUBLIC_PAYMENT_ENCRYPTION_SECRET=<your-generated-key>\n' +
        '2. Generate a secure key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n' +
        '3. Ensure .env.secret is in .gitignore (never commit secrets!)\n\n'
      );
    }
    
    if (secret.length < 32) {
      throw new Error('🚨 SECURITY ERROR: Payment encryption secret must be at least 32 characters long for proper security.');
    }
    
    return secret;
  })();

  /**
   * Sanitize payment data for logging - removes all PCI sensitive fields
   * Following Pattern: Safe logging that excludes sensitive data
   */
  static sanitizeForLogging(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    
    // Remove all PCI sensitive fields
    PCI_SENSITIVE_FIELDS.forEach(field => {
      if (sanitized[field] !== undefined) {
        sanitized[field] = '[REDACTED_PCI]';
      }
    });

    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeForLogging(sanitized[key]);
      }
    });

    return sanitized;
  }

  /**
   * Secure card number masking for display
   * Following Pattern: Never expose full card numbers
   */
  static maskCardNumber(cardNumber: string): string {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return '****';
    }

    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (cleaned.length < 4) {
      return '****';
    }

    const last4 = cleaned.slice(-4);
    return `•••• •••• •••• ${last4}`;
  }

  /**
   * Validate and extract safe card data for storage
   * Following Pattern: Only store non-sensitive card metadata
   */
  static extractSafeCardData(cardData: {
    number?: string;
    brand?: string;
    expMonth?: number;
    expYear?: number;
    last4?: string;
  }): {
    last4: string;
    brand: string;
    expMonth: number;
    expYear: number;
    maskedNumber: string;
  } {
    try {
      const cleaned = cardData.number?.replace(/\D/g, '') || '';
      const last4 = cardData.last4 || cleaned.slice(-4) || '****';
      const brand = cardData.brand || this.detectCardBrand(cleaned);
      
      return {
        last4,
        brand,
        expMonth: cardData.expMonth || 0,
        expYear: cardData.expYear || 0,
        maskedNumber: this.maskCardNumber(cleaned),
      };
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'PaymentSecurityManager.extractSafeCardData',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CARD_DATA_EXTRACTION_FAILED'
      });

      return {
        last4: '****',
        brand: 'unknown',
        expMonth: 0,
        expYear: 0,
        maskedNumber: '•••• •••• •••• ****',
      };
    }
  }

  /**
   * Detect card brand from card number
   * Following Pattern: Client-side validation for better UX
   */
  static detectCardBrand(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]|^2[2-7]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/,
      diners: /^3[0689]/,
      jcb: /^35/,
      unionpay: /^62/,
    };

    for (const [brand, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleaned)) {
        return brand;
      }
    }

    return 'unknown';
  }

  /**
   * Encrypt sensitive payment data for temporary storage
   * Following Pattern: Cryptographic data protection
   */
  static encryptPaymentData(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(jsonString, this.ENCRYPTION_SECRET).toString();
      
      ValidationMonitor.recordPatternSuccess({
        service: 'PaymentSecurityManager',
        pattern: 'data_encryption',
        operation: 'encryptPaymentData'
      });
      
      return encrypted;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'PaymentSecurityManager.encryptPaymentData',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'ENCRYPTION_FAILED'
      });
      
      throw new Error('Failed to encrypt payment data');
    }
  }

  /**
   * Decrypt payment data
   * Following Pattern: Secure decryption with error handling
   */
  static decryptPaymentData(encryptedData: string): any {
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_SECRET);
      const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Decryption resulted in empty string');
      }
      
      const data = JSON.parse(decryptedString);
      
      ValidationMonitor.recordPatternSuccess({
        service: 'PaymentSecurityManager',
        pattern: 'data_decryption',
        operation: 'decryptPaymentData'
      });
      
      return data;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'PaymentSecurityManager.decryptPaymentData',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'DECRYPTION_FAILED'
      });
      
      throw new Error('Failed to decrypt payment data');
    }
  }

  /**
   * Generate secure channel name for payment broadcasts
   * Following Pattern: Cryptographic channel security (same as broadcastFactory)
   */
  static generateSecurePaymentChannel(userId: string, operation: string): string {
    try {
      const baseData = `myfarmstand-payment-${operation}-${userId}`;
      const hash = CryptoJS.HmacSHA256(baseData, this.ENCRYPTION_SECRET).toString();
      return `sec-payment-${hash.substring(0, 16)}`;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'PaymentSecurityManager.generateSecurePaymentChannel',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'CHANNEL_GENERATION_FAILED'
      });
      
      throw new Error('Failed to generate secure payment channel');
    }
  }

  /**
   * Validate payment amount to prevent manipulation
   * Following Pattern: Server-side validation patterns
   */
  static validatePaymentAmount(amount: number): { valid: boolean; error?: string } {
    // Basic validation
    if (typeof amount !== 'number' || isNaN(amount)) {
      return { valid: false, error: 'Amount must be a valid number' };
    }

    if (amount < 0) {
      return { valid: false, error: 'Amount cannot be negative' };
    }

    if (amount === 0) {
      return { valid: false, error: 'Amount must be greater than zero' };
    }

    // Check for reasonable limits (prevent extremely large amounts)
    const MAX_AMOUNT = 100000 * 100; // $100,000 in cents
    if (amount > MAX_AMOUNT) {
      return { valid: false, error: 'Amount exceeds maximum allowed limit' };
    }

    // Check for precision (must be whole cents)
    if (amount % 1 !== 0) {
      return { valid: false, error: 'Amount must be in whole cents' };
    }

    return { valid: true };
  }

  /**
   * Secure memory cleanup for sensitive data
   * Following Pattern: Memory security best practices
   */
  static secureMemoryCleanup(sensitiveData: any): void {
    try {
      if (typeof sensitiveData === 'object' && sensitiveData !== null) {
        // Overwrite sensitive fields with random data
        PCI_SENSITIVE_FIELDS.forEach(field => {
          if (sensitiveData[field] !== undefined) {
            // Overwrite with random data of same length
            const originalLength = String(sensitiveData[field]).length;
            sensitiveData[field] = Array(originalLength).fill(0).map(() => 
              Math.floor(Math.random() * 10)
            ).join('');
            
            // Then delete the property
            delete sensitiveData[field];
          }
        });
      }
    } catch (error) {
      // Silent cleanup - don't throw errors during cleanup
      console.warn('Secure memory cleanup failed:', error);
    }
  }

  /**
   * Create secure payment session token
   * Following Pattern: Session security patterns
   */
  static createPaymentSessionToken(userId: string, amount: number, expireInMinutes: number = 15): string {
    try {
      const sessionData = {
        userId,
        amount,
        timestamp: Date.now(),
        expires: Date.now() + (expireInMinutes * 60 * 1000),
        nonce: CryptoJS.lib.WordArray.random(16).toString(),
      };

      const token = this.encryptPaymentData(sessionData);
      
      ValidationMonitor.recordPatternSuccess({
        service: 'PaymentSecurityManager',
        pattern: 'session_token_creation',
        operation: 'createPaymentSessionToken'
      });
      
      return token;
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'PaymentSecurityManager.createPaymentSessionToken',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'SESSION_TOKEN_CREATION_FAILED'
      });
      
      throw new Error('Failed to create payment session token');
    }
  }

  /**
   * Validate payment session token
   * Following Pattern: Token validation with expiry checking
   */
  static validatePaymentSessionToken(token: string): { 
    valid: boolean; 
    userId?: string; 
    amount?: number; 
    error?: string; 
  } {
    try {
      const sessionData = this.decryptPaymentData(token);
      
      // Check expiry
      if (Date.now() > sessionData.expires) {
        return { valid: false, error: 'Payment session expired' };
      }

      // Validate required fields
      if (!sessionData.userId || typeof sessionData.amount !== 'number') {
        return { valid: false, error: 'Invalid session data' };
      }

      ValidationMonitor.recordPatternSuccess({
        service: 'PaymentSecurityManager',
        pattern: 'session_token_validation',
        operation: 'validatePaymentSessionToken'
      });

      return {
        valid: true,
        userId: sessionData.userId,
        amount: sessionData.amount,
      };
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'PaymentSecurityManager.validatePaymentSessionToken',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'SESSION_TOKEN_VALIDATION_FAILED'
      });

      return { valid: false, error: 'Invalid payment session token' };
    }
  }
}

// Following Pattern: Secure logging function (same pattern as broadcastFactory)
export const securePaymentLog = (message: string, data: any, level: 'info' | 'warn' | 'error' = 'info') => {
  // Remove sensitive fields from logs
  const safeData = PaymentSecurityManager.sanitizeForLogging(data);
  
  // Environment-controlled payment debugging
  const debugPayments = Constants.expoConfig?.extra?.debugPayments === 'true';
  const nodeEnv = Constants.expoConfig?.extra?.nodeEnv || 'development';
  const isProduction = nodeEnv === 'production';
  const shouldDebug = debugPayments && !isProduction;

  if (shouldDebug || level === 'error') {
    const logData = {
      timestamp: new Date().toISOString(),
      message,
      data: safeData,
      level,
      service: 'PaymentSecurity'
    };

    switch (level) {
      case 'error':
        console.error('[PAYMENT_SECURITY]', logData);
        break;
      case 'warn':
        console.warn('[PAYMENT_SECURITY]', logData);
        break;
      default:
        console.info('[PAYMENT_SECURITY]', logData);
        break;
    }
  }
};

// Following Pattern: Export utilities with proper TypeScript typing
export type PaymentSecurityLog = typeof securePaymentLog;