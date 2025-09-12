import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
// import { useInventoryDashboard } from 'hooks/inventory/useInventoryDashboard';
// import { useInventoryItems } from 'hooks/inventory/useInventoryItems';
// TODO: Fix missing hook files
const useInventoryDashboard = () => ({ data: { totalItems: 0, lowStockCount: 0, outOfStockCount: 0, totalValue: 0 }, isLoading: false, refetch: () => {} });
const useInventoryItems = () => ({ data: [], isLoading: false, refetch: () => {} });
import { useUserRole } from 'hooks/useUserRole';
import { MetricCard } from './components/MetricCard';
import { InventoryItemCard } from './components/InventoryItemCard';

interface InventoryDashboardProps {
  navigation?: any;
}

export function InventoryDashboard({ navigation }: InventoryDashboardProps) {
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard, error } = useInventoryDashboard();
  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useInventoryItems();
  const { hasPermission } = useUserRole();
  
  const canEditInventory = hasPermission('inventory:write');
  const isLoading = dashboardLoading || itemsLoading;
  
  const handleRefresh = useCallback(() => {
    refetchDashboard();
    refetchItems();
  }, [refetchDashboard, refetchItems]);
  
  const handleItemPress = useCallback((item: any) => {
    navigation?.navigate('ItemDetail', { id: item.id });
  }, [navigation]);
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load inventory data</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const lowStockItems = items?.filter(item => item.currentStock < item.minStock) || [];
  
  return (
    <ScrollView
      testID="dashboard-scroll"
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={handleRefresh}
        />
      }
    >
      <View testID="dashboard-header" style={styles.metricsContainer}>
        <View style={styles.metricsRow}>
          <MetricCard
            testID="total-items-metric"
            title="Total Items"
            value={dashboardData?.metrics?.totalItems || 0}
          />
          <MetricCard
            testID="total-value-metric"
            title="Total Value"
            value={`$${dashboardData?.metrics?.totalValue?.toLocaleString() || 0}`}
          />
        </View>
        
        <View style={styles.metricsRow}>
          <MetricCard
            testID="low-stock-metric"
            title="Low Stock"
            value={dashboardData?.metrics?.lowStockCount || 0}
            variant="warning"
          />
          <MetricCard
            testID="out-of-stock-metric"
            title="Out of Stock"
            value={dashboardData?.metrics?.outOfStockCount || 0}
            variant="danger"
          />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Low Stock Items</Text>
        {lowStockItems.length === 0 ? (
          <View testID="empty-state" style={styles.emptyState}>
            <Text style={styles.emptyText}>No low stock items</Text>
          </View>
        ) : (
          lowStockItems.map(item => (
            <InventoryItemCard
              key={item.id}
              item={item}
              onPress={() => handleItemPress(item)}
              showActions={canEditInventory}
            />
          ))
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Items</Text>
        {items?.map(item => (
          <InventoryItemCard
            key={item.id}
            item={item}
            onPress={() => handleItemPress(item)}
            showActions={canEditInventory}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 16,
  },
  metricsContainer: {
    padding: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginLeft: 8,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});