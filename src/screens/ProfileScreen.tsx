import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity, Platform, Modal } from 'react-native';
import { Screen, Text, Card, Button, Input, Loading } from '../components';
import { useCurrentUser, useUpdateProfileMutation, useLogoutMutation } from '../hooks/useAuth';
import { getCustomerOrders } from '../services/orderService';
import { spacing, colors } from '../utils/theme';
import { Order, User } from '../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

// Mock user service for profile updates
const updateUserProfile = async (userId: string, updates: Partial<User>): Promise<{ success: boolean; user?: User; message?: string }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock validation
  if (!updates.name || updates.name.trim().length < 2) {
    throw new Error('Name must be at least 2 characters long');
  }
  
  if (!updates.email || !updates.email.includes('@')) {
    throw new Error('Please enter a valid email address');
  }
  
  // Mock successful update
  return {
    success: true,
    user: { ...updates } as User,
    message: 'Profile updated successfully'
  };
};

// Mock password change service
const changeUserPassword = async (userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  // Mock current password verification (in real app, this would be handled by backend)
  if (!currentPassword) {
    throw new Error('Current password is required');
  }
  
  // Mock password strength validation
  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters long');
  }
  
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
    throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
  }
  
  // Mock successful password change
  return {
    success: true,
    message: 'Password changed successfully'
  };
};

// Use real order service to get customer orders
const getUserOrderHistory = async (userEmail: string): Promise<Order[]> => {
  return await getCustomerOrders(userEmail);
};

export const ProfileScreen: React.FC = () => {
  const { data: user, isLoading: userLoading, error: userError } = useCurrentUser();
  const updateProfileMutation = useUpdateProfileMutation();
  const logoutMutation = useLogoutMutation();
  const queryClient = useQueryClient();
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

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

  // Fetch order history
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['userOrders', user?.id],
    queryFn: () => getUserOrderHistory(user?.email || ''),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Profile update mutation is already declared above

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => 
      changeUserPassword(user?.id || '', currentPassword, newPassword),
    onSuccess: (result) => {
      if (result.success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors({});
        setShowPasswordSection(false);
        Alert.alert('Success', result.message || 'Password changed successfully');
      }
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to change password');
    }
  });

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

  const handleSaveProfile = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      await updateProfileMutation.mutateAsync({
        userId: user?.id || '',
        updates: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          address: formData.address.trim() || undefined
        }
      });
      setIsEditing(false);
      setErrors({});
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) {
      return;
    }
    
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
    } catch (error) {
      // Error handled in onError callback
    }
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

  const performLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error('Logout error:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to sign out. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
    }
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

        {/* Order History Card */}
        <Card variant="outlined" style={styles.orderHistoryCard}>
          <Text variant="heading3" style={styles.sectionTitle}>
            📋 Order History
          </Text>
          
          {ordersLoading ? (
            <Loading message="Loading order history..." />
          ) : ordersError ? (
            <Text variant="body" color="error" align="center">
              Failed to load order history
            </Text>
          ) : !orders || orders.length === 0 ? (
            <Text variant="body" color="secondary" align="center">
              No orders found
            </Text>
          ) : (
            <View style={styles.ordersList}>
              {orders?.map((order) => (
                <TouchableOpacity 
                  key={order.id} 
                  onPress={() => {
                    setSelectedOrder(order);
                    setShowOrderModal(true);
                  }}
                >
                  <Card variant="outlined" style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <View style={styles.orderTitleContainer}>
                        <Text variant="body" weight="medium">
                          Order #{order.id}
                        </Text>
                      </View>
                      <View style={{...styles.statusBadge, backgroundColor: getStatusColor(order.status)}}>
                        <Text style={styles.statusText}>
                          {formatOrderStatus(order.status)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.orderDetails}>
                      <Text variant="caption" color="secondary">
                        {formatDate(order.createdAt)} • {order.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery'}
                      </Text>
                      <Text variant="body" weight="medium">
                        ${order.total.toFixed(2)}
                      </Text>
                    </View>
                    
                    <Text variant="caption" color="secondary">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}: {order.items.map(item => item.productName).join(', ')}
                    </Text>
                    
                    <View style={styles.orderTapHint}>
                      <Text variant="caption" color="secondary" style={styles.tapHintText}>
                        Tap to view details {order.fulfillmentType === 'pickup' ? '& QR code' : ''}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
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

      {/* Order Details Modal */}
      <Modal
        visible={showOrderModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="heading2">Order Details</Text>
            <TouchableOpacity onPress={() => setShowOrderModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedOrder && (
              <>
                <Card variant="outlined" style={styles.orderDetailCard}>
                  <View style={styles.orderDetailHeader}>
                    <View style={styles.modalTitleContainer}>
                      <Text variant="heading3">Order #{selectedOrder.id}</Text>
                    </View>
                    <View style={{...styles.statusBadge, backgroundColor: getStatusColor(selectedOrder.status)}}>
                      <Text style={styles.statusText}>{formatOrderStatus(selectedOrder.status)}</Text>
                    </View>
                  </View>

                  <View style={styles.orderDetailSection}>
                    <Text variant="body" weight="medium" style={styles.modalSectionTitle}>Order Information</Text>
                    <Text variant="body">Date: {formatDate(selectedOrder.createdAt)}</Text>
                    <Text variant="body">Type: {selectedOrder.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery'}</Text>
                    {selectedOrder.pickupDate && (
                      <Text variant="body">Pickup Date: {selectedOrder.pickupDate}</Text>
                    )}
                    {selectedOrder.pickupTime && (
                      <Text variant="body">Pickup Time: {selectedOrder.pickupTime}</Text>
                    )}
                    {selectedOrder.deliveryAddress && (
                      <Text variant="body">Delivery Address: {selectedOrder.deliveryAddress}</Text>
                    )}
                  </View>

                  <View style={styles.orderDetailSection}>
                    <Text variant="body" weight="medium" style={styles.modalSectionTitle}>Items Ordered</Text>
                    {selectedOrder.items.map((item, index) => (
                      <View key={index} style={styles.orderItem}>
                        <Text variant="body">{item.productName}</Text>
                        <Text variant="body">Qty: {item.quantity} × ${item.price.toFixed(2)} = ${item.subtotal.toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Order Notes Section */}
                  {selectedOrder.notes && (
                    <View style={styles.orderDetailSection}>
                      <Text variant="body" weight="medium" style={styles.modalSectionTitle}>Order Notes</Text>
                      <Text variant="body" style={styles.notesText}>{selectedOrder.notes}</Text>
                    </View>
                  )}

                  <View style={styles.orderDetailSection}>
                    <Text variant="body" weight="medium" style={styles.modalSectionTitle}>Order Summary</Text>
                    <View style={styles.summaryRow}>
                      <Text variant="body">Subtotal:</Text>
                      <Text variant="body">${selectedOrder.subtotal.toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text variant="body">Tax:</Text>
                      <Text variant="body">${selectedOrder.tax.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.summaryRow, styles.totalRow]}>
                      <Text variant="body" weight="bold">Total:</Text>
                      <Text variant="body" weight="bold">${selectedOrder.total.toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* QR Code for Pickup Orders */}
                  {selectedOrder.fulfillmentType === 'pickup' && (
                    <View style={styles.qrSection}>
                      <Text variant="body" weight="medium" style={styles.modalSectionTitle}>Pickup QR Code</Text>
                      <Text variant="caption" color="secondary" style={styles.qrInstructions}>
                        Show this QR code to staff at pickup
                      </Text>
                      
                      <View style={styles.qrContainer}>
                        <QRCode
                          value={JSON.stringify({
                            orderId: selectedOrder.id,
                            customerName: selectedOrder.customerInfo.name,
                            customerEmail: selectedOrder.customerInfo.email,
                            customerPhone: selectedOrder.customerInfo.phone,
                            pickupDate: selectedOrder.pickupDate,
                            pickupTime: selectedOrder.pickupTime,
                            total: selectedOrder.total,
                            status: selectedOrder.status,
                            timestamp: new Date().toISOString()
                          })}
                          size={200}
                          color="black"
                          backgroundColor="white"
                        />
                      </View>
                    </View>
                  )}
                </Card>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
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
