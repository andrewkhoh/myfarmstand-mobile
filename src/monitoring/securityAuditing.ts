/**
 * Security Auditing Service
 * Phase 5: Production Readiness - Comprehensive security monitoring and auditing
 * 
 * Provides security event logging, RLS policy validation, and permission boundary testing
 * Following patterns from docs/architectural-patterns-and-best-practices.md
 */

import { supabase } from '../config/supabase';
import { z } from 'zod';

// Security audit event schema
const SecurityAuditEventSchema = z.object({
  auditType: z.enum(['permission_check', 'role_change', 'data_access', 'security_violation']),
  userId: z.string().uuid().optional(),
  userRole: z.string(),
  resourceAccessed: z.string(),
  permissionChecked: z.string(),
  accessGranted: z.boolean(),
  accessContext: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

const SecurityViolationSchema = z.object({
  violationType: z.enum(['unauthorized_access', 'privilege_escalation', 'data_breach', 'injection_attempt', 'rate_limit_exceeded']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  evidence: z.record(z.any()),
  affectedResources: z.array(z.string()),
  userContext: z.object({
    userId: z.string().optional(),
    userRole: z.string(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
  }),
});

type SecurityAuditEvent = z.infer<typeof SecurityAuditEventSchema>;
type SecurityViolation = z.infer<typeof SecurityViolationSchema>;

// RLS Policy validation results
interface RLSPolicyValidation {
  table: string;
  policy: string;
  isActive: boolean;
  coverage: 'complete' | 'partial' | 'missing';
  issues: string[];
  recommendations: string[];
}

// Permission boundary test results
interface PermissionBoundaryTest {
  role: string;
  resource: string;
  action: string;
  expectedAccess: boolean;
  actualAccess: boolean;
  testPassed: boolean;
  context: Record<string, any>;
}

class SecurityAuditingService {

  /**
   * Log security audit event
   * Uses direct Supabase queries with validation pipeline following established patterns
   */
  async logAuditEvent(event: SecurityAuditEvent): Promise<{ success: boolean; auditId?: string; error?: string }> {
    try {
      // Single validation pass principle
      const validatedEvent = SecurityAuditEventSchema.parse(event);
      
      // Database-first validation with transformation schema
      const { data, error } = await supabase.rpc('log_security_audit', {
        p_audit_type: validatedEvent.auditType,
        p_user_id: validatedEvent.userId || null,
        p_user_role: validatedEvent.userRole,
        p_resource_accessed: validatedEvent.resourceAccessed,
        p_permission_checked: validatedEvent.permissionChecked,
        p_access_granted: validatedEvent.accessGranted,
        p_access_context: validatedEvent.accessContext || null,
        p_ip_address: validatedEvent.ipAddress || null,
        p_user_agent: validatedEvent.userAgent || null,
      });

      if (error) {
        console.error('Security audit logging failed:', error);
        return { success: false, error: error.message };
      }

      // If access was denied, trigger additional security checks
      if (!validatedEvent.accessGranted) {
        await this.handleAccessDenied(validatedEvent);
      }

      return { success: true, auditId: data };
      
    } catch (error) {
      console.error('Security audit validation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    }
  }

  /**
   * Log security violation
   */
  async logSecurityViolation(violation: SecurityViolation): Promise<{ success: boolean; error?: string }> {
    try {
      const validatedViolation = SecurityViolationSchema.parse(violation);
      
      // Log as critical error
      const { error } = await supabase.rpc('log_system_error', {
        p_error_level: validatedViolation.severity === 'critical' ? 'critical' : 'error',
        p_error_category: 'security',
        p_error_message: `Security violation: ${validatedViolation.violationType}`,
        p_affected_service: 'security-monitor',
        p_error_context: {
          violation: validatedViolation,
          timestamp: new Date().toISOString(),
        },
        p_user_role_context: validatedViolation.userContext.userRole,
      });

      if (error) {
        console.error('Security violation logging failed:', error);
        return { success: false, error: error.message };
      }

      // Also log as security audit event
      await this.logAuditEvent({
        auditType: 'security_violation',
        userId: validatedViolation.userContext.userId,
        userRole: validatedViolation.userContext.userRole,
        resourceAccessed: validatedViolation.affectedResources.join(','),
        permissionChecked: validatedViolation.violationType,
        accessGranted: false,
        accessContext: {
          violation: validatedViolation,
        },
        ipAddress: validatedViolation.userContext.ipAddress,
        userAgent: validatedViolation.userContext.userAgent,
      });

      // Trigger immediate response for critical violations
      if (validatedViolation.severity === 'critical') {
        await this.handleCriticalSecurityViolation(validatedViolation);
      }

      return { success: true };
      
    } catch (error) {
      console.error('Security violation validation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    }
  }

  /**
   * Validate RLS policies across all tables
   */
  async validateRLSPolicies(): Promise<{ 
    success: boolean; 
    results?: RLSPolicyValidation[]; 
    overallCoverage?: number;
    error?: string 
  }> {
    try {
      const criticalTables = [
        'users', 'user_roles', 'role_permissions',
        'products', 'categories', 'inventory_items',
        'orders', 'order_items', 'cart_items',
        'staff_pins', 'kiosk_sessions',
        'system_performance_metrics', 'system_error_logs', 'security_audit_logs'
      ];

      const results: RLSPolicyValidation[] = [];

      for (const table of criticalTables) {
        const validation = await this.validateTableRLS(table);
        results.push(validation);
      }

      // Calculate overall coverage
      const completeCoverage = results.filter(r => r.coverage === 'complete').length;
      const overallCoverage = completeCoverage / results.length;

      // Log audit results
      await this.logAuditEvent({
        auditType: 'permission_check',
        userRole: 'system',
        resourceAccessed: 'rls_policies',
        permissionChecked: 'validate_all',
        accessGranted: overallCoverage > 0.9,
        accessContext: {
          totalTables: criticalTables.length,
          completeCoverage,
          overallCoverage,
          issues: results.flatMap(r => r.issues),
        },
      });

      return { success: true, results, overallCoverage };
      
    } catch (error) {
      console.error('RLS policy validation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Test permission boundaries for all role combinations
   */
  async testPermissionBoundaries(): Promise<{ 
    success: boolean; 
    results?: PermissionBoundaryTest[]; 
    passRate?: number;
    error?: string 
  }> {
    try {
      const roles = ['customer', 'inventory_staff', 'marketing_staff', 'executive', 'admin'];
      const resources = ['products', 'orders', 'inventory', 'analytics', 'users', 'system_config'];
      const actions = ['read', 'create', 'update', 'delete'];

      const tests: PermissionBoundaryTest[] = [];

      for (const role of roles) {
        for (const resource of resources) {
          for (const action of actions) {
            const test = await this.testRolePermission(role, resource, action);
            tests.push(test);
          }
        }
      }

      const passedTests = tests.filter(t => t.testPassed).length;
      const passRate = passedTests / tests.length;

      // Log permission boundary test results
      await this.logAuditEvent({
        auditType: 'permission_check',
        userRole: 'system',
        resourceAccessed: 'permission_boundaries',
        permissionChecked: 'test_all_combinations',
        accessGranted: passRate > 0.95,
        accessContext: {
          totalTests: tests.length,
          passedTests,
          passRate,
          failedTests: tests.filter(t => !t.testPassed),
        },
      });

      return { success: true, results: tests, passRate };
      
    } catch (error) {
      console.error('Permission boundary testing failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Monitor for suspicious access patterns
   */
  async monitorAccessPatterns(timeWindow = '1 hour'): Promise<{
    success: boolean;
    suspiciousActivities?: Array<{
      type: string;
      severity: string;
      description: string;
      evidence: Record<string, any>;
    }>;
    error?: string;
  }> {
    try {
      const timeFilter = this.getTimeFilter(timeWindow);
      
      // Query recent audit logs for pattern analysis
      const { data: recentAudits, error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .gte('audit_timestamp', timeFilter)
        .order('audit_timestamp', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch audit logs: ${error.message}`);
      }

      const suspiciousActivities = await this.analyzeAccessPatterns(recentAudits || []);

      // Log monitoring results
      await this.logAuditEvent({
        auditType: 'data_access',
        userRole: 'system',
        resourceAccessed: 'access_patterns',
        permissionChecked: 'monitor_suspicious_activity',
        accessGranted: true,
        accessContext: {
          timeWindow,
          auditCount: recentAudits?.length || 0,
          suspiciousCount: suspiciousActivities.length,
        },
      });

      return { success: true, suspiciousActivities };
      
    } catch (error) {
      console.error('Access pattern monitoring failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Generate security compliance report
   */
  async generateComplianceReport(): Promise<{
    success: boolean;
    report?: {
      rlsCoverage: number;
      permissionBoundaryCompliance: number;
      securityViolations: number;
      recommendations: string[];
      overallScore: number;
    };
    error?: string;
  }> {
    try {
      // Validate RLS policies
      const rlsValidation = await this.validateRLSPolicies();
      if (!rlsValidation.success) {
        throw new Error('RLS validation failed');
      }

      // Test permission boundaries
      const permissionTests = await this.testPermissionBoundaries();
      if (!permissionTests.success) {
        throw new Error('Permission boundary tests failed');
      }

      // Get recent security violations
      const { data: violations } = await supabase
        .from('system_error_logs')
        .select('*')
        .eq('error_category', 'security')
        .gte('error_timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const securityViolations = violations?.length || 0;

      // Generate recommendations
      const recommendations = this.generateSecurityRecommendations(
        rlsValidation.results || [],
        permissionTests.results || [],
        securityViolations
      );

      // Calculate overall security score
      const rlsScore = (rlsValidation.overallCoverage || 0) * 100;
      const permissionScore = (permissionTests.passRate || 0) * 100;
      const violationPenalty = Math.min(securityViolations * 5, 30); // Max 30 point penalty
      
      const overallScore = Math.max(0, (rlsScore + permissionScore) / 2 - violationPenalty);

      const report = {
        rlsCoverage: rlsScore,
        permissionBoundaryCompliance: permissionScore,
        securityViolations,
        recommendations,
        overallScore,
      };

      // Log compliance report generation
      await this.logAuditEvent({
        auditType: 'data_access',
        userRole: 'system',
        resourceAccessed: 'security_compliance',
        permissionChecked: 'generate_report',
        accessGranted: true,
        accessContext: { report },
      });

      return { success: true, report };
      
    } catch (error) {
      console.error('Compliance report generation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Private helper methods
   */

  private async validateTableRLS(table: string): Promise<RLSPolicyValidation> {
    try {
      // Check if RLS is enabled
      const { data: rlsStatus } = await supabase
        .from('pg_class')
        .select('relrowsecurity')
        .eq('relname', table)
        .single();

      const isActive = rlsStatus?.relrowsecurity || false;

      // Check for existing policies
      const { data: policies } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', table);

      const issues: string[] = [];
      const recommendations: string[] = [];

      if (!isActive) {
        issues.push('RLS not enabled');
        recommendations.push('Enable row level security');
      }

      if (!policies || policies.length === 0) {
        issues.push('No RLS policies found');
        recommendations.push('Implement appropriate RLS policies');
      }

      const coverage = this.determineCoverage(isActive, policies || []);

      return {
        table,
        policy: policies?.map(p => p.policyname).join(', ') || 'none',
        isActive,
        coverage,
        issues,
        recommendations,
      };
      
    } catch (error) {
      return {
        table,
        policy: 'error',
        isActive: false,
        coverage: 'missing',
        issues: [`Failed to validate: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: ['Manual inspection required'],
      };
    }
  }

  private async testRolePermission(role: string, resource: string, action: string): Promise<PermissionBoundaryTest> {
    try {
      // Define expected permissions based on role
      const expectedAccess = this.getExpectedAccess(role, resource, action);
      
      // Test actual access using the permission system
      const { data: actualAccess } = await supabase.rpc('check_role_permission', {
        p_role: role,
        p_resource: resource,
        p_action: action,
      });

      const testPassed = expectedAccess === (actualAccess || false);

      return {
        role,
        resource,
        action,
        expectedAccess,
        actualAccess: actualAccess || false,
        testPassed,
        context: {
          timestamp: new Date().toISOString(),
        },
      };
      
    } catch (error) {
      return {
        role,
        resource,
        action,
        expectedAccess: false,
        actualAccess: false,
        testPassed: false,
        context: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  private async handleAccessDenied(event: SecurityAuditEvent): Promise<void> {
    // Count recent access denials for this user
    const { data: recentDenials } = await supabase
      .from('security_audit_logs')
      .select('id')
      .eq('user_id', event.userId)
      .eq('access_granted', false)
      .gte('audit_timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

    if (recentDenials && recentDenials.length > 5) {
      // Potential brute force or privilege escalation attempt
      await this.logSecurityViolation({
        violationType: 'privilege_escalation',
        severity: 'medium',
        description: 'Multiple access denials detected',
        evidence: {
          userId: event.userId,
          denialCount: recentDenials.length,
          resource: event.resourceAccessed,
        },
        affectedResources: [event.resourceAccessed],
        userContext: {
          userId: event.userId,
          userRole: event.userRole,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
        },
      });
    }
  }

  private async handleCriticalSecurityViolation(violation: SecurityViolation): Promise<void> {
    // Implement immediate response actions for critical violations
    console.error('CRITICAL SECURITY VIOLATION:', violation);
    
    // In a real implementation, this might:
    // - Send immediate alerts to security team
    // - Temporarily suspend user account
    // - Block IP address
    // - Trigger incident response procedures
  }

  private async analyzeAccessPatterns(audits: any[]): Promise<Array<{
    type: string;
    severity: string;
    description: string;
    evidence: Record<string, any>;
  }>> {
    const suspiciousActivities = [];

    // Group by user for pattern analysis
    const userActivities = new Map<string, any[]>();
    
    audits.forEach(audit => {
      if (audit.user_id) {
        if (!userActivities.has(audit.user_id)) {
          userActivities.set(audit.user_id, []);
        }
        userActivities.get(audit.user_id)!.push(audit);
      }
    });

    // Analyze each user's patterns
    for (const [userId, activities] of userActivities) {
      // Check for rapid successive access attempts
      if (activities.length > 20) {
        suspiciousActivities.push({
          type: 'rapid_access',
          severity: 'medium',
          description: 'Unusually high number of access attempts',
          evidence: {
            userId,
            accessCount: activities.length,
            timeWindow: '1 hour',
          },
        });
      }

      // Check for off-hours access
      const offHoursAccess = activities.filter(a => {
        const hour = new Date(a.audit_timestamp).getHours();
        return hour < 6 || hour > 22; // Outside 6 AM - 10 PM
      });

      if (offHoursAccess.length > 5) {
        suspiciousActivities.push({
          type: 'off_hours_access',
          severity: 'low',
          description: 'Access during unusual hours',
          evidence: {
            userId,
            offHoursCount: offHoursAccess.length,
            times: offHoursAccess.map(a => a.audit_timestamp),
          },
        });
      }

      // Check for privilege escalation attempts
      const deniedAccess = activities.filter(a => !a.access_granted);
      if (deniedAccess.length > 10) {
        suspiciousActivities.push({
          type: 'privilege_escalation',
          severity: 'high',
          description: 'Multiple access denials suggest privilege escalation attempt',
          evidence: {
            userId,
            deniedCount: deniedAccess.length,
            resources: [...new Set(deniedAccess.map(a => a.resource_accessed))],
          },
        });
      }
    }

    return suspiciousActivities;
  }

  private determineCoverage(isActive: boolean, policies: any[]): 'complete' | 'partial' | 'missing' {
    if (!isActive) return 'missing';
    if (policies.length === 0) return 'missing';
    
    // Check for common policy patterns
    const hasSelectPolicy = policies.some(p => p.cmd === 'SELECT');
    const hasInsertPolicy = policies.some(p => p.cmd === 'INSERT');
    const hasUpdatePolicy = policies.some(p => p.cmd === 'UPDATE');
    const hasDeletePolicy = policies.some(p => p.cmd === 'DELETE');

    const coverageCount = [hasSelectPolicy, hasInsertPolicy, hasUpdatePolicy, hasDeletePolicy].filter(Boolean).length;
    
    if (coverageCount >= 3) return 'complete';
    if (coverageCount >= 1) return 'partial';
    return 'missing';
  }

  private getExpectedAccess(role: string, resource: string, action: string): boolean {
    const permissions = {
      customer: {
        products: ['read'],
        orders: ['read', 'create'],
        inventory: [],
        analytics: [],
        users: [],
        system_config: [],
      },
      inventory_staff: {
        products: ['read', 'update'],
        orders: ['read', 'update'],
        inventory: ['read', 'create', 'update'],
        analytics: ['read'],
        users: [],
        system_config: [],
      },
      marketing_staff: {
        products: ['read', 'create', 'update'],
        orders: ['read'],
        inventory: ['read'],
        analytics: ['read', 'create'],
        users: [],
        system_config: [],
      },
      executive: {
        products: ['read'],
        orders: ['read'],
        inventory: ['read'],
        analytics: ['read'],
        users: ['read'],
        system_config: ['read'],
      },
      admin: {
        products: ['read', 'create', 'update', 'delete'],
        orders: ['read', 'create', 'update', 'delete'],
        inventory: ['read', 'create', 'update', 'delete'],
        analytics: ['read', 'create', 'update', 'delete'],
        users: ['read', 'create', 'update', 'delete'],
        system_config: ['read', 'create', 'update', 'delete'],
      },
    };

    const rolePermissions = permissions[role as keyof typeof permissions];
    if (!rolePermissions) return false;

    const resourcePermissions = rolePermissions[resource as keyof typeof rolePermissions];
    if (!resourcePermissions) return false;

    return resourcePermissions.includes(action);
  }

  private generateSecurityRecommendations(
    rlsResults: RLSPolicyValidation[],
    permissionResults: PermissionBoundaryTest[],
    violationCount: number
  ): string[] {
    const recommendations: string[] = [];

    // RLS recommendations
    const missingRLS = rlsResults.filter(r => r.coverage === 'missing');
    if (missingRLS.length > 0) {
      recommendations.push(`Enable RLS and implement policies for: ${missingRLS.map(r => r.table).join(', ')}`);
    }

    const partialRLS = rlsResults.filter(r => r.coverage === 'partial');
    if (partialRLS.length > 0) {
      recommendations.push(`Complete RLS policy coverage for: ${partialRLS.map(r => r.table).join(', ')}`);
    }

    // Permission boundary recommendations
    const failedPermissions = permissionResults.filter(r => !r.testPassed);
    if (failedPermissions.length > 0) {
      recommendations.push(`Fix permission boundary issues for ${failedPermissions.length} role/resource combinations`);
    }

    // Security violation recommendations
    if (violationCount > 0) {
      recommendations.push('Investigate and remediate recent security violations');
      if (violationCount > 10) {
        recommendations.push('Consider implementing additional security controls and monitoring');
      }
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Maintain current security posture with regular monitoring');
    } else {
      recommendations.push('Implement automated security testing in CI/CD pipeline');
      recommendations.push('Set up real-time security alerting for critical violations');
    }

    return recommendations;
  }

  private getTimeFilter(timeWindow: string): string {
    const now = new Date();
    let milliseconds = 60 * 60 * 1000; // Default 1 hour

    if (timeWindow.includes('minute')) {
      const minutes = parseInt(timeWindow);
      milliseconds = minutes * 60 * 1000;
    } else if (timeWindow.includes('hour')) {
      const hours = parseInt(timeWindow);
      milliseconds = hours * 60 * 60 * 1000;
    } else if (timeWindow.includes('day')) {
      const days = parseInt(timeWindow);
      milliseconds = days * 24 * 60 * 60 * 1000;
    }

    return new Date(now.getTime() - milliseconds).toISOString();
  }
}

// Export singleton instance
export const securityAuditing = new SecurityAuditingService();

// Export types for use in other modules
export type { 
  SecurityAuditEvent, 
  SecurityViolation, 
  RLSPolicyValidation, 
  PermissionBoundaryTest 
};
export { SecurityAuditEventSchema, SecurityViolationSchema };