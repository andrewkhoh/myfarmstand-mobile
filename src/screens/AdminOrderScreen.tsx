import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order, OrderStatus, FulfillmentType } from '../types';
import { useOrders, useOrderOperations } from '../hooks/useOrders';

interface OrderFilters {
  status?: string;
  fulfillmentType?: string;
  search?: string;
}

const AdminOrderScreen: React.FC = () => {
  const [filters, setFilters] = useState<OrderFilters>({});
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // React Query hooks
  const { data: orders = [], isLoading, error, refetch } = useOrders(filters);
  const { data: allOrders = [] } = useOrders({}); // Get unfiltered orders for tab counts

  const { updateOrderStatus, bulkUpdateOrderStatus, isLoading: isUpdating } = useOrderOperations();

  // Mock data functionality removed - now using real Supabase data

  // Memoized filtered and sorted orders
  const displayOrders = useMemo(() => {
    return orders || [];
  }, [orders]);

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.success) {
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } else {
      Alert.alert('Error', result.message || 'Failed to update order status');
    }
  };

  const handleBulkStatusUpdate = async (newStatus: OrderStatus) => {
    if (selectedOrders.length === 0) {
      Alert.alert('No Orders Selected', 'Please select orders to update');
      return;
    }

    Alert.alert(
      'Confirm Bulk Update',
      `Update ${selectedOrders.length} orders to ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            const result = await bulkUpdateOrderStatus(selectedOrders, newStatus);
            if (result.success) {
              setSelectedOrders([]);
              Alert.alert('Success', `Updated ${selectedOrders.length} orders to ${newStatus}`);
            } else {
              Alert.alert('Error', result.message || 'Failed to update orders');
            }
          },
        },
      ]
    );
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const clearFilters = () => {
    setFilters({});
    setSelectedOrders([]);
  };

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#3b82f6';
      case 'preparing': return '#8b5cf6';
      case 'ready': return '#10b981';
      case 'completed': return '#059669';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOrderItem = ({ item: order }: { item: Order }) => {
    const isSelected = selectedOrders.includes(order.id);

    return (
      <TouchableOpacity
        style={[styles.orderCard, isSelected && styles.selectedOrderCard]}
        onPress={() => toggleOrderSelection(order.id)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>{order.id}</Text>
            <Text style={styles.customerName}>{order.customerInfo.name}</Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={styles.orderMeta}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.orderTotal}>{formatCurrency(order.total)}</Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.fulfillmentInfo}>
            <Ionicons
              name={order.fulfillmentType === 'pickup' ? 'car-outline' : 'home-outline'}
              size={16}
              color="#6b7280"
            />
            <Text style={styles.fulfillmentText}>
              {order.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery'}
            </Text>
            {Boolean(order.pickupDate) && (
              <Text style={styles.fulfillmentDetails}>
                {order.pickupDate} at {order.pickupTime}
              </Text>
            )}
          </View>

          <View style={styles.itemsInfo}>
            <Text style={styles.itemsCount}>
              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.itemsList}>
              {order.items.map(item => `${item.quantity}x ${item.productName}`).join(', ')}
            </Text>
          </View>
        </View>

        <View style={styles.orderActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={() => handleStatusUpdate(order.id, 'confirmed')}
            disabled={isUpdating}
          >
            <Text style={styles.actionButtonText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.readyButton]}
            onPress={() => handleStatusUpdate(order.id, 'ready')}
            disabled={isUpdating}
          >
            <Text style={styles.actionButtonText}>Ready</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => handleStatusUpdate(order.id, 'completed')}
            disabled={isUpdating}
          >
            <Text style={styles.actionButtonText}>Complete</Text>
          </TouchableOpacity>
        </View>

        {Boolean(isSelected) && (
          <View style={styles.selectionIndicator}>
            <Ionicons name="checkmark-circle" size={26} color="#059669" />
          </View>
        )}
      </TouchableOpacity>
    );
  };



  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search orders, customers..."
          value={filters.search || ''}
          onChangeText={(text) => setFilters(prev => ({ ...prev, search: text }))}
        />
        
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.filterButtons}>
            {['pending', 'confirmed', 'preparing', 'ready', 'completed'].map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  filters.status === status && styles.activeFilterButton
                ]}
                onPress={() => setFilters(prev => ({
                  ...prev,
                  status: prev.status === status ? undefined : status
                }))}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.status === status && styles.activeFilterButtonText
                ]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Type:</Text>
          <View style={styles.filterButtons}>
            {['pickup', 'delivery'].map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterButton,
                  filters.fulfillmentType === type && styles.activeFilterButton
                ]}
                onPress={() => setFilters(prev => ({
                  ...prev,
                  fulfillmentType: prev.fulfillmentType === type ? undefined : type
                }))}
              >
                <Text style={[
                  styles.filterButtonText,
                  filters.fulfillmentType === type && styles.activeFilterButtonText
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
          <Text style={styles.clearFiltersText}>Clear Filters</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading orders: {error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>


      <View style={styles.header}>
        <Text style={styles.title}>Order Management</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="filter-outline" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabFiltersContainer}>
        <TouchableOpacity 
          style={[
            styles.tabFilter, 
            !filters.status && styles.tabFilterActive
          ]}
          onPress={() => setFilters({})}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            <Text style={[styles.tabFilterText, !filters.status && styles.tabFilterActiveText]}>All</Text>
            {Boolean(allOrders.length > 0) && (
              <View style={[styles.tabBadgeInline, !filters.status && styles.tabBadgeActive]}>
                <Text style={styles.tabBadgeText}>{allOrders.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tabFilter, 
            filters.status === 'pending' && styles.tabFilterActive
          ]}
          onPress={() => setFilters(prev => prev.status === 'pending' ? {} : { status: 'pending' })}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            <Text style={[styles.tabFilterText, filters.status === 'pending' && styles.tabFilterActiveText]}>Pending</Text>
            {Boolean(allOrders.filter((order: Order) => order.status === 'pending').length > 0) && (
              <View style={[styles.tabBadgeInline, styles.tabBadgePending, filters.status === 'pending' && styles.tabBadgeActive]}>
                <Text style={styles.tabBadgeText}>{allOrders.filter((order: Order) => order.status === 'pending').length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tabFilter, 
            filters.status === 'confirmed' && styles.tabFilterActive
          ]}
          onPress={() => setFilters(prev => prev.status === 'confirmed' ? {} : { status: 'confirmed' })}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            <Text style={[styles.tabFilterText, filters.status === 'confirmed' && styles.tabFilterActiveText]}>Confirmed</Text>
            {Boolean(allOrders.filter((order: Order) => order.status === 'confirmed').length > 0) && (
              <View style={[styles.tabBadgeInline, styles.tabBadgeConfirmed, filters.status === 'confirmed' && styles.tabBadgeActive]}>
                <Text style={styles.tabBadgeText}>{allOrders.filter((order: Order) => order.status === 'confirmed').length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tabFilter, 
            filters.status === 'ready' && styles.tabFilterActive
          ]}
          onPress={() => setFilters(prev => prev.status === 'ready' ? {} : { status: 'ready' })}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            <Text style={[styles.tabFilterText, filters.status === 'ready' && styles.tabFilterActiveText]}>Ready</Text>
            {Boolean(allOrders.filter((order: Order) => order.status === 'ready').length > 0) && (
              <View style={[styles.tabBadgeInline, styles.tabBadgeReady, filters.status === 'ready' && styles.tabBadgeActive]}>
                <Text style={styles.tabBadgeText}>{allOrders.filter((order: Order) => order.status === 'ready').length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {renderFilters()}

      {Boolean(selectedOrders.length > 0) && (
        <View style={styles.bulkActions}>
          <Text style={styles.bulkActionsText}>
            {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
          </Text>
          <View style={styles.bulkActionButtons}>
            <TouchableOpacity
              style={[styles.bulkActionButton, styles.confirmButton]}
              onPress={() => handleBulkStatusUpdate('confirmed')}
              disabled={isUpdating}
            >
              <Text style={styles.bulkActionButtonText}>Confirm All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, styles.readyButton]}
              onPress={() => handleBulkStatusUpdate('ready')}
              disabled={isUpdating}
            >
              <Text style={styles.bulkActionButtonText}>Ready All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={displayOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={['#3b82f6']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No orders found</Text>
            <Text style={styles.emptySubtext}>
              {Object.keys(filters).length > 0
                ? 'Try adjusting your filters'
                : 'Orders will appear here when customers place them'
              }
            </Text>
          </View>
        }
      />

      {Boolean(isUpdating) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Updating orders...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  statsCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterToggle: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  quickFiltersContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    height: 70,
  },
  quickFilters: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 15,
    gap: 8,
    flexWrap: 'nowrap',
    alignItems: 'center',
    minHeight: 55,
  },
  quickFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
    minWidth: 95,
    minHeight: 36,
    justifyContent: 'center',
  },
  quickFilterActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  quickFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4b5563',
  },
  quickFilterActiveText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  quickFilterPending: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
  },
  quickFilterConfirmed: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  quickFilterReady: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  quickFilterCompleted: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  filterBadgePending: {
    backgroundColor: '#f59e0b',
  },
  filterBadgeConfirmed: {
    backgroundColor: '#3b82f6',
  },
  filterBadgeReady: {
    backgroundColor: '#10b981',
  },
  filterBadgeCompleted: {
    backgroundColor: '#059669',
  },
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  quickFilterClear: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    gap: 4,
    marginLeft: 8,
  },
  quickFilterClearText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  quickFilterCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#6b7280',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4b5563',
    gap: 4,
    marginLeft: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  quickFilterCancelText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  quickFiltersWrapper: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
    height: 70,
  },
  quickFilterShowAll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#6b7280',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4b5563',
    gap: 4,
    marginRight: 12,
    minHeight: 36,
    justifyContent: 'center',
  },
  quickFilterShowAllText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  tabFiltersContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    height: 60,
  },
  tabFilter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabFilterActive: {
    borderBottomColor: '#3b82f6',
    backgroundColor: '#f8fafc',
  },
  tabFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 2,
  },
  tabFilterActiveText: {
    color: '#3b82f6',
  },
  tabFilterCount: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  tabFilterActiveCount: {
    color: '#3b82f6',
  },
  tabBadgeInline: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeActive: {
    backgroundColor: '#3b82f6',
  },
  tabBadgePending: {
    backgroundColor: '#f59e0b',
  },
  tabBadgeConfirmed: {
    backgroundColor: '#3b82f6',
  },
  tabBadgeReady: {
    backgroundColor: '#10b981',
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tabBadgeActiveText: {
    color: '#ffffff',
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  activeFilterButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  activeFilterButtonText: {
    color: '#ffffff',
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  bulkActions: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  bulkActionsText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
  },
  bulkActionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    color: '#ffffff',
  },
  ordersList: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  selectedOrderCard: {
    borderWidth: 2,
    borderColor: '#10b981',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  customerName: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  orderMeta: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  orderDetails: {
    marginBottom: 12,
  },
  fulfillmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fulfillmentText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
    marginRight: 8,
  },
  fulfillmentDetails: {
    fontSize: 12,
    color: '#9ca3af',
  },
  itemsInfo: {
    marginTop: 4,
  },
  itemsCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  itemsList: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
  },
  readyButton: {
    backgroundColor: '#10b981',
  },
  completeButton: {
    backgroundColor: '#059669',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 16,
  },
});

export default AdminOrderScreen;
