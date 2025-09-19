import React, { useState, useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { BarChart } from '../../components/executive/charts/BarChart';
import { PieChart } from '../../components/executive/PieChart';
import { DateRangePicker, DateRange } from '../../components/common/DateRangePicker';
import { useInventoryMetrics } from '../../hooks/inventory/useInventoryMetrics';
import { usePredictiveAnalytics } from '../../hooks/executive/usePredictiveAnalytics';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface StockLevelIndicatorProps {
  label: string;
  current: number;
  minimum: number;
  maximum: number;
}

const StockLevelIndicator: React.FC<StockLevelIndicatorProps> = ({
  label,
  current,
  minimum,
  maximum
}) => {
  const percentage = maximum > 0 ? (current / maximum) * 100 : 0;
  const status = current <= minimum ? 'critical' : current <= minimum * 1.5 ? 'low' : 'normal';

  const getStatusColor = () => {
    switch (status) {
      case 'critical': return '#ef4444';
      case 'low': return '#f59e0b';
      default: return '#10b981';
    }
  };

  return (
    <View style={styles.stockIndicator}>
      <View style={styles.stockHeader}>
        <Text style={styles.stockLabel}>{label}</Text>
        <Text style={[styles.stockStatus, { color: getStatusColor() }]}>
          {status.toUpperCase()}
        </Text>
      </View>
      <View style={styles.stockBarContainer}>
        <View style={[styles.stockBar, { width: `${percentage}%`, backgroundColor: getStatusColor() }]} />
      </View>
      <View style={styles.stockValues}>
        <Text style={styles.stockValue}>Current: {current}</Text>
        <Text style={styles.stockValue}>Min: {minimum}</Text>
        <Text style={styles.stockValue}>Max: {maximum}</Text>
      </View>
    </View>
  );
};

interface LowStockItemProps {
  name: string;
  currentStock: number;
  reorderPoint: number;
  warehouse: string;
  onReorder?: () => void;
}

const LowStockItem: React.FC<LowStockItemProps> = ({
  name,
  currentStock,
  reorderPoint,
  warehouse,
  onReorder
}) => {
  return (
    <View style={styles.lowStockItem}>
      <View style={styles.lowStockInfo}>
        <Text style={styles.itemName}>{name}</Text>
        <Text style={styles.itemWarehouse}>{warehouse}</Text>
        <View style={styles.stockInfo}>
          <Text style={styles.stockText}>Stock: {currentStock}</Text>
          <Text style={styles.reorderText}>Reorder at: {reorderPoint}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.reorderButton} onPress={onReorder}>
        <MaterialIcons name="shopping-cart" size={18} color="#ffffff" />
        <Text style={styles.reorderButtonText}>Reorder</Text>
      </TouchableOpacity>
    </View>
  );
};

export const InventoryOverviewDetail: React.FC = () => {
  const navigation = useNavigation();
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    label: 'Last 30 Days'
  });
  const [refreshing, setRefreshing] = useState(false);

  const { data: inventoryMetrics, isLoading, refetch } = useInventoryMetrics();
  const { data: forecast } = usePredictiveAnalytics('inventory', 30);

  // Mock data for demonstration
  const stockDistribution = useMemo(() => [
    { label: 'Optimal Stock', value: 45, color: '#10b981' },
    { label: 'Low Stock', value: 25, color: '#f59e0b' },
    { label: 'Critical Stock', value: 15, color: '#ef4444' },
    { label: 'Overstock', value: 15, color: '#6b7280' }
  ], []);

  const warehouseStock = useMemo(() => [
    { warehouse: 'Main Warehouse', items: 1250, value: 125000 },
    { warehouse: 'North Branch', items: 850, value: 85000 },
    { warehouse: 'South Branch', items: 620, value: 62000 },
    { warehouse: 'Distribution Center', items: 2100, value: 210000 }
  ], []);

  const lowStockItems = useMemo(() => [
    { id: '1', name: 'Organic Tomatoes', currentStock: 15, reorderPoint: 50, warehouse: 'Main Warehouse' },
    { id: '2', name: 'Fresh Lettuce', currentStock: 8, reorderPoint: 30, warehouse: 'North Branch' },
    { id: '3', name: 'Free-Range Eggs', currentStock: 24, reorderPoint: 100, warehouse: 'South Branch' },
    { id: '4', name: 'Organic Milk', currentStock: 12, reorderPoint: 40, warehouse: 'Main Warehouse' },
    { id: '5', name: 'Fresh Strawberries', currentStock: 5, reorderPoint: 25, warehouse: 'Distribution Center' }
  ], []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading inventory data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inventory Overview</Text>
        <TouchableOpacity style={styles.exportButton}>
          <MaterialIcons name="file-download" size={24} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Date Range Selection */}
        <View style={styles.dateSection}>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            showComparison={false}
          />
        </View>

        {/* Inventory Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Inventory Summary</Text>
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <MaterialIcons name="inventory" size={24} color="#4f46e5" />
              <Text style={styles.summaryValue}>4,820</Text>
              <Text style={styles.summaryLabel}>Total Items</Text>
            </View>
            <View style={styles.summaryCard}>
              <MaterialIcons name="attach-money" size={24} color="#10b981" />
              <Text style={styles.summaryValue}>$482K</Text>
              <Text style={styles.summaryLabel}>Total Value</Text>
            </View>
            <View style={styles.summaryCard}>
              <MaterialIcons name="warning" size={24} color="#f59e0b" />
              <Text style={styles.summaryValue}>23</Text>
              <Text style={styles.summaryLabel}>Low Stock</Text>
            </View>
            <View style={styles.summaryCard}>
              <MaterialIcons name="trending-down" size={24} color="#ef4444" />
              <Text style={styles.summaryValue}>5</Text>
              <Text style={styles.summaryLabel}>Out of Stock</Text>
            </View>
          </View>
        </View>

        {/* Stock Distribution */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Stock Distribution</Text>
          <PieChart
            data={stockDistribution}
            size={200}
            showLegend={true}
            showLabels={true}
          />
        </View>

        {/* Stock Levels by Category */}
        <View style={styles.stockLevelsSection}>
          <Text style={styles.sectionTitle}>Stock Levels by Category</Text>
          <StockLevelIndicator
            label="Produce"
            current={450}
            minimum={200}
            maximum={800}
          />
          <StockLevelIndicator
            label="Dairy"
            current={120}
            minimum={150}
            maximum={500}
          />
          <StockLevelIndicator
            label="Meat & Poultry"
            current={280}
            minimum={100}
            maximum={400}
          />
          <StockLevelIndicator
            label="Bakery"
            current={75}
            minimum={50}
            maximum={200}
          />
        </View>

        {/* Warehouse Distribution */}
        <View style={styles.warehouseSection}>
          <Text style={styles.sectionTitle}>Warehouse Distribution</Text>
          {warehouseStock.map((warehouse, index) => (
            <View key={index} style={styles.warehouseCard}>
              <View style={styles.warehouseInfo}>
                <Text style={styles.warehouseName}>{warehouse.warehouse}</Text>
                <Text style={styles.warehouseItems}>{warehouse.items} items</Text>
              </View>
              <Text style={styles.warehouseValue}>{formatCurrency(warehouse.value)}</Text>
            </View>
          ))}
        </View>

        {/* Low Stock Alerts */}
        <View style={styles.alertsSection}>
          <View style={styles.alertsHeader}>
            <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllButton}>View All</Text>
            </TouchableOpacity>
          </View>
          {lowStockItems.map((item: any) => (
            <LowStockItem
              key={item.id}
              name={item.name}
              currentStock={item.currentStock}
              reorderPoint={item.reorderPoint}
              warehouse={item.warehouse}
              onReorder={() => console.log('Reorder', item.name)}
            />
          ))}
        </View>

        {/* Predictive Insights */}
        {forecast && (
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>Inventory Forecast</Text>
            <View style={styles.insightCard}>
              <MaterialIcons name="trending-up" size={24} color="#4f46e5" />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Demand Prediction</Text>
                <Text style={styles.insightText}>
                  Expected 15% increase in demand for produce category over the next 2 weeks
                </Text>
                <Text style={styles.insightAction}>Recommend increasing stock by 200 units</Text>
              </View>
            </View>
            <View style={styles.insightCard}>
              <MaterialIcons name="schedule" size={24} color="#f59e0b" />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>Restock Schedule</Text>
                <Text style={styles.insightText}>
                  5 items will reach reorder point within 3 days
                </Text>
                <Text style={styles.insightAction}>Review and approve reorder suggestions</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  exportButton: {
    padding: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  dateSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summarySection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  summaryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  chartSection: {
    padding: 16,
    alignItems: 'center',
  },
  stockLevelsSection: {
    padding: 16,
  },
  stockIndicator: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  stockStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  stockBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  stockBar: {
    height: '100%',
    borderRadius: 4,
  },
  stockValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockValue: {
    fontSize: 11,
    color: '#6b7280',
  },
  warehouseSection: {
    padding: 16,
  },
  warehouseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  warehouseInfo: {
    flex: 1,
  },
  warehouseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  warehouseItems: {
    fontSize: 12,
    color: '#6b7280',
  },
  warehouseValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4f46e5',
  },
  alertsSection: {
    padding: 16,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllButton: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '500',
  },
  lowStockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  lowStockInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemWarehouse: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  stockInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  stockText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '500',
  },
  reorderText: {
    fontSize: 11,
    color: '#6b7280',
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  reorderButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  insightsSection: {
    padding: 16,
    paddingBottom: 32,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  insightContent: {
    flex: 1,
    marginLeft: 12,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
  },
  insightAction: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '500',
  },
});