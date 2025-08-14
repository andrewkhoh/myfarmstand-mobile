import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Text, Card, Button, Input, Loading } from '../components';
import { useCurrentUser, useUpdateProfileMutation, useLogoutMutation, useChangePasswordMutation } from '../hooks/useAuth';
import { spacing, colors } from '../utils/theme';
import { User, RootTabParamList } from '../types';
import { Ionicons } from '@expo/vector-icons';

type ProfileNavigationProp = StackNavigationProp<RootTabParamList, 'Profile'>;

// Services moved to authService.ts - following atomic pattern

export const ProfileScreen: React.FC = () => {
  const { data: user, isLoading: userLoading, error: userError } = useCurrentUser();
  const updateProfileMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();
  const logoutMutation = useLogoutMutation();
  const navigation = useNavigation<ProfileNavigationProp>();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<{ [key: string]: string }>({});
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
  }, [user?.id]);



  // Profile update mutation is already declared above

  // Password change mutation now uses atomic hook from useAuth

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!formData.email.includes('@')) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.length < 10) {
      newErrors.phone = 'Phone number must be at least 10 digits';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = () => {
    if (!validateForm()) {
      return;
    }
    
    // Direct mutation call - React Query handles success/error states
    updateProfileMutation.mutate({
      userId: user?.id || '',
      updates: {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined
      }
    }, {
      onSuccess: () => {
        setIsEditing(false);
        setErrors({});
        Alert.alert('Success', 'Profile updated successfully');
      },
      onError: () => {
        Alert.alert('Error', 'Failed to update profile');
      }
    });
  };

  const handleChangePassword = () => {
    if (!validatePasswordForm()) {
      return;
    }
    
    // Direct mutation call - React Query handles success/error states
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    }, {
      onSuccess: () => {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors({});
        setShowPasswordSection(false);
        Alert.alert('Success', 'Password changed successfully');
      },
      onError: (error: any) => {
        Alert.alert('Error', error.message || 'Failed to change password');
      }
    });
  };

  const handleCancelEdit = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || ''
      });
    }
    setErrors({});
    setIsEditing(false);
  };

  const handleLogout = () => {
    // Web-compatible logout handling
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        performLogout();
      }
    } else {
      // Native Alert for mobile platforms
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign Out', 
            style: 'destructive', 
            onPress: () => performLogout()
          },
        ]
      );
    }
  };

  const performLogout = () => {
    // Direct mutation call - React Query handles success/error states
    logoutMutation.mutate(undefined, {
      onError: (error) => {
        console.error('Logout error:', error);
        if (Platform.OS === 'web') {
          window.alert('Failed to sign out. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to sign out. Please try again.');
        }
      }
    });
  };

  const formatOrderStatus = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'confirmed':
        return colors.info;
      case 'preparing':
        return colors.primary[500];
      case 'ready':
        return colors.success;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return colors.neutral[500];
    }
  };

  // Early return if user is null (prevents infinite render loop during logout)
  if (!user) {
    return (
      <Screen>
        <View style={styles.container}>
          <Loading />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <View style={styles.container}>
        {/* Profile Information Card */}
        <Card variant="elevated" style={styles.profileCard}>
          <View style={styles.cardHeader}>
            <Text variant="heading3">
              👤 Profile Information
            </Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil" size={24} color={colors.primary[500]} />
              </TouchableOpacity>
            )}
          </View>
          
          {isEditing ? (
            <View style={styles.editForm}>
              <Input
                label="Name"
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                error={errors.name}
                placeholder="Enter your full name"
              />
              
              <Input
                label="Email"
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                error={errors.email}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <Input
                label="Phone"
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                error={errors.phone}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
              
              <Input
                label="Address"
                value={formData.address}
                onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                error={errors.address}
                placeholder="Enter your address"
                multiline
                numberOfLines={2}
              />
              
              <View style={styles.editActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={handleCancelEdit}
                  style={styles.actionButton}
                />
                <Button
                  title="Save Changes"
                  onPress={handleSaveProfile}
                  loading={updateProfileMutation.isPending}
                  style={styles.actionButton}
                />
              </View>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <View style={styles.infoRow}>
                <Text variant="label">Name:</Text>
                <Text variant="body">{user?.name}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text variant="label">Email:</Text>
                <Text variant="body">{user?.email}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text variant="label">Phone:</Text>
                <Text variant="body">{user?.phone}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text variant="label">Address:</Text>
                <Text variant="body">{user?.address}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text variant="label">Role:</Text>
                <Text variant="body" style={styles.roleText}>
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Customer'}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Password Change Card */}
        <Card variant="outlined" style={styles.passwordCard}>
          <View style={styles.sectionHeader}>
            <Text variant="heading3" style={styles.sectionTitle}>
              🔒 Change Password
            </Text>
            <TouchableOpacity onPress={() => setShowPasswordSection(!showPasswordSection)}>
              <Ionicons 
                name={showPasswordSection ? "chevron-up" : "chevron-down"} 
                size={24} 
                color={colors.primary[500]} 
              />
            </TouchableOpacity>
          </View>
          
          {showPasswordSection && (
            <View style={styles.passwordForm}>
              <Input
                label="Current Password"
                value={passwordData.currentPassword}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
                error={passwordErrors.currentPassword}
                placeholder="Enter your current password"
                secureTextEntry
              />
              
              <Input
                label="New Password"
                value={passwordData.newPassword}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))}
                error={passwordErrors.newPassword}
                placeholder="Enter your new password"
                secureTextEntry
              />
              
              <Input
                label="Confirm New Password"
                value={passwordData.confirmPassword}
                onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirmPassword: text }))}
                error={passwordErrors.confirmPassword}
                placeholder="Confirm your new password"
                secureTextEntry
              />
              
              <Text variant="caption" color="secondary" style={styles.passwordHint}>
                Password must be at least 8 characters with uppercase, lowercase, and number
              </Text>
              
              <View style={styles.passwordActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setShowPasswordSection(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordErrors({});
                  }}
                  style={styles.actionButton}
                />
                <Button
                  title="Change Password"
                  onPress={handleChangePassword}
                  loading={changePasswordMutation.isPending}
                  style={styles.actionButton}
                />
              </View>
            </View>
          )}
        </Card>

        {/* My Orders Card */}
        <Card variant="outlined" style={styles.orderHistoryCard}>
          <Text variant="heading3" style={styles.sectionTitle}>
            📋 My Orders
          </Text>
          <Text variant="body" color="secondary" style={styles.orderDescription}>
            View and manage your order history, track pickup times, and reschedule when needed.
          </Text>
          
          <TouchableOpacity 
            style={styles.myOrdersButton}
            onPress={() => navigation.navigate('MyOrders' as any)}
          >
            <View style={styles.myOrdersButtonContent}>
              <Ionicons name="receipt-outline" size={24} color={colors.primary[500]} />
              <View style={styles.myOrdersButtonText}>
                <Text variant="body" weight="medium">
                  View My Orders
                </Text>
                <Text variant="caption" color="secondary">
                  Order history & rescheduling
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </View>
          </TouchableOpacity>
        </Card>

        {/* Account Actions Card */}
        <Card variant="outlined" style={styles.actionsCard}>
          <Text variant="heading3" style={styles.sectionTitle}>Account Actions</Text>
          
          <Button
            title="Sign Out"
            variant="secondary"
            onPress={handleLogout}
            style={styles.logoutButton}
          />
        </Card>
      </View>


    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  profileCard: {
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editForm: {
    gap: spacing.md,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  profileInfo: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  roleText: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  passwordCard: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  passwordForm: {
    gap: spacing.md,
  },
  passwordHint: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  passwordActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  orderHistoryCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  orderDescription: {
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  myOrdersButton: {
    marginTop: spacing.sm,
  },
  myOrdersButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  myOrdersButtonText: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  ordersList: {
    gap: spacing.sm,
  },
  orderCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    minHeight: 28,
  },
  orderTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 65,
    height: 22,
    alignSelf: 'center',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionsCard: {
    marginBottom: spacing.lg,
  },
  logoutButton: {
    marginTop: spacing.md,
  },
  orderTapHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  tapHintText: {
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  orderDetailCard: {
    marginBottom: spacing.lg,
  },
  orderDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    minHeight: 32,
  },
  modalTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text.inverse,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    lineHeight: 12,
    includeFontPadding: false,
  },
  orderDetailSection: {
    marginBottom: spacing.lg,
  },
  modalSectionTitle: {
    marginBottom: spacing.sm,
    fontSize: 16,
    fontWeight: '600',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  qrSection: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  qrInstructions: {
    textAlign: 'center',
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: spacing.lg,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notesText: {
    fontStyle: 'italic',
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
