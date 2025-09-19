/**
 * Role Administration Screen
 * Admin interface for managing user roles and permissions
 * Only accessible by admin users
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  FlatList,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Screen, Text, Button, Card } from '../../components';
import { UnifiedPermissionGate, AdminOnly } from '../../components/role-based/UnifiedPermissionGate';
import {
  useCurrentUserRole,
  useRoleOperations,
} from '../../hooks/role-based/useUnifiedRole';
import { useCurrentUser } from '../../hooks/useAuth';
import { UserRole, Permission, ROLE_HIERARCHY, ROLE_PERMISSIONS } from '../../types/roles';
import { spacing, colors } from '../../utils/theme';
import { supabase } from '../../config/supabase';

interface UserRoleData {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

interface RoleChangeRequest {
  userId: string;
  userName: string;
  currentRole: UserRole;
  requestedRole: UserRole;
}

export const RoleAdministrationScreen: React.FC = () => {
  const { data: currentUser } = useCurrentUser();
  const { isAdmin } = useCurrentUserRole();
  const { updateUserRole, isUpdatingRole } = useRoleOperations();

  const [users, setUsers] = useState<UserRoleData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserRoleData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<UserRole | 'all'>('all');
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRoleData | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole | null>(null);

  // Load users from database
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, created_at, last_login_at, is_active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userData: UserRoleData[] = data.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        isActive: user.is_active ?? true,
      }));

      setUsers(userData);
      setFilteredUsers(userData);
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert(
        'Loading Error',
        'Failed to load users. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Filter users based on search term and role
  useEffect(() => {
    let filtered = users;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(term) ||
        (user.name && user.name.toLowerCase().includes(term)) ||
        user.role.toLowerCase().includes(term)
      );
    }

    // Filter by role
    if (selectedRoleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRoleFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, selectedRoleFilter]);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Handle role change request
  const handleChangeRole = (user: UserRoleData) => {
    // Prevent self-role changes for additional safety
    if (user.id === currentUser?.id) {
      Alert.alert(
        'Cannot Change Own Role',
        'You cannot change your own role. Ask another administrator to change it.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedUser(user);
    setSelectedNewRole(null);
    setShowChangeRoleModal(true);
  };

  // Confirm role change
  const confirmRoleChange = async () => {
    if (!selectedUser || !selectedNewRole) return;

    try {
      await updateUserRole(selectedUser.id, selectedNewRole);

      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === selectedUser.id
            ? { ...user, role: selectedNewRole }
            : user
        )
      );

      setShowChangeRoleModal(false);
      setSelectedUser(null);
      setSelectedNewRole(null);

      Alert.alert(
        'Role Updated',
        `Successfully changed ${selectedUser.name || selectedUser.email}'s role to ${selectedNewRole}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Update Failed',
        error instanceof Error ? error.message : 'Failed to update user role',
        [{ text: 'OK' }]
      );
    }
  };

  // Get role display color
  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case UserRole.ADMIN:
        return colors.error;
      case UserRole.EXECUTIVE:
        return colors.warning;
      case UserRole.INVENTORY_STAFF:
      case UserRole.MARKETING_STAFF:
        return colors.info;
      case UserRole.CUSTOMER:
      default:
        return colors.text.tertiary;
    }
  };

  // Render user item
  const renderUserItem = ({ item: user }: { item: UserRoleData }) => (
    <Card style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {user.name || user.email}
          </Text>
          {user.name && (
            <Text style={styles.userEmail}>{user.email}</Text>
          )}
        </View>

        <View style={styles.roleSection}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
            <Text style={styles.roleBadgeText}>{user.role}</Text>
          </View>
          <Text style={styles.roleLevel}>
            Level {ROLE_HIERARCHY[user.role]}
          </Text>
        </View>
      </View>

      <View style={styles.userDetails}>
        <Text style={styles.detailText}>
          Created: {new Date(user.createdAt).toLocaleDateString()}
        </Text>
        {user.lastLoginAt && (
          <Text style={styles.detailText}>
            Last Login: {new Date(user.lastLoginAt).toLocaleDateString()}
          </Text>
        )}
        <Text style={[styles.detailText, user.isActive ? styles.activeText : styles.inactiveText]}>
          Status: {user.isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>

      <View style={styles.userActions}>
        <Button
          title="Change Role"
          onPress={() => handleChangeRole(user)}
          disabled={user.id === currentUser?.id || isUpdatingRole}
          style={styles.changeRoleButton}
        />

        <Text style={styles.permissionCount}>
          {ROLE_PERMISSIONS[user.role]?.length || 0} permissions
        </Text>
      </View>
    </Card>
  );

  return (
    <AdminOnly fallback={
      <View style={styles.unauthorizedContainer}>
        <Text style={styles.unauthorizedText}>
          Admin access required to view this page
        </Text>
      </View>
    }>
      <Screen>
        <ScrollView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>👥 Role Administration</Text>
            <Text style={styles.headerSubtitle}>
              Manage user roles and permissions
            </Text>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <Card style={styles.statCard}>
              <Text style={styles.statNumber}>{users.length}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </Card>

            <Card style={styles.statCard}>
              <Text style={styles.statNumber}>
                {users.filter(u => u.role === UserRole.ADMIN).length}
              </Text>
              <Text style={styles.statLabel}>Admins</Text>
            </Card>

            <Card style={styles.statCard}>
              <Text style={styles.statNumber}>
                {users.filter(u => u.role === UserRole.EXECUTIVE ||
                                    u.role === UserRole.INVENTORY_STAFF ||
                                    u.role === UserRole.MARKETING_STAFF).length}
              </Text>
              <Text style={styles.statLabel}>Staff</Text>
            </Card>

            <Card style={styles.statCard}>
              <Text style={styles.statNumber}>
                {users.filter(u => u.isActive).length}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </Card>
          </View>

          {/* Filters */}
          <Card style={styles.filtersContainer}>
            <Text style={styles.filtersTitle}>Filters</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Search users by name, email, or role..."
              value={searchTerm}
              onChangeText={setSearchTerm}
            />

            <View style={styles.roleFilters}>
              {(['all'] as const).concat(Object.values(UserRole)).map(role => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleFilterButton,
                    selectedRoleFilter === role && styles.activeRoleFilter
                  ]}
                  onPress={() => setSelectedRoleFilter(role)}
                >
                  <Text style={[
                    styles.roleFilterText,
                    selectedRoleFilter === role && styles.activeRoleFilterText
                  ]}>
                    {role === 'all' ? 'All Roles' : role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* User List */}
          <View style={styles.userListContainer}>
            <Text style={styles.userListTitle}>
              Users ({filteredUsers.length})
            </Text>

            {isLoadingUsers ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading users...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredUsers}
                renderItem={renderUserItem}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.userList}
              />
            )}
          </View>
        </ScrollView>

        {/* Role Change Modal */}
        <Modal
          visible={showChangeRoleModal}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Change User Role</Text>

              {selectedUser && (
                <>
                  <Text style={styles.modalUserInfo}>
                    User: {selectedUser.name || selectedUser.email}
                  </Text>
                  <Text style={styles.modalCurrentRole}>
                    Current Role: {selectedUser.role} (Level {ROLE_HIERARCHY[selectedUser.role]})
                  </Text>

                  <Text style={styles.selectRoleLabel}>Select New Role:</Text>
                  <View style={styles.roleOptions}>
                    {Object.values(UserRole).map(role => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleOption,
                          selectedNewRole === role && styles.selectedRoleOption,
                          role === selectedUser.role && styles.disabledRoleOption
                        ]}
                        onPress={() => setSelectedNewRole(role)}
                        disabled={role === selectedUser.role}
                      >
                        <Text style={[
                          styles.roleOptionText,
                          selectedNewRole === role && styles.selectedRoleOptionText,
                          role === selectedUser.role && styles.disabledRoleOptionText
                        ]}>
                          {role} (Level {ROLE_HIERARCHY[role]})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {selectedNewRole && (
                    <Text style={styles.permissionPreview}>
                      This role has {ROLE_PERMISSIONS[selectedNewRole]?.length || 0} permissions
                    </Text>
                  )}

                  <View style={styles.modalActions}>
                    <Button
                      title="Cancel"
                      onPress={() => setShowChangeRoleModal(false)}
                      style={[styles.modalButton, styles.cancelButton]}
                    />
                    <Button
                      title="Change Role"
                      onPress={confirmRoleChange}
                      disabled={!selectedNewRole || selectedNewRole === selectedUser.role || isUpdatingRole}
                      loading={isUpdatingRole}
                      style={[styles.modalButton, styles.confirmButton]}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </Screen>
    </AdminOnly>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.primary[600],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  filtersContainer: {
    margin: spacing.md,
    padding: spacing.md,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: 'white',
  },
  roleFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  roleFilterButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: 'white',
  },
  activeRoleFilter: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  roleFilterText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  activeRoleFilterText: {
    color: 'white',
  },
  userListContainer: {
    padding: spacing.md,
  },
  userListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text.secondary,
  },
  userList: {
    gap: spacing.sm,
  },
  userCard: {
    padding: spacing.md,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  userEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  roleSection: {
    alignItems: 'flex-end',
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  roleLevel: {
    fontSize: 10,
    color: colors.text.tertiary,
  },
  userDetails: {
    marginBottom: spacing.sm,
  },
  detailText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  activeText: {
    color: colors.success,
  },
  inactiveText: {
    color: colors.error,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changeRoleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  permissionCount: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  unauthorizedText: {
    fontSize: 18,
    color: colors.text.secondary,
    textAlign: 'center',
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
    padding: spacing.lg,
    margin: spacing.lg,
    maxWidth: 400,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalUserInfo: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  modalCurrentRole: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  selectRoleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  roleOptions: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  roleOption: {
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: 'white',
  },
  selectedRoleOption: {
    backgroundColor: colors.primary[100],
    borderColor: colors.primary[600],
  },
  disabledRoleOption: {
    backgroundColor: colors.background,
    opacity: 0.6,
  },
  roleOptionText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  selectedRoleOptionText: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  disabledRoleOptionText: {
    color: colors.text.tertiary,
  },
  permissionPreview: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: colors.text.tertiary,
  },
  confirmButton: {
    backgroundColor: colors.primary[600],
  },
});