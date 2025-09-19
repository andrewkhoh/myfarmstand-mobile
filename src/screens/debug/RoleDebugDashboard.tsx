/**
 * Role Debug Dashboard
 * Development tool for debugging role and permission issues
 * Only available in development mode
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { Screen, Text, Button, Card } from '../../components';
import {
  useCurrentUserRole,
  useRoleDebugger,
  useRoleOperations,
  usePermissions,
} from '../../hooks/role-based/useUnifiedRole';
import { useCurrentUser } from '../../hooks/useAuth';
import { unifiedRoleService } from '../../services/unifiedRoleService';
import { UserRole, ROLE_PERMISSIONS } from '../../types/roles';
import { spacing, colors } from '../../utils/theme';

interface PermissionTestResult {
  permission: Permission;
  allowed: boolean;
  reason?: string;
}

export const RoleDebugDashboard: React.FC = () => {
  const { data: currentUser } = useCurrentUser();
  const roleQuery = useCurrentUserRole();
  const { debugInfo, clearCache } = useRoleDebugger();
  const { updateUserRole, isUpdatingRole } = useRoleOperations();

  const [showDetailedInfo, setShowDetailedInfo] = useState(true);
  const [testResults, setTestResults] = useState<PermissionTestResult[]>([]);
  const [isTestingPermissions, setIsTestingPermissions] = useState(false);
  const [selectedTestRole, setSelectedTestRole] = useState<UserRole>(UserRole.CUSTOMER);

  // Test all permissions for current role
  const testAllPermissions = async () => {
    if (!currentUser?.id || !roleQuery.role) return;

    setIsTestingPermissions(true);
    const results: PermissionTestResult[] = [];

    // Get all possible permissions
    const allPermissions = Object.values(ROLE_PERMISSIONS).flat();
    const uniquePermissions = Array.from(new Set(allPermissions));

    for (const permission of uniquePermissions) {
      try {
        const result = await roleQuery.checkPermission(permission);
        results.push({
          permission,
          allowed: result.allowed,
          reason: result.reason,
        });
      } catch (error) {
        results.push({
          permission,
          allowed: false,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    setTestResults(results);
    setIsTestingPermissions(false);
  };

  // Switch to test role temporarily
  const switchToTestRole = async (testRole: UserRole) => {
    if (!currentUser?.id) return;

    try {
      await updateUserRole(currentUser.id, testRole);
      Alert.alert(
        'Role Changed',
        `Successfully switched to ${testRole}. This is for testing only - remember to switch back!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Role Change Failed',
        error instanceof Error ? error.message : 'Unknown error',
        [{ text: 'OK' }]
      );
    }
  };

  // Clear all caches
  const handleClearCache = () => {
    clearCache();
    Alert.alert('Cache Cleared', 'All role caches have been cleared', [{ text: 'OK' }]);
  };

  if (!__DEV__) {
    return (
      <Screen>
        <View style={styles.notAvailableContainer}>
          <Text style={styles.notAvailableText}>
            Role Debug Dashboard is only available in development mode
          </Text>
        </View>
      </Screen>
    );
  }

  if (!debugInfo) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading role debug info...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🔐 Role Debug Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Development tool for debugging role and permission issues
          </Text>
        </View>

        {/* Current Role Info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Current Role Information</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>User ID:</Text>
              <Text style={styles.infoValue}>{debugInfo.userId || 'Not authenticated'}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Role:</Text>
              <Text style={[styles.infoValue, styles.roleValue]}>{debugInfo.role || 'None'}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Is Admin:</Text>
              <Text style={[styles.infoValue, debugInfo.isAdmin ? styles.successText : styles.errorText]}>
                {debugInfo.isAdmin ? 'Yes' : 'No'}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Is Staff:</Text>
              <Text style={[styles.infoValue, debugInfo.isStaff ? styles.successText : styles.errorText]}>
                {debugInfo.isStaff ? 'Yes' : 'No'}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Last Updated:</Text>
              <Text style={styles.infoValue}>
                {new Date(debugInfo.lastUpdated).toLocaleString()}
              </Text>
            </View>
          </View>
        </Card>

        {/* Permissions */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Permissions</Text>
            <Switch
              value={showDetailedInfo}
              onValueChange={setShowDetailedInfo}
            />
          </View>

          {showDetailedInfo && (
            <View style={styles.permissionsList}>
              {debugInfo.permissions.map((permission, index) => (
                <View key={index} style={styles.permissionItem}>
                  <Text style={styles.permissionText}>✓ {permission}</Text>
                </View>
              ))}

              {debugInfo.permissions.length === 0 && (
                <Text style={styles.noPermissionsText}>No permissions assigned</Text>
              )}
            </View>
          )}

          <Text style={styles.permissionCount}>
            Total Permissions: {debugInfo.permissions.length}
          </Text>
        </Card>

        {/* Permission Testing */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Permission Testing</Text>

          <Button
            title={isTestingPermissions ? "Testing..." : "Test All Permissions"}
            onPress={testAllPermissions}
            disabled={isTestingPermissions || !currentUser?.id}
            style={styles.testButton}
          />

          {testResults.length > 0 && (
            <View style={styles.testResults}>
              <Text style={styles.testResultsTitle}>Test Results:</Text>
              {testResults.map((result, index) => (
                <View key={index} style={styles.testResultItem}>
                  <View style={styles.testResultHeader}>
                    <Text style={styles.testResultPermission}>{result.permission}</Text>
                    <Text style={[
                      styles.testResultStatus,
                      result.allowed ? styles.successText : styles.errorText
                    ]}>
                      {result.allowed ? 'ALLOWED' : 'DENIED'}
                    </Text>
                  </View>
                  {result.reason && (
                    <Text style={styles.testResultReason}>{result.reason}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Role Testing */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Role Testing (Use with Caution!)</Text>
          <Text style={styles.warningText}>
            ⚠️ This will actually change your role in the database. Use only for testing!
          </Text>

          <View style={styles.roleTestGrid}>
            {Object.values(UserRole).map((testRole) => (
              <TouchableOpacity
                key={testRole}
                style={[
                  styles.roleTestButton,
                  testRole === debugInfo.role && styles.currentRoleButton
                ]}
                onPress={() => switchToTestRole(testRole)}
                disabled={isUpdatingRole || testRole === debugInfo.role}
              >
                <Text style={[
                  styles.roleTestButtonText,
                  testRole === debugInfo.role && styles.currentRoleButtonText
                ]}>
                  {testRole}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Cache Management */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Cache Management</Text>
          <Text style={styles.cacheInfo}>
            Clear role caches to force fresh data retrieval from the server.
            Useful when testing role changes.
          </Text>

          <Button
            title="Clear All Caches"
            onPress={handleClearCache}
            style={styles.clearCacheButton}
          />
        </Card>

        {/* Debug Actions */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Actions</Text>

          <Button
            title="Trigger Role Query Refetch"
            onPress={() => roleQuery.refetch()}
            style={styles.debugButton}
          />

          <Button
            title="Log Debug Info to Console"
            onPress={() => console.log('🔐 Role Debug Info:', debugInfo)}
            style={[styles.debugButton, styles.marginTop]}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  infoGrid: {
    gap: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
  },
  roleValue: {
    fontWeight: '600',
    color: colors.primary[600],
  },
  successText: {
    color: colors.success,
  },
  errorText: {
    color: colors.error,
  },
  permissionsList: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 12,
    color: colors.success,
    fontFamily: 'monospace',
  },
  noPermissionsText: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  permissionCount: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  testButton: {
    marginBottom: spacing.md,
  },
  testResults: {
    maxHeight: 200,
  },
  testResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  testResultItem: {
    marginBottom: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  testResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testResultPermission: {
    fontSize: 11,
    color: colors.text.secondary,
    fontFamily: 'monospace',
    flex: 1,
  },
  testResultStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  testResultReason: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  warningText: {
    fontSize: 12,
    color: colors.warning,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  roleTestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  roleTestButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  currentRoleButton: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  roleTestButtonText: {
    fontSize: 12,
    color: colors.text.primary,
  },
  currentRoleButtonText: {
    color: 'white',
  },
  cacheInfo: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  clearCacheButton: {
    backgroundColor: colors.warning,
  },
  debugButton: {
    backgroundColor: colors.info,
  },
  marginTop: {
    marginTop: spacing.sm,
  },
  notAvailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  notAvailableText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
});