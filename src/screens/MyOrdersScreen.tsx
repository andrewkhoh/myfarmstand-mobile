import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Text, Card, Button, Input } from '../components';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootStackParamList, Order } from '../types';
import { useCurrentUser } from '../hooks/useAuth';
import { useCustomerOrders } from '../hooks/useOrders';
import { usePickupRescheduling } from '../hooks/usePickupRescheduling';
import { RescheduleRequest } from '../services/pickupReschedulingService';
import { spacing, colors } from '../utils/theme';

type MyOrdersNavigationProp = StackNavigationProp<RootStackParamList, 'MyOrders'>;

// Utility functions
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString();
};

const formatTime = (timeString: string | undefined): string => {
  if (!timeString) return 'Not set';
  return timeString;
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return '#f59e0b';
    case 'confirmed': return '#3b82f6';
    case 'ready': return '#10b981';
    case 'picked_up': return '#6b7280';
    case 'cancelled': return '#ef4444';
    default: return '#6b7280';
  }
};

const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'pending': return 'time-outline';
    case 'confirmed': return 'checkmark-circle-outline';
    case 'ready': return 'bag-check-outline';
    case 'picked_up': return 'checkmark-done-outline';
    case 'cancelled': return 'close-circle-outline';
    default: return 'help-circle-outline';
  }
};

const canReschedule = (order: Order): boolean => {
  return order.status === 'pending' || order.status === 'confirmed';
};

export const MyOrdersScreen: React.FC = () => {
  const navigation = useNavigation<MyOrdersNavigationProp>();
  const { data: user } = useCurrentUser();
  
  // Use React Query hooks for data and mutations
  const { data: orders = [], isLoading, error, refetch } = useCustomerOrders();
  const { reschedulePickup, isRescheduling, rescheduleError } = usePickupRescheduling();
  
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newPickupDate, setNewPickupDate] = useState(new Date());
  const [newPickupTime, setNewPickupTime] = useState(new Date());
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    
    // Filter by status
    if (selectedStatusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatusFilter);
    }
    
    // Search by order ID, items, or customer info
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => {
        // Search in order ID
        if (order.id.toLowerCase().includes(query)) return true;
        
        // Search in order items
        if (order.items?.some(item => 
          item.productName?.toLowerCase().includes(query)
        )) return true;
        
        // Search in customer info (using available Order properties)
        if (order.customerId?.toLowerCase().includes(query)) return true;
        
        return false;
      });
    }
    
    // Sort by most recent first
    return filtered.sort((a: Order, b: Order) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders, selectedStatusFilter, searchQuery]);

  const onRefresh = async () => {
    await refetch();
  };

  const handleReschedulePress = (order: Order) => {
    if (!canReschedule(order)) {
      Alert.alert('Cannot Reschedule', 'This order cannot be rescheduled at this time.');
      return;
    }

    setSelectedOrder(order);
    
    // Set initial date/time from current pickup schedule
    if (order.pickupDate) {
      setNewPickupDate(new Date(order.pickupDate));
    }
    if (order.pickupTime) {
      const [hours, minutes] = order.pickupTime.split(':');
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours), parseInt(minutes));
      setNewPickupTime(timeDate);
    }
    
    setRescheduleReason('');
    setRescheduleModalVisible(true);
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedOrder || !user) return;

    const rescheduleRequest: RescheduleRequest = {
      orderId: selectedOrder.id,
      newPickupDate: newPickupDate.toISOString().split('T')[0],
      newPickupTime: `${newPickupTime.getHours().toString().padStart(2, '0')}:${newPickupTime.getMinutes().toString().padStart(2, '0')}`,
      reason: rescheduleReason.trim() || undefined,
      requestedBy: 'customer',
      requestedByUserId: user.id,
    };

    try {
      await reschedulePickup(rescheduleRequest);
      Alert.alert('Success', 'Your pickup has been rescheduled successfully!');
      setRescheduleModalVisible(false);
    } catch (error) {
      console.error('Error rescheduling pickup:', error);
      Alert.alert('Error', 'Failed to reschedule pickup. Please try again.');
    };
  };

  // Create order description helper
  const getOrderDescription = (order: Order): string => {
    if (!order.items || order.items.length === 0) {
      return 'No items in this order';
    }
    
    const items = order.items;
    
    if (items.length === 1) {
      const item = items[0];
      return `${item.quantity}x ${item.productName}`;
    }
    
    if (items.length <= 3) {
      return items.map(item => `${item.quantity}x ${item.productName}`).join(', ');
    }
    
    // For more than 3 items, show first 2 and count
    const firstTwo = items.slice(0, 2).map(item => `${item.quantity}x ${item.productName}`).join(', ');
    const remaining = items.length - 2;
    return `${firstTwo} and ${remaining} more item${remaining > 1 ? 's' : ''}`;
  };

  const renderStatusFilter = (status: string, label: string) => {
    const isSelected = selectedStatusFilter === status;
    return (
      <TouchableOpacity
        key={status}
        style={[
          styles.filterChip,
          isSelected && styles.filterChipSelected
        ]}
        onPress={() => setSelectedStatusFilter(status)}
      >
        <Text style={isSelected ? styles.filterChipTextSelected : styles.filterChipText}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderOrder = (order: Order) => {
    const itemCount = order.items?.length || 0;
    const itemSummary = itemCount > 0 
      ? `${itemCount} item${itemCount > 1 ? 's' : ''}`
      : 'No items';
    const orderDescription = getOrderDescription(order);

    return (
      <Card key={order.id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>Order #{order.id}</Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Ionicons 
              name={getStatusIcon(order.status) as any} 
              size={16} 
              color="white" 
              style={styles.statusIcon}
            />
            <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.orderDescriptionContainer}>
            <Text style={styles.itemSummary}>{itemSummary}</Text>
            <Text style={styles.orderDescription}>{orderDescription}</Text>
          </View>
          <Text style={styles.totalAmount}>${order.total?.toFixed(2) || '0.00'}</Text>
        </View>

        <View style={styles.pickupInfo}>
          <View style={styles.pickupRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.pickupText}>
              Pickup: {formatDate(order.pickupDate)} at {formatTime(order.pickupTime)}
            </Text>
          </View>
          {order.deliveryAddress && (
            <View style={styles.pickupRow}>
              <Ionicons name="location-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.pickupText}>{order.deliveryAddress}</Text>
            </View>
          )}
        </View>

        {canReschedule(order) && (
          <TouchableOpacity 
            style={styles.rescheduleButton}
            onPress={() => handleReschedulePress(order)}
          >
            <Ionicons name="time-outline" size={16} color={colors.primary['500']} />
            <Text style={styles.rescheduleButtonText}>Reschedule Pickup</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <Text>Loading your orders...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color={colors.text.secondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search orders by ID, items, or name..."
              placeholderTextColor={colors.text.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Status Filter Chips */}
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {renderStatusFilter('all', 'All')}
            {renderStatusFilter('pending', 'Pending')}
            {renderStatusFilter('confirmed', 'Confirmed')}
            {renderStatusFilter('ready', 'Ready')}
            {renderStatusFilter('picked_up', 'Completed')}
            {renderStatusFilter('cancelled', 'Cancelled')}
          </ScrollView>
        </View>
        
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        >
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={searchQuery || selectedStatusFilter !== 'all' ? "search-outline" : "bag-outline"} 
                size={64} 
                color={colors.text.secondary} 
              />
              <Text style={styles.emptyTitle}>
                {searchQuery || selectedStatusFilter !== 'all' ? 'No Matching Orders' : 'No Orders Yet'}
              </Text>
              <Text style={styles.emptyMessage}>
                {searchQuery || selectedStatusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'When you place orders, they\'ll appear here.'
                }
              </Text>
              {!searchQuery && selectedStatusFilter === 'all' && (
                <Button
                  title="Start Shopping"
                  onPress={() => navigation.navigate('Main')}
                  style={styles.shopButton}
                />
              )}
            </View>
          ) : (
            <View style={styles.ordersContainer}>
              <Text style={styles.sectionTitle}>
                {searchQuery || selectedStatusFilter !== 'all' 
                  ? `${filteredOrders.length} Order${filteredOrders.length !== 1 ? 's' : ''} Found`
                  : 'Your Orders'
                }
              </Text>
              {filteredOrders.map(renderOrder)}
            </View>
          )}
        </ScrollView>

        {/* Reschedule Modal */}
        <Modal
          visible={rescheduleModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setRescheduleModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Reschedule Pickup</Text>
              <TouchableOpacity 
                onPress={handleRescheduleSubmit}
                disabled={isRescheduling}
              >
                <Text style={isRescheduling ? styles.saveTextDisabled : styles.saveText}>
                  {isRescheduling ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedOrder && (
                <View style={styles.orderSummary}>
                  <Text style={styles.orderSummaryTitle}>
                    Order #{selectedOrder.id}
                  </Text>
                  <Text style={styles.orderSummaryDetails}>
                    Current pickup: {formatDate(selectedOrder.pickupDate)} at {formatTime(selectedOrder.pickupTime)}
                  </Text>
                </View>
              )}

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>New Pickup Date</Text>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.primary['500']} />
                  <Text style={styles.dateTimeText}>{formatDate(newPickupDate.toISOString())}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>New Pickup Time</Text>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color={colors.primary['500']} />
                  <Text style={styles.dateTimeText}>
                    {`${newPickupTime.getHours().toString().padStart(2, '0')}:${newPickupTime.getMinutes().toString().padStart(2, '0')}`}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Reason (Optional)</Text>
                <Input
                  value={rescheduleReason}
                  onChangeText={setRescheduleReason}
                  placeholder="Why are you rescheduling?"
                  multiline
                  style={styles.reasonInput}
                />
              </View>
            </ScrollView>

            {/* Date Picker */}
            {showDatePicker && (
              <DateTimePicker
                value={newPickupDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setNewPickupDate(selectedDate);
                  }
                }}
              />
            )}

            {/* Time Picker */}
            {showTimePicker && (
              <DateTimePicker
                value={newPickupTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) {
                    setNewPickupTime(selectedTime);
                  }
                }}
              />
            )}
          </View>
        </Modal>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral['100'],
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: spacing.xs,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  filterScrollContent: {
    paddingRight: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    backgroundColor: colors.neutral['100'],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral['200'],
  },
  filterChipSelected: {
    backgroundColor: colors.primary['500'],
    borderColor: colors.primary['500'],
  },
  filterChipText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  ordersContainer: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  orderCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  orderDate: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  orderDescriptionContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  orderDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  itemSummary: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'right',
  },
  pickupInfo: {
    marginBottom: spacing.sm,
  },
  pickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pickupText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  rescheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary['500'],
    marginTop: spacing.sm,
  },
  rescheduleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary['500'],
    marginLeft: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  shopButton: {
    minWidth: 150,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  cancelText: {
    fontSize: 16,
    color: colors.primary['500'],
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary['500'],
  },
  saveTextDisabled: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary['500'],
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  orderSummary: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  orderSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  orderSummaryDetails: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  dateTimeText: {
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  reasonInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
