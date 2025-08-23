/**
 * Stock Movement History Screen
 * Complete audit trail for all inventory changes with filtering and export
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert as RNAlert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Loading } from '../../components/Loading';

import { useStockMovements } from '../../hooks/inventory/useStockMovements';
import { useUserRole } from '../../hooks/role-based/useUserRole';

type NavigationProp = StackNavigationProp<any>;

interface MovementItemProps {
  movement: {
    id: string;
    movementType: 'restock' | 'sale' | 'adjustment' | 'reservation' | 'release';
    quantityChange: number;
    previousStock: number;
    newStock: number;
    reason?: string;
    performedBy?: string;
    performedAt: string;
    productName?: string;
    referenceOrderId?: string;
    batchId?: string;
  };
  onPress: () => void;
}

const MovementItem: React.FC<MovementItemProps> = ({ movement, onPress }) => {
  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'restock': return '#34C759';
      case 'sale': return '#007AFF';
      case 'adjustment': return '#FF9500';
      case 'reservation': return '#FF3B30';
      case 'release': return '#5AC8FA';
      default: return '#8E8E93';
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'restock': return '📦';
      case 'sale': return '🛒';
      case 'adjustment': return '⚖️';
      case 'reservation': return '🔒';
      case 'release': return '🔓';
      default: return '📝';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isIncrease = movement.quantityChange > 0;

  return (
    <TouchableOpacity style={styles.movementItem} onPress={onPress}>
      <View style={styles.movementHeader}>
        <View style={styles.movementInfo}>
          <Text style={styles.movementIcon}>{getMovementIcon(movement.movementType)}</Text>
          <View style={styles.movementDetails}>
            <Text style={styles.movementProduct}>{movement.productName || 'Unknown Product'}</Text>
            <Text style={styles.movementType}>
              {movement.movementType.charAt(0).toUpperCase() + movement.movementType.slice(1)}
            </Text>
            <Text style={styles.movementDate}>{formatDate(movement.performedAt)}</Text>
          </View>
        </View>
        
        <View style={styles.movementQuantity}>
          <Text style={[
            styles.quantityChange,
            { color: isIncrease ? '#34C759' : '#FF3B30' }
          ]}>
            {isIncrease ? '+' : ''}{movement.quantityChange}
          </Text>
          <Text style={styles.stockLevels}>
            {movement.previousStock} → {movement.newStock}
          </Text>
        </View>
      </View>

      {movement.reason && (
        <Text style={styles.movementReason}>{movement.reason}</Text>
      )}

      {movement.batchId && (
        <View style={styles.batchTag}>
          <Text style={styles.batchText}>Batch: {movement.batchId.substring(0, 8)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: MovementFilters) => void;
  currentFilters: MovementFilters;
}

interface MovementFilters {
  movementType?: string;
  dateRange?: 'today' | 'week' | 'month' | 'custom';
  performedBy?: string;
  showBatchOnly?: boolean;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApplyFilters,
  currentFilters
}) => {
  const [filters, setFilters] = useState<MovementFilters>(currentFilters);

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: MovementFilters = {};
    setFilters(resetFilters);
    onApplyFilters(resetFilters);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.modalResetText}>Reset</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filter Movements</Text>
          <TouchableOpacity onPress={handleApply}>
            <Text style={styles.modalApplyText}>Apply</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.filterContent}>
          {/* Movement Type Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Movement Type</Text>
            {['restock', 'sale', 'adjustment', 'reservation', 'release'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterOption,
                  filters.movementType === type && styles.filterOptionSelected
                ]}
                onPress={() => setFilters(prev => ({ 
                  ...prev, 
                  movementType: prev.movementType === type ? undefined : type 
                }))}
              >
                <Text style={[
                  styles.filterOptionText,
                  filters.movementType === type && styles.filterOptionTextSelected
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Range Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Date Range</Text>
            {[
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' }
            ].map((range) => (
              <TouchableOpacity
                key={range.key}
                style={[
                  styles.filterOption,
                  filters.dateRange === range.key && styles.filterOptionSelected
                ]}
                onPress={() => setFilters(prev => ({ 
                  ...prev, 
                  dateRange: prev.dateRange === range.key ? undefined : range.key as any
                }))}
              >
                <Text style={[
                  styles.filterOptionText,
                  filters.dateRange === range.key && styles.filterOptionTextSelected
                ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Batch Operations Toggle */}
          <View style={styles.filterSection}>
            <TouchableOpacity
              style={[
                styles.filterToggle,
                filters.showBatchOnly && styles.filterToggleSelected
              ]}
              onPress={() => setFilters(prev => ({ 
                ...prev, 
                showBatchOnly: !prev.showBatchOnly 
              }))}
            >
              <Text style={[
                styles.filterToggleText,
                filters.showBatchOnly && styles.filterToggleTextSelected
              ]}>
                Show Batch Operations Only
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default function StockMovementHistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userRole, hasPermission } = useUserRole();

  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MovementFilters>({});
  const [selectedMovement, setSelectedMovement] = useState<any>(null);

  // Hook for stock movements with filters
  const movementsQuery = useStockMovements(filters);

  const canViewDetails = hasPermission(['inventory:read', 'audit:view']);
  const canExport = hasPermission(['inventory:read', 'audit:export']);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await movementsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [movementsQuery]);

  const handleMovementPress = useCallback((movement: any) => {
    if (!canViewDetails) {
      RNAlert.alert('Permission Denied', 'You do not have permission to view movement details');
      return;
    }
    setSelectedMovement(movement);
  }, [canViewDetails]);

  const handleExport = useCallback(() => {
    if (!canExport) {
      RNAlert.alert('Permission Denied', 'You do not have permission to export audit data');
      return;
    }

    RNAlert.alert(
      'Export Movement History',
      'Choose export format for movement history data',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'CSV', onPress: () => console.log('Export CSV') },
        { text: 'PDF Report', onPress: () => console.log('Export PDF') }
      ]
    );
  }, [canExport]);

  const handleApplyFilters = useCallback((newFilters: MovementFilters) => {
    setFilters(newFilters);
  }, []);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const movements = movementsQuery.data || [];
    
    const stats = {
      totalMovements: movements.length,
      increases: movements.filter(m => m.quantityChange > 0).length,
      decreases: movements.filter(m => m.quantityChange < 0).length,
      netChange: movements.reduce((sum, m) => sum + m.quantityChange, 0)
    };

    return stats;
  }, [movementsQuery.data]);

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => 
      value !== undefined && value !== '' && value !== false
    ).length;
  };

  if (movementsQuery.isLoading) {
    return <Loading message="Loading movement history..." />;
  }

  if (movementsQuery.error) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load movement history</Text>
          <Button title="Retry" onPress={() => movementsQuery.refetch()} />
        </View>
      </Screen>
    );
  }

  const movements = movementsQuery.data || [];

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Movement History</Text>
            <Text style={styles.subtitle}>{movements.length} movements</Text>
          </View>
          <TouchableOpacity onPress={handleExport}>
            <Text style={styles.exportButton}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summaryStats.totalMovements}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#34C759' }]}>
                {summaryStats.increases}
              </Text>
              <Text style={styles.summaryLabel}>Increases</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#FF3B30' }]}>
                {summaryStats.decreases}
              </Text>
              <Text style={styles.summaryLabel}>Decreases</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[
                styles.summaryValue, 
                { color: summaryStats.netChange >= 0 ? '#34C759' : '#FF3B30' }
              ]}>
                {summaryStats.netChange >= 0 ? '+' : ''}{summaryStats.netChange}
              </Text>
              <Text style={styles.summaryLabel}>Net Change</Text>
            </View>
          </View>
        </Card>

        {/* Filter Controls */}
        <View style={styles.filterControls}>
          <TouchableOpacity 
            style={[
              styles.filterButton,
              getActiveFilterCount() > 0 && styles.filterButtonActive
            ]}
            onPress={() => setShowFilters(true)}
          >
            <Text style={[
              styles.filterButtonText,
              getActiveFilterCount() > 0 && styles.filterButtonTextActive
            ]}>
              Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Movements List */}
        {movements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Movements Found</Text>
            <Text style={styles.emptySubtitle}>
              {getActiveFilterCount() > 0 
                ? 'Try adjusting your filters to see more results'
                : 'No stock movements have been recorded yet'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.movementsList}>
            {movements.map((movement) => (
              <MovementItem
                key={movement.id}
                movement={movement}
                onPress={() => handleMovementPress(movement)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={filters}
      />

      {/* Movement Detail Modal */}
      <Modal
        visible={!!selectedMovement}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedMovement && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Movement Details</Text>
              <TouchableOpacity onPress={() => setSelectedMovement(null)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.detailContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Product</Text>
                <Text style={styles.detailValue}>{selectedMovement.productName}</Text>
              </View>
              
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Movement Type</Text>
                <Text style={styles.detailValue}>
                  {selectedMovement.movementType.charAt(0).toUpperCase() + selectedMovement.movementType.slice(1)}
                </Text>
              </View>
              
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Quantity Change</Text>
                <Text style={[
                  styles.detailValue,
                  { color: selectedMovement.quantityChange >= 0 ? '#34C759' : '#FF3B30' }
                ]}>
                  {selectedMovement.quantityChange >= 0 ? '+' : ''}{selectedMovement.quantityChange}
                </Text>
              </View>
              
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Stock Levels</Text>
                <Text style={styles.detailValue}>
                  {selectedMovement.previousStock} → {selectedMovement.newStock}
                </Text>
              </View>
              
              {selectedMovement.reason && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Reason</Text>
                  <Text style={styles.detailValue}>{selectedMovement.reason}</Text>
                </View>
              )}
              
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Performed At</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedMovement.performedAt).toLocaleString()}
                </Text>
              </View>
              
              {selectedMovement.batchId && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Batch ID</Text>
                  <Text style={styles.detailValue}>{selectedMovement.batchId}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 2,
  },
  exportButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  filterControls: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  movementsList: {
    paddingHorizontal: 16,
  },
  movementItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  movementInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  movementIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  movementDetails: {
    flex: 1,
  },
  movementProduct: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  movementType: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 2,
  },
  movementDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  movementQuantity: {
    alignItems: 'flex-end',
  },
  quantityChange: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  stockLevels: {
    fontSize: 12,
    color: '#8E8E93',
  },
  movementReason: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    fontStyle: 'italic',
  },
  batchTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 8,
  },
  batchText: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
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
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalResetText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  modalApplyText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  filterContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  filterOption: {
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginBottom: 8,
  },
  filterOptionSelected: {
    backgroundColor: '#007AFF',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  filterOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  filterToggle: {
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    alignItems: 'center',
  },
  filterToggleSelected: {
    backgroundColor: '#007AFF',
  },
  filterToggleText: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  filterToggleTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#1D1D1F',
  },
});