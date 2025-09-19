/**
 * Permission Management Screen
 * Admin interface for managing user roles and permissions
 * Following docs/architectural-patterns-and-best-practices.md
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
  TextInput,
  Platform,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Text, Card, Loading } from '../../components';
import { useUserRole } from '../../hooks/role-based/useUserRole';
import { RolePermissionService } from '../../services/role-based/rolePermissionService';
import { ValidationMonitor } from '../../utils/validationMonitor';
import { UserRole } from '../../types';

interface UserRoleData {
  userId: string;
  email?: string;
  name?: string;
  roles: Array<{
    role: UserRole;
    isActive: boolean;
    assignedAt: string;
    permissions: string[];
  }>;
  lastActivity?: string;
}

interface RolePermissionData {
  role: UserRole;
  permissions: Array<{
    name: string;
    description: string;
    category: string;
    isEnabled: boolean;
  }>;
}

interface PermissionManagementScreenProps {
  testID?: string;
}

export const PermissionManagementScreen: React.FC<PermissionManagementScreenProps> = ({
  testID = 'permission-management-screen'
}) => {
  const navigation = useNavigation();
  
  // Authentication check
  const { 
    data: currentUser, 
    isLoading: isUserLoading, 
    error: userError 
  } = useUserRole();

  // Component state
  const [users, setUsers] = useState<UserRoleData[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedView, setSelectedView] = useState<'users' | 'permissions'>('users');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [permissionChanges, setPermissionChanges] = useState<Record<string, Record<UserRole, boolean>>>({});

  // Role configurations for UI display
  const roleConfigs = useMemo(() => ({
    customer: { title: 'Customer', color: '#4CAF50', icon: '🛍️' },
    farmer: { title: 'Farmer', color: '#8BC34A', icon: '🌾' },
    vendor: { title: 'Vendor', color: '#FF9800', icon: '🏪' },
    admin: { title: 'Administrator', color: '#2196F3', icon: '⚙️' },
    staff: { title: 'Staff Member', color: '#9C27B0', icon: '👨‍💼' },
  }), []);

  // Permission categories
  const permissionCategories = useMemo(() => [
    'view', 'create', 'update', 'delete', 'manage', 'admin'
  ], []);

  // Check admin permission
  const isAdmin = useMemo(() => {
    return currentUser?.role === 'admin';
  }, [currentUser?.role]);

  // Filtered users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    return users.filter(user => 
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.roles.some(role => role.role.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [users, searchQuery]);

  // Load all users with their roles and permissions
  const loadUsers = useCallback(async () => {
    if (!currentUser?.userId || !isAdmin) return;

    setIsLoadingUsers(true);
    
    try {
      const usersResult = await RolePermissionService.getAllUsersWithRoles();
      
      if (!usersResult.success || !usersResult.data) {
        throw new Error(usersResult.message || 'Failed to load users');
      }

      // Transform and enrich user data
      const enrichedUsers = await Promise.all(
        usersResult.data.map(async (userData) => {
          const userRoles = await Promise.all(
            userData.roles.map(async (roleData) => {
              try {
                const permissionsResult = await RolePermissionService.getRolePermissions(roleData.role_type as UserRole);
                const permissions = permissionsResult.success ? 
                  permissionsResult?.data?.map(p => p.permission_name) || [] : [];
                
                return {
                  role: roleData.role_type as UserRole,
                  isActive: roleData.is_active,
                  assignedAt: roleData.assigned_at,
                  permissions,
                };
              } catch (error) {
                return {
                  role: roleData.role_type as UserRole,
                  isActive: roleData.is_active,
                  assignedAt: roleData.assigned_at,
                  permissions: [],
                };
              }
            })
          );

          return {
            userId: userData.user_id,
            email: userData.email,
            name: userData.name,
            roles: userRoles,
            lastActivity: userData.last_activity,
          };
        })
      );

      setUsers(enrichedUsers);

      ValidationMonitor.recordPatternSuccess({
        service: 'PermissionManagementScreen' as const,
        pattern: 'data_loading' as const,
        operation: 'loadUsers' as const
      });
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'PermissionManagementScreen.loadUsers',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'USERS_LOAD_FAILED'
      });
      
      Alert.alert(
        'Loading Error',
        'Failed to load user data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentUser?.userId, isAdmin]);

  // Load role permissions configuration
  const loadRolePermissions = useCallback(async () => {
    if (!isAdmin) return;

    setIsLoadingPermissions(true);
    
    try {
      const allRoles: UserRole[] = ['customer', 'farmer', 'vendor', 'admin', 'staff'];
      
      const rolesWithPermissions = await Promise.all(
        allRoles.map(async (role: any) => {
          const permissionsResult = await RolePermissionService.getRolePermissions(role);
          
          const permissions = permissionsResult.success && permissionsResult.data ? 
            permissionsResult.data.map(p => ({
              name: p.permission_name,
              description: p.description || p.permission_name,
              category: p.permission_name.split(':')[0] || 'general',
              isEnabled: true,
            })) : [];

          return {
            role,
            permissions,
          };
        })
      );

      setRolePermissions(rolesWithPermissions);

      ValidationMonitor.recordPatternSuccess({
        service: 'PermissionManagementScreen' as const,
        pattern: 'data_loading' as const,
        operation: 'loadRolePermissions' as const
      });
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'PermissionManagementScreen.loadRolePermissions',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'ROLE_PERMISSIONS_LOAD_FAILED'
      });
    } finally {
      setIsLoadingPermissions(false);
    }
  }, [isAdmin]);

  // Handle user role assignment/removal
  const handleUserRoleToggle = useCallback(async (userId: string, role: UserRole, shouldAssign: boolean) => {
    if (!isAdmin) return;

    try {
      const result = shouldAssign 
        ? await RolePermissionService.assignUserRole(userId, role)
        : await RolePermissionService.removeUserRole(userId, role);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update user role');
      }

      // Refresh user data
      await loadUsers();

      ValidationMonitor.recordPatternSuccess({
        service: 'PermissionManagementScreen' as const,
        pattern: 'role_management' as const,
        operation: shouldAssign ? 'assignRole' as const : 'removeRole' as const
      });

      Alert.alert(
        'Success',
        `User role ${shouldAssign ? 'assigned' : 'removed'} successfully`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'PermissionManagementScreen.handleUserRoleToggle',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'USER_ROLE_TOGGLE_FAILED'
      });
      
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update user role',
        [{ text: 'OK' }]
      );
    }
  }, [isAdmin, loadUsers]);

  // Handle bulk role operations
  const handleBulkRoleAssignment = useCallback(async (userIds: string[], role: UserRole, shouldAssign: boolean) => {
    if (!isAdmin || userIds.length === 0) return;

    setIsSaving(true);
    
    try {
      const results = await Promise.all(
        userIds.map(userId => 
          shouldAssign 
            ? RolePermissionService.assignUserRole(userId, role)
            : RolePermissionService.removeUserRole(userId, role)
        )
      );

      const failed = results.filter(r => !r.success);
      
      if (failed.length > 0) {
        throw new Error(`Failed to update ${failed.length} of ${userIds.length} users`);
      }

      // Refresh user data
      await loadUsers();

      ValidationMonitor.recordPatternSuccess({
        service: 'PermissionManagementScreen' as const,
        pattern: 'bulk_operations' as const,
        operation: 'bulkRoleAssignment' as const
      });

      Alert.alert(
        'Bulk Update Complete',
        `Successfully updated ${userIds.length} users`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      ValidationMonitor.recordValidationError({
        context: 'PermissionManagementScreen.handleBulkRoleAssignment',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'BULK_ROLE_ASSIGNMENT_FAILED'
      });
      
      Alert.alert(
        'Bulk Update Failed',
        error instanceof Error ? error.message : 'Some updates may have failed',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  }, [isAdmin, loadUsers]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      await Promise.all([
        loadUsers(),
        loadRolePermissions()
      ]);
    } catch (error) {
      // Errors are handled by individual functions
    } finally {
      setIsRefreshing(false);
    }
  }, [loadUsers, loadRolePermissions]);

  // Load data on mount and focus
  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadRolePermissions();
    }
  }, [isAdmin, loadUsers, loadRolePermissions]);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) {
        ValidationMonitor.recordPatternSuccess({
          service: 'PermissionManagementScreen' as const,
          pattern: 'screen_focus' as const,
          operation: 'permissionManagementView' as const
        });
      }
    }, [isAdmin])
  );

  // Loading state
  if (isUserLoading) {
    return (
      <View style={styles.loadingContainer} testID={`${testID}-loading`}>
        <Loading size="large" />
        <Text style={styles.loadingText}>Loading permission management...</Text>
      </View>
    );
  }

  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <View style={styles.accessDeniedContainer} testID={`${testID}-access-denied`}>
        <Text style={styles.accessDeniedTitle}>Access Denied</Text>
        <Text style={styles.accessDeniedMessage}>
          You need administrator privileges to access permission management.
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={styles.goBackButton}
          testID={`${testID}-go-back-button`}
        />
      </View>
    );
  }

  // Error state
  if (userError) {
    return (
      <View style={styles.errorContainer} testID={`${testID}-error`}>
        <Text style={styles.errorTitle}>Permission Management Error</Text>
        <Text style={styles.errorMessage}>
          {userError.message || 'Unable to load permission management'}
        </Text>
        <Button
          title="Retry"
          onPress={handleRefresh}
          style={styles.retryButton}
          testID={`${testID}-retry-button`}
        />
      </View>
    );
  }

  // Render user item
  const renderUserItem = ({ item: user }: { item: UserRoleData }) => (
    <Card
      style={styles.userCard}
      onPress={() => setSelectedUser(selectedUser === user.userId ? null : user.userId)}
      testID={`${testID}-user-${user.userId}`}
    >
      <View style={styles.userCardContent}>
        {/* User Header */}
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name || user.email || user.userId}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.lastActivity && (
              <Text style={styles.lastActivity}>
                Last active: {new Date(user.lastActivity).toLocaleDateString()}
              </Text>
            )}
          </View>
          <Text style={styles.expandIcon}>
            {selectedUser === user.userId ? '▼' : '▶'}
          </Text>
        </View>

        {/* User Roles */}
        <View style={styles.userRoles}>
          {user.roles.map((roleData) => {
            const config = roleConfigs[roleData.role];
            return (
              <View
                key={roleData.role}
                style={[
                  styles.roleTag,
                  { backgroundColor: config.color },
                  !roleData.isActive && styles.inactiveRoleTag
                ]}
                testID={`${testID}-user-role-${user.userId}-${roleData.role}`}
              >
                <Text style={styles.roleTagText}>
                  {config.icon} {config.title}
                </Text>
                {!roleData.isActive && <Text style={styles.inactiveText}>(Inactive)</Text>}
              </View>
            );
          })}
        </View>

        {/* Expanded Role Management */}
        {selectedUser === user.userId && (
          <View style={styles.roleManagement}>
            <Text style={styles.roleManagementTitle}>Manage Roles:</Text>
            {Object.entries(roleConfigs).map(([role, config]) => {
              const hasRole = user.roles.some(r => r.role === role && r.isActive);
              return (
                <View key={role} style={styles.roleManagementItem}>
                  <Text style={styles.roleManagementLabel}>
                    {config.icon} {config.title}
                  </Text>
                  <Button
                    title={hasRole ? 'Remove' : 'Assign'}
                    onPress={() => handleUserRoleToggle(user.userId, role as UserRole, !hasRole)}
                    style={[
                      styles.roleActionButton,
                      hasRole ? styles.removeRoleButton : styles.assignRoleButton
                    ]}
                    disabled={isSaving}
                    testID={`${testID}-role-action-${user.userId}-${role}`}
                  />
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Card>
  );

  // Render permission role item
  const renderRolePermissionItem = ({ item: roleData }: { item: RolePermissionData }) => {
    const config = roleConfigs[roleData.role];
    
    return (
      <Card style={styles.permissionRoleCard} testID={`${testID}-role-permissions-${roleData.role}`}>
        <View style={[styles.permissionRoleHeader, { backgroundColor: config.color }]}>
          <Text style={styles.permissionRoleTitle}>
            {config.icon} {config.title}
          </Text>
          <Text style={styles.permissionCount}>
            {roleData.permissions.length} permissions
          </Text>
        </View>

        <View style={styles.permissionGrid}>
          {permissionCategories.map((category: any) => {
            const categoryPermissions = roleData.permissions.filter(p => p.category === category);
            if (categoryPermissions.length === 0) return null;

            return (
              <View key={category} style={styles.permissionCategory}>
                <Text style={styles.permissionCategoryTitle}>{category.toUpperCase()}</Text>
                {categoryPermissions.map((permission: any) => (
                  <View key={permission.name} style={styles.permissionItem}>
                    <Text style={styles.permissionName}>{permission.name}</Text>
                    <Text style={styles.permissionDescription}>{permission.description}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Permission Management</Text>
        <Text style={styles.headerSubtitle}>Manage user roles and permissions</Text>

        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <Button
            title="Users"
            onPress={() => setSelectedView('users')}
            style={[
              styles.viewToggleButton,
              selectedView === 'users' && styles.activeViewToggleButton
            ]}
            testID={`${testID}-view-users`}
          />
          <Button
            title="Permissions"
            onPress={() => setSelectedView('permissions')}
            style={[
              styles.viewToggleButton,
              selectedView === 'permissions' && styles.activeViewToggleButton
            ]}
            testID={`${testID}-view-permissions`}
          />
        </View>
      </View>

      {/* Search Bar (Users view only) */}
      {selectedView === 'users' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by email, name, or role..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID={`${testID}-search-input`}
          />
        </View>
      )}

      {/* Content */}
      {selectedView === 'users' ? (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item: any) => item.userId}
          style={styles.usersList}
          contentContainerStyle={styles.usersListContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              testID={`${testID}-refresh-control`}
            />
          }
          ListEmptyComponent={
            isLoadingUsers ? (
              <View style={styles.emptyContainer}>
                <Loading />
                <Text style={styles.emptyText}>Loading users...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer} testID={`${testID}-empty-users`}>
                <Text style={styles.emptyTitle}>No Users Found</Text>
                <Text style={styles.emptyText}>
                  {searchQuery.trim() 
                    ? 'No users match your search criteria' 
                    : 'No users available'}
                </Text>
              </View>
            )
          }
          testID={`${testID}-users-list`}
        />
      ) : (
        <FlatList
          data={rolePermissions}
          renderItem={renderRolePermissionItem}
          keyExtractor={(item: any) => item.role}
          style={styles.permissionsList}
          contentContainerStyle={styles.permissionsListContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              testID={`${testID}-permissions-refresh-control`}
            />
          }
          ListEmptyComponent={
            isLoadingPermissions ? (
              <View style={styles.emptyContainer}>
                <Loading />
                <Text style={styles.emptyText}>Loading permissions...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer} testID={`${testID}-empty-permissions`}>
                <Text style={styles.emptyTitle}>No Permissions Found</Text>
                <Text style={styles.emptyText}>Permission configuration not available</Text>
              </View>
            )
          }
          testID={`${testID}-permissions-list`}
        />
      )}
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
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 16,
    textAlign: 'center',
  },
  accessDeniedMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  goBackButton: {
    paddingHorizontal: 32,
    backgroundColor: '#757575',
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
    color: '#f44336',
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
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  activeViewToggleButton: {
    backgroundColor: '#2196F3',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  usersList: {
    flex: 1,
  },
  usersListContent: {
    padding: 16,
  },
  userCard: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  userCardContent: {
    padding: 16,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  lastActivity: {
    fontSize: 12,
    color: '#999',
  },
  expandIcon: {
    fontSize: 16,
    color: '#666',
  },
  userRoles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inactiveRoleTag: {
    opacity: 0.6,
  },
  roleTagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inactiveText: {
    color: 'white',
    fontSize: 10,
    fontStyle: 'italic',
  },
  roleManagement: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  roleManagementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  roleManagementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleManagementLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  roleActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 80,
  },
  assignRoleButton: {
    backgroundColor: '#4CAF50',
  },
  removeRoleButton: {
    backgroundColor: '#f44336',
  },
  permissionsList: {
    flex: 1,
  },
  permissionsListContent: {
    padding: 16,
  },
  permissionRoleCard: {
    marginBottom: 16,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  permissionRoleHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permissionRoleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  permissionCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  permissionGrid: {
    padding: 16,
  },
  permissionCategory: {
    marginBottom: 16,
  },
  permissionCategoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  permissionItem: {
    paddingVertical: 4,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#e0e0e0',
    marginBottom: 4,
  },
  permissionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  permissionDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});