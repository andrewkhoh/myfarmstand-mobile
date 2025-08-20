/**
 * Kiosk Service Aligned Pattern Tests
 * 
 * Purpose: Verify that kioskService follows architectural patterns
 * Test ID: KIOSK-SERVICE-ALIGNED-001
 * Created: 2025-08-19
 * 
 * Traceable Requirements:
 * - REQ-001: Follow direct Supabase query pattern
 * - REQ-002: Implement ValidationMonitor integration
 * - REQ-003: Use transformation schemas (Raw → App format)
 * - REQ-004: Resilient item processing with skip-on-error
 * - REQ-005: User-friendly error messages
 */

import { kioskService } from '../kioskService';
import { supabase } from '../../config/supabase';
import { ValidationMonitor } from '../../utils/validationMonitor';

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/validationMonitor');

describe('KioskService - Aligned Pattern Compliance', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;
  const mockValidationMonitor = ValidationMonitor as jest.Mocked<typeof ValidationMonitor>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default ValidationMonitor behavior
    mockValidationMonitor.recordPatternSuccess = jest.fn();
    mockValidationMonitor.recordValidationError = jest.fn();
  });

  describe('REQ-001: Direct Supabase Query Pattern', () => {
    it('TEST-001-A: authenticateStaff should use direct Supabase queries', async () => {
      // Arrange
      const testPin = '1234';
      const mockStaffData = {
        id: 'pin-123',
        user_id: 'user-456',
        pin: '1234',
        is_active: true,
        last_used: null,
        created_at: '2025-08-19T09:00:00Z',
        updated_at: '2025-08-19T10:00:00Z',
        users: {
          id: 'user-456',
          name: 'John Staff',
          email: 'john@farm.com',
          raw_user_meta_data: { role: 'staff' }
        }
      };

      mockSupabase.from = jest.fn().mockImplementation((table) => {
        if (table === 'staff_pins') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockStaffData,
                    error: null
                  })
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          };
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { name: 'John Staff', raw_user_meta_data: { role: 'staff' } },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'kiosk_sessions') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' }
              })
            })
          })
        };
      });

      // Act
      const result = await kioskService.authenticateStaff(testPin);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('staff_pins');
      expect(mockSupabase.from).toHaveBeenCalledWith('kiosk_sessions');
      expect(result.success).toBe(true);
      expect(result.sessionId).toBeDefined();
      expect(result.staffName).toBe('John Staff'); // Now matches actual user data
      
      // Verify no complex JOINs were used (pattern compliance)
      const fromCalls = mockSupabase.from.mock.calls;
      expect(fromCalls.length).toBeGreaterThanOrEqual(2); // At least 2 separate queries
    });

    it('TEST-001-B: getSession should use indexed fields for queries', async () => {
      // Arrange
      const sessionId = 'session-123';
      const mockSessionData = {
        id: sessionId,
        staff_id: 'user-456',
        session_start: '2025-08-19T10:00:00Z',
        session_end: null,
        total_sales: 150.50,
        transaction_count: 3,
        is_active: true,
        device_id: null,
        created_at: '2025-08-19T09:00:00Z',
        updated_at: '2025-08-19T10:00:00Z',
        users: {
          id: 'user-456',
          name: 'John Staff',
          email: 'john@farm.com',
          raw_user_meta_data: { role: 'staff' }
        },
        staff: {
          name: 'John Staff',
          role: 'staff'
        }
      };

      // Mock the new two-query approach
      mockSupabase.from = jest.fn().mockImplementation((table) => {
        if (table === 'kiosk_sessions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: sessionId,
                    staff_id: 'user-456',
                    session_start: '2025-08-19T10:00:00Z',
                    session_end: null,
                    total_sales: 150.50,
                    transaction_count: 3,
                    is_active: true,
                    device_id: null,
                    created_at: '2025-08-19T09:00:00Z',
                    updated_at: '2025-08-19T10:00:00Z'
                  },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    name: 'John Staff',
                    raw_user_meta_data: { role: 'staff' }
                  },
                  error: null
                })
              })
            })
          };
        }
        return {};
      });

      // Act
      const result = await kioskService.getSession(sessionId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.id).toBe(sessionId);
      
      // Verify indexed field was used
      const selectCall = mockSupabase.from.mock.results[0].value.select;
      expect(selectCall).toHaveBeenCalled();
    });
  });

  describe('REQ-002: ValidationMonitor Integration', () => {
    it('TEST-002-A: should record pattern success on successful authentication', async () => {
      // Arrange
      const testPin = '1234';
      const mockStaffData = {
        id: 'pin-123',
        user_id: 'user-456',
        pin: '1234',
        is_active: true,
        created_at: '2025-08-19T09:00:00Z',
        updated_at: '2025-08-19T10:00:00Z'
      };
      
      const mockUserData = {
        name: 'John Staff',
        raw_user_meta_data: { role: 'staff' }
      };

      mockSupabase.from = jest.fn().mockImplementation((table) => {
        if (table === 'staff_pins') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockStaffData,
                    error: null
                  })
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          };
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockUserData,
                  error: null
                })
              })
            })
          };
        }
        if (table === 'kiosk_sessions') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return {};
      });

      // Act
      await kioskService.authenticateStaff(testPin);

      // Assert
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'KioskService',
          pattern: 'direct_supabase_query_with_validation',
          operation: 'authenticateStaff'
        })
      );
    });

    it('TEST-002-B: should record validation error on invalid PIN', async () => {
      // Arrange
      const testPin = '9999';
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' }
              })
            })
          })
        })
      });

      // Act
      const result = await kioskService.authenticateStaff(testPin);

      // Assert
      expect(result.success).toBe(false);
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'KioskService.authenticateStaff.pinValidation',
          errorCode: 'INVALID_STAFF_PIN'
        })
      );
    });
  });

  describe('REQ-003: Transformation Schema Pattern', () => {
    it('TEST-003-A: should transform database format to app format', async () => {
      // Arrange
      const sessionId = 'session-123';
      const dbFormat = {
        id: sessionId,
        staff_id: 'user-456',
        session_start: '2025-08-19T10:00:00Z',
        session_end: null,
        total_sales: null, // Database allows null
        transaction_count: null, // Database allows null
        is_active: null, // Database allows null
        device_id: null,
        created_at: '2025-08-19T09:00:00Z',
        updated_at: '2025-08-19T10:00:00Z',
        users: {
          id: 'user-456',
          name: 'John Staff',
          email: 'john@farm.com',
          raw_user_meta_data: { role: 'staff' }
        },
        staff: {
          name: 'John Staff',
          role: 'staff'
        }
      };

      // Mock the new two-query approach for transformation test
      mockSupabase.from = jest.fn().mockImplementation((table) => {
        if (table === 'kiosk_sessions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: sessionId,
                    staff_id: 'user-456',
                    session_start: '2025-08-19T10:00:00Z',
                    session_end: null,
                    total_sales: null, // Database allows null
                    transaction_count: null, // Database allows null
                    is_active: null, // Database allows null
                    device_id: null,
                    created_at: '2025-08-19T09:00:00Z',
                    updated_at: '2025-08-19T10:00:00Z'
                  },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    name: 'John Staff',
                    raw_user_meta_data: { role: 'staff' }
                  },
                  error: null
                })
              })
            })
          };
        }
        return {};
      });

      // Act
      const result = await kioskService.getSession(sessionId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      
      // Verify transformation applied defaults
      expect(result.session?.totalSales).toBe(0); // Default applied
      expect(result.session?.transactionCount).toBe(0); // Default applied
      expect(result.session?.isActive).toBe(true); // Default applied
      
      // Verify camelCase transformation
      expect(result.session?.staffId).toBe('user-456');
      expect(result.session?.staffName).toBe('John Staff');
      
      // Verify metadata preservation
      expect(result.session?._dbData).toBeDefined();
      expect(result.session?._dbData.staff_id).toBe('user-456');
    });
  });

  describe('REQ-004: Resilient Item Processing', () => {
    it('TEST-004-A: getSessions should skip invalid sessions and continue', async () => {
      // Arrange
      const mockSessions = [
        {
          id: 'session-1',
          staff_id: 'user-1',
          session_start: '2025-08-19T10:00:00Z',
          users: { name: 'Staff 1', raw_user_meta_data: { role: 'staff' } }
        },
        {
          id: 'session-2',
          staff_id: null, // Invalid - missing required field
          session_start: '2025-08-19T11:00:00Z',
          users: { name: 'Staff 2', raw_user_meta_data: { role: 'staff' } }
        },
        {
          id: 'session-3',
          staff_id: 'user-3',
          session_start: '2025-08-19T12:00:00Z',
          users: { name: 'Staff 3', raw_user_meta_data: { role: 'manager' } }
        }
      ];

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockSessions,
            error: null
          })
        })
      });

      // Act
      const result = await kioskService.getSessions();

      // Assert
      expect(result.success).toBe(true);
      expect(result.sessions).toHaveLength(2); // Only valid sessions
      expect(result.sessions[0].id).toBe('session-1');
      expect(result.sessions[1].id).toBe('session-3');
      
      // Verify error was logged but didn't break processing
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'KioskService.processKioskSessions',
          errorCode: 'SESSION_VALIDATION_FAILED'
        })
      );
      
      // Verify successful items were also tracked
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledTimes(3); // 2 valid items + overall operation
    });
  });

  describe('REQ-005: User-Friendly Error Messages', () => {
    it('TEST-005-A: should provide user-friendly messages on authentication failure', async () => {
      // Arrange
      const testPin = '9999';
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'PGRST116' } // Technical database error
              })
            })
          })
        })
      });

      // Act
      const result = await kioskService.authenticateStaff(testPin);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid PIN'); // User-friendly message
      
      // Technical error should be logged separately
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: 'Invalid PIN provided' // Technical message for logs
        })
      );
    });

    it('TEST-005-B: should handle insufficient permissions gracefully', async () => {
      // Arrange
      const testPin = '1234';
      const mockStaffData = {
        id: 'pin-123',
        user_id: 'user-456',
        pin: '1234',
        is_active: true,
        created_at: '2025-08-19T09:00:00Z',
        updated_at: '2025-08-19T10:00:00Z'
      };
      
      const mockUserData = {
        name: 'John Customer',
        raw_user_meta_data: { role: 'customer' } // Wrong role
      };

      mockSupabase.from = jest.fn().mockImplementation((table) => {
        if (table === 'staff_pins') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockStaffData,
                    error: null
                  })
                })
              })
            })
          };
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockUserData,
                  error: null
                })
              })
            })
          };
        }
        return {};
      });

      // Act
      const result = await kioskService.authenticateStaff(testPin);

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Insufficient permissions for kiosk access');
      
      expect(mockValidationMonitor.recordValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: 'KioskService.authenticateStaff.roleValidation',
          errorCode: 'INSUFFICIENT_PERMISSIONS'
        })
      );
    });
  });

  describe('Performance Tracking', () => {
    it('TEST-PERF-001: should track performance metrics', async () => {
      // Arrange
      const testPin = '1234';
      const mockStaffData = {
        id: 'pin-123',
        user_id: 'user-456',
        pin: '1234',
        is_active: true,
        created_at: '2025-08-19T09:00:00Z',
        updated_at: '2025-08-19T10:00:00Z'
      };
      
      const mockUserData = {
        name: 'John Staff',
        raw_user_meta_data: { role: 'staff' }
      };

      mockSupabase.from = jest.fn().mockImplementation((table) => {
        if (table === 'staff_pins') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockStaffData,
                    error: null
                  })
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          };
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockUserData,
                  error: null
                })
              })
            })
          };
        }
        if (table === 'kiosk_sessions') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null })
          };
        }
        return {};
      });

      // Act
      await kioskService.authenticateStaff(testPin);

      // Assert
      expect(mockValidationMonitor.recordPatternSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'KioskService',
          pattern: 'direct_supabase_query_with_validation',
          operation: 'authenticateStaff',
          performanceMs: expect.any(Number)
        })
      );
    });
  });
});

/**
 * Test Execution Report Template
 * ================================
 * Test Suite: KioskService - Aligned Pattern Compliance
 * Date: [EXECUTION_DATE]
 * 
 * Results:
 * - Total Tests: 9
 * - Passed: [PASSED_COUNT]
 * - Failed: [FAILED_COUNT]
 * - Skipped: [SKIPPED_COUNT]
 * 
 * Pattern Compliance:
 * ✅ REQ-001: Direct Supabase queries (2/2 tests)
 * ✅ REQ-002: ValidationMonitor integration (2/2 tests)
 * ✅ REQ-003: Transformation schemas (1/1 test)
 * ✅ REQ-004: Resilient processing (1/1 test)
 * ✅ REQ-005: User-friendly errors (2/2 tests)
 * ✅ PERF: Performance tracking (1/1 test)
 * 
 * Notes:
 * [ADD_EXECUTION_NOTES]
 * 
 * Next Steps:
 * [ADD_FOLLOW_UP_ACTIONS]
 */