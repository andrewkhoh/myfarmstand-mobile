/**
 * Role Selection Screen
 * Allows users with multiple roles to switch between them
 * Following docs/architectural-patterns-and-best-practices.md
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text, Card, Button, Loading } from '../../components';
import { useUserRole } from '../../hooks/role-based/useUserRole';
import { useRoleNavigation } from '../../hooks/role-based/useRoleNavigation';
import { RolePermissionService } from '../../services/role-based/rolePermissionService';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { UserRole } from '../../types';

interface RoleOption {
  role: UserRole;
  title: string;
  description: string;
  icon: string;
  color: string;
  permissions: string[];
  isActive: boolean;
  isAvailable: boolean;
}

interface RoleSelectionScreenProps {
  testID?: string;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({
  testID = 'role-selection-screen'
}) => {
  const navigation = useNavigation();
  const { width: screenWidth } = Dimensions.get('window');
  const isTablet = screenWidth > 768;

  // Role-based hooks
  const { 
    data: currentUserRole, 
    isLoading: isRoleLoading, 
    error: roleError,
    refetch: refetchRole 
  } = useUserRole();

  const {
    getDefaultScreen,
    handlePermissionDenied,
  } = useRoleNavigation();

  // Component state
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>({} as Record<UserRole, string[]>);

  // Role configurations
  const roleConfigs: Record<UserRole, Omit<RoleOption, 'isActive' | 'isAvailable' | 'permissions'>> = {
    customer: {
      role: 'customer',
      title: 'Customer',
      description: 'Shop for fresh produce and place orders',
      icon: '🛍️',
      color: '#4CAF50',
    },
    farmer: {
      role: 'farmer',
      title: 'Farmer',
      description: 'Manage your farm products and fulfill orders',
      icon: '🌾',
      color: '#8BC34A',
    },
    vendor: {
      role: 'vendor',
      title: 'Vendor',
      description: 'Sell products through the marketplace',
      icon: '🏪',
      color: '#FF9800',
    },
    admin: {
      role: 'admin',
      title: 'Administrator',
      description: 'Manage system settings and user permissions',
      icon: '⚙️',
      color: '#2196F3',
    },
    staff: {
      role: 'staff',
      title: 'Staff Member',
      description: 'Assist with order fulfillment and customer support',
      icon: '👨‍💼',
      color: '#9C27B0',
    },
  };

  // Load available roles for current user
  const loadAvailableRoles = useCallback(async () => {
    if (!currentUserRole?.userId) return;

    setIsLoadingRoles(true);
    
    try {
      // Get user's available roles from the role permission service
      const userRoles = await RolePermissionService.getUserRoles(currentUserRole.userId);
      
      if (!userRoles.success || !userRoles.data) {
        throw new Error('Failed to load available roles');
      }

      const rolesWithPermissions = await Promise.all(
        userRoles.data.map(async (userRole) => {
          try {
            const permissions = await RolePermissionService.getRolePermissions(userRole.role_type as UserRole);
            const permissionList = permissions.success ? permissions.data?.map(p => p.permission_name) || [] : [];
            
            setRolePermissions(prev => ({
              ...prev,
              [userRole.role_type as UserRole]: permissionList
            }));

            const config = roleConfigs[userRole.role_type as UserRole];
            return {
              ...config,
              permissions: permissionList,
              isActive: userRole.role_type === currentUserRole.role,
              isAvailable: userRole.is_active,
            };
          } catch (error) {
            ValidationMonitor.recordValidationError({
              context: 'RoleSelectionScreen.loadRolePermissions',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              errorCode: 'ROLE_PERMISSIONS_LOAD_FAILED'
            });
            
            const config = roleConfigs[userRole.role_type as UserRole];
            return {
              ...config,
              permissions: [],
              isActive: userRole.role_type === currentUserRole.role,
              isAvailable: userRole.is_active,
            };
          }
        })
      );

      setAvailableRoles(rolesWithPermissions);

      ValidationMonitor.recordPatternSuccess({
        service: 'RoleSelectionScreen' as const,
        pattern: 'data_loading' as const,
        operation: 'loadAvailableRoles' as const
      });
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RoleSelectionScreen.loadAvailableRoles',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'AVAILABLE_ROLES_LOAD_FAILED'
      });
      
      Alert.alert(
        'Loading Error',
        'Failed to load available roles. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingRoles(false);
    }
  }, [currentUserRole?.userId, currentUserRole?.role, roleConfigs]);

  // Handle role selection
  const handleRoleSelection = useCallback((role: UserRole) => {
    if (role === currentUserRole?.role) {
      // Already active role, just navigate to dashboard
      navigateToDashboard();
      return;
    }

    setSelectedRole(role);
    setShowConfirmationModal(true);
  }, [currentUserRole?.role]);

  // Confirm role switch
  const confirmRoleSwitch = useCallback(async () => {
    if (!selectedRole || !currentUserRole?.userId) return;

    setIsSwitchingRole(true);
    setShowConfirmationModal(false);

    try {
      // Switch the user's active role
      const result = await RolePermissionService.switchUserRole(currentUserRole.userId, selectedRole);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to switch role');
      }

      // Refetch user role to update the context
      await refetchRole();

      // Get the default screen for the new role
      const defaultScreen = await getDefaultScreen();

      ValidationMonitor.recordPatternSuccess({
        service: 'RoleSelectionScreen' as const,
        pattern: 'role_switching' as const,
        operation: 'confirmRoleSwitch' as const
      });

      Alert.alert(
        'Role Switched',
        `You are now acting as ${roleConfigs[selectedRole].title}`,
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to the appropriate dashboard
              navigation.navigate(defaultScreen as never);
            }
          }
        ]
      );
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'RoleSelectionScreen.confirmRoleSwitch',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'ROLE_SWITCH_FAILED'
      });
      
      Alert.alert(
        'Switch Failed',
        error instanceof Error ? error.message : 'Unable to switch roles. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSwitchingRole(false);
      setSelectedRole(null);
    }
  }, [selectedRole, currentUserRole?.userId, refetchRole, getDefaultScreen, navigation, roleConfigs]);

  // Cancel role switch
  const cancelRoleSwitch = useCallback(() => {
    setShowConfirmationModal(false);
    setSelectedRole(null);
  }, []);

  // Navigate to dashboard
  const navigateToDashboard = useCallback(async () => {
    try {
      const defaultScreen = await getDefaultScreen();
      navigation.navigate(defaultScreen as never);
    } catch (error) {
      navigation.navigate('RoleDashboard' as never);
    }
  }, [getDefaultScreen, navigation]);

  // Load roles on mount and when user role changes
  useEffect(() => {
    if (currentUserRole?.userId) {
      loadAvailableRoles();
    }
  }, [loadAvailableRoles]);

  // Loading state
  if (isRoleLoading || isLoadingRoles) {
    return (
      <View style={styles.loadingContainer} testID={`${testID}-loading`}>
        <Loading size="large" />
        <Text style={styles.loadingText}>Loading available roles...</Text>
      </View>
    );
  }

  // Error state
  if (roleError || !currentUserRole?.userId) {
    return (
      <View style={styles.errorContainer} testID={`${testID}-error`}>
        <Text style={styles.errorTitle}>Unable to Load Roles</Text>
        <Text style={styles.errorMessage}>
          {roleError?.message || 'Please check your connection and try again'}
        </Text>
        <Button
          title="Retry"
          onPress={() => {
            refetchRole();
            loadAvailableRoles();
          }}
          style={styles.retryButton}
          testID={`${testID}-retry-button`}
        />
      </View>
    );
  }

  // No multiple roles available
  if (availableRoles.length <= 1) {
    return (
      <View style={styles.singleRoleContainer} testID={`${testID}-single-role`}>
        <Text style={styles.singleRoleTitle}>Single Role Account</Text>
        <Text style={styles.singleRoleMessage}>
          Your account has access to one role: {currentUserRole.role}
        </Text>
        <Button
          title="Go to Dashboard"
          onPress={navigateToDashboard}
          style={styles.dashboardButton}
          testID={`${testID}-dashboard-button`}
        />
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Your Role</Text>
          <Text style={styles.headerSubtitle}>
            Choose how you want to use MyFarmstand
          </Text>
          <Text style={styles.currentRoleText}>
            Currently: {roleConfigs[currentUserRole.role as UserRole]?.title}
          </Text>
        </View>

        {/* Role Options */}
        <View style={styles.rolesContainer}>
          {availableRoles.map((roleOption) => (
            <Card
              key={roleOption.role}
              style={[
                styles.roleCard,
                roleOption.isActive && styles.activeRoleCard,
                !roleOption.isAvailable && styles.unavailableRoleCard,
                isTablet && styles.roleCardTablet
              ]}
              onPress={() => roleOption.isAvailable && handleRoleSelection(roleOption.role)}
              disabled={!roleOption.isAvailable}
              testID={`${testID}-role-${roleOption.role}`}
            >
              <View style={styles.roleCardContent}>
                {/* Role Header */}
                <View style={[styles.roleHeader, { backgroundColor: roleOption.color }]}>
                  <Text style={styles.roleIcon}>{roleOption.icon}</Text>
                  <View style={styles.roleHeaderText}>
                    <Text style={styles.roleTitle}>{roleOption.title}</Text>
                    {roleOption.isActive && (
                      <Text style={styles.activeRoleBadge}>CURRENT</Text>
                    )}
                  </View>
                </View>

                {/* Role Description */}
                <View style={styles.roleBody}>
                  <Text style={styles.roleDescription}>{roleOption.description}</Text>
                  
                  {/* Permissions Preview */}
                  <View style={styles.permissionsSection}>
                    <Text style={styles.permissionsTitle}>Permissions:</Text>
                    <View style={styles.permissionsList}>
                      {roleOption.permissions.slice(0, 3).map((permission, index) => (
                        <Text key={permission} style={styles.permissionItem}>
                          • {permission}
                        </Text>
                      ))}
                      {roleOption.permissions.length > 3 && (
                        <Text style={styles.morePermissions}>
                          +{roleOption.permissions.length - 3} more
                        </Text>
                      )}
                    </View>
                  </View>

                  {!roleOption.isAvailable && (
                    <Text style={styles.unavailableText}>
                      This role is currently unavailable
                    </Text>
                  )}
                </View>

                {/* Selection Arrow */}
                {roleOption.isAvailable && (
                  <View style={styles.roleArrow}>
                    <Text style={styles.roleArrowText}>
                      {roleOption.isActive ? '✓' : '→'}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          ))}
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Button
            title="Go to Current Dashboard"
            onPress={navigateToDashboard}
            style={styles.dashboardButton}
            testID={`${testID}-current-dashboard-button`}
          />
        </View>
      </ScrollView>

      {/* Role Switch Confirmation Modal */}
      <Modal
        visible={showConfirmationModal}
        transparent
        animationType="fade"
        testID={`${testID}-confirmation-modal`}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Switch Role</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to switch to{' '}
              {selectedRole ? roleConfigs[selectedRole].title : ''}?
            </Text>
            <Text style={styles.modalWarning}>
              This will change your available features and permissions.
            </Text>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={cancelRoleSwitch}
                style={[styles.modalButton, styles.cancelButton]}
                testID={`${testID}-cancel-switch`}
              />
              <Button
                title="Switch"
                onPress={confirmRoleSwitch}
                style={[styles.modalButton, styles.confirmButton]}
                disabled={isSwitchingRole}
                loading={isSwitchingRole}
                testID={`${testID}-confirm-switch`}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
  },
  singleRoleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  singleRoleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  singleRoleMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  dashboardButton: {
    paddingHorizontal: 32,
    backgroundColor: '#4CAF50',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 24,
  },
  currentRoleText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  rolesContainer: {
    padding: 16,
    gap: 16,
  },
  roleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  roleCardTablet: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  activeRoleCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  unavailableRoleCard: {
    opacity: 0.6,
  },
  roleCardContent: {
    flexDirection: 'column',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  roleIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  roleHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  activeRoleBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBody: {
    padding: 16,
  },
  roleDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
  },
  permissionsSection: {
    marginBottom: 12,
  },
  permissionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  permissionsList: {
    gap: 4,
  },
  permissionItem: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  morePermissions: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 4,
  },
  unavailableText: {
    fontSize: 14,
    color: '#f44336',
    fontStyle: 'italic',
    marginTop: 8,
  },
  roleArrow: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleArrowText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    margin: 32,
    maxWidth: 400,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalWarning: {
    fontSize: 14,
    color: '#f57c00',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#757575',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
});