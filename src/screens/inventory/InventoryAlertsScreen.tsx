/**
 * Inventory Alerts Screen  
 * Threshold management and alert configuration for inventory monitoring
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Switch,
  TextInput,
  Alert as RNAlert,
  SectionList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { Text } from '../../components/Text';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Loading } from '../../components/Loading';

import { useInventoryAlerts } from '../../hooks/inventory/useInventoryDashboard';
import { useUpdateStock } from '../../hooks/inventory/useInventoryOperations';
import { useUserRole } from '../../hooks/role-based/useUserRole';

type NavigationProp = StackNavigationProp<any>;

interface AlertItemProps {
  alert: {
    id: string;
    type: 'low_stock' | 'out_of_stock' | 'threshold_breach';
    productName: string;
    currentStock: number;
    threshold: number;
    severity: 'high' | 'medium' | 'low';
    createdAt: string;
  };
  onQuickAction: (alertId: string, action: 'restock' | 'adjust_threshold' | 'hide') => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, onQuickAction }) => {
  const severityColors = {
    high: '#FF3B30',
    medium: '#FF9500', 
    low: '#FFCC00'
  };

  const typeIcons = {
    out_of_stock: '⚠️',
    low_stock: '📉',
    threshold_breach: '🚨'
  };

  const getStockStatus = () => {
    if (alert.currentStock === 0) return 'OUT OF STOCK';
    if (alert.currentStock <= alert.threshold * 0.25) return 'CRITICAL';
    if (alert.currentStock <= alert.threshold * 0.5) return 'LOW';
    return 'MONITOR';
  };

  return (
    <Card style={styles.alertItem}>
      <View style={styles.alertHeader}>
        <View style={styles.alertInfo}>
          <Text style={styles.alertIcon}>{typeIcons[alert.type]}</Text>
          <View style={styles.alertDetails}>
            <Text style={styles.alertProductName}>{alert.productName}</Text>
            <Text style={styles.alertDescription}>
              Stock: {alert.currentStock} / Threshold: {alert.threshold}
            </Text>
            <Text style={[styles.alertStatus, { color: severityColors[alert.severity] }]}>
              {getStockStatus()}
            </Text>
          </View>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: severityColors[alert.severity] }]}>
          <Text style={styles.severityText}>{alert.severity.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.alertActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.restockButton]}
          onPress={() => onQuickAction(alert.id, 'restock')}
        >
          <Text style={styles.actionButtonText}>Quick Restock</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.thresholdButton]}
          onPress={() => onQuickAction(alert.id, 'adjust_threshold')}
        >
          <Text style={styles.actionButtonText}>Adjust Threshold</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.hideButton]}
          onPress={() => onQuickAction(alert.id, 'hide')}
        >
          <Text style={styles.actionButtonText}>Hide</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

interface QuickRestockModalProps {
  visible: boolean;
  alert: any;
  onClose: () => void;
  onRestock: (alertId: string, quantity: number) => void;
}

const QuickRestockModal: React.FC<QuickRestockModalProps> = ({
  visible,
  alert,
  onClose,
  onRestock
}) => {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Quick restock from alerts');

  const handleRestock = () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      RNAlert.alert('Invalid Quantity', 'Please enter a valid quantity greater than 0');
      return;
    }

    onRestock(alert?.id, qty);
    setQuantity('');
    onClose();
  };

  const suggestedQuantity = alert ? Math.max(alert.threshold - alert.currentStock, alert.threshold) : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Quick Restock</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{alert?.productName}</Text>
            <Text style={styles.currentStock}>Current Stock: {alert?.currentStock}</Text>
            <Text style={styles.threshold}>Threshold: {alert?.threshold}</Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Restock Quantity</Text>
            <TextInput
              style={styles.quantityInput}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="Enter quantity"
            />
            <TouchableOpacity 
              style={styles.suggestionButton}
              onPress={() => setQuantity(suggestedQuantity.toString())}
            >
              <Text style={styles.suggestionText}>
                Suggested: {suggestedQuantity} (to reach threshold)
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Reason for restocking"
              multiline
            />
          </View>

          <View style={styles.resultPreview}>
            <Text style={styles.previewLabel}>After restock:</Text>
            <Text style={styles.previewValue}>
              {(alert?.currentStock || 0) + (parseInt(quantity, 10) || 0)} units
            </Text>
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          <Button title="Restock Now" onPress={handleRestock} />
        </View>
      </View>
    </Modal>
  );
};

export default function InventoryAlertsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userRole, hasPermission } = useUserRole();

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showQuickRestock, setShowQuickRestock] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [alertSettings, setAlertSettings] = useState({
    enableNotifications: true,
    autoRefresh: true,
    showDismissed: false
  });

  // Hooks
  const alertsQuery = useInventoryAlerts();
  const updateStockMutation = useUpdateStock();

  const canManageStock = hasPermission(['inventory:write', 'stock:update']);
  const canConfigureThresholds = hasPermission(['inventory:manage', 'inventory:configure']);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await alertsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [alertsQuery]);

  const handleQuickAction = useCallback((alertId: string, action: 'restock' | 'adjust_threshold' | 'hide') => {
    const alert = alertsQuery.data?.find(a => a.id === alertId);
    if (!alert) return;

    switch (action) {
      case 'restock':
        if (!canManageStock) {
          RNAlert.alert('Permission Denied', 'You do not have permission to update stock');
          return;
        }
        setSelectedAlert(alert);
        setShowQuickRestock(true);
        break;
        
      case 'adjust_threshold':
        if (!canConfigureThresholds) {
          RNAlert.alert('Permission Denied', 'You do not have permission to configure thresholds');
          return;
        }
        navigation.navigate('StockManagement', { 
          highlightItem: alertId,
          mode: 'threshold_edit' 
        });
        break;
        
      case 'hide':
        // TODO: Implement alert dismissal
        RNAlert.alert('Feature Coming Soon', 'Alert dismissal will be available soon');
        break;
    }
  }, [alertsQuery.data, canManageStock, canConfigureThresholds, navigation]);

  const handleQuickRestock = useCallback(async (alertId: string, quantity: number) => {
    const alert = alertsQuery.data?.find(a => a.id === alertId);
    if (!alert) return;

    try {
      await updateStockMutation.mutateAsync({
        inventoryId: alertId,
        stockUpdate: {
          currentStock: alert.currentStock + quantity,
          reason: `Quick restock: +${quantity} units from alerts`,
          performedBy: userRole?.userId
        }
      });

      RNAlert.alert(
        'Stock Updated',
        `Successfully added ${quantity} units to ${alert.productName}`
      );
    } catch (error) {
      RNAlert.alert(
        'Update Failed', 
        `Failed to update stock: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [alertsQuery.data, updateStockMutation, userRole]);

  if (alertsQuery.isLoading) {
    return <Loading message="Loading alerts..." />;
  }

  if (alertsQuery.error) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load alerts</Text>
          <Button title="Retry" onPress={() => alertsQuery.refetch()} />
        </View>
      </Screen>
    );
  }

  const alerts = alertsQuery.data || [];
  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.severity === filter);

  // Group alerts by severity for better organization
  const alertSections = [
    {
      title: 'Critical Alerts',
      data: filteredAlerts.filter(a => a.severity === 'high'),
      color: '#FF3B30'
    },
    {
      title: 'Warning Alerts', 
      data: filteredAlerts.filter(a => a.severity === 'medium'),
      color: '#FF9500'
    },
    {
      title: 'Low Priority Alerts',
      data: filteredAlerts.filter(a => a.severity === 'low'),
      color: '#FFCC00'
    }
  ].filter(section => section.data.length > 0);

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
          <Text style={styles.title}>Inventory Alerts</Text>
          <Text style={styles.subtitle}>
            {filteredAlerts.length} active alert{filteredAlerts.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Filter Controls */}
        <View style={styles.filterContainer}>
          {(['all', 'high', 'medium', 'low'] as const).map((filterOption) => (
            <TouchableOpacity
              key={filterOption}
              style={[
                styles.filterButton,
                filter === filterOption && styles.filterButtonActive
              ]}
              onPress={() => setFilter(filterOption)}
            >
              <Text style={[
                styles.filterButtonText,
                filter === filterOption && styles.filterButtonTextActive
              ]}>
                {filterOption === 'all' ? 'All' : filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Alert Settings */}
        <Card style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Alert Settings</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Switch
              value={alertSettings.enableNotifications}
              onValueChange={(value) => 
                setAlertSettings(prev => ({ ...prev, enableNotifications: value }))
              }
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Auto Refresh</Text>
            <Switch
              value={alertSettings.autoRefresh}
              onValueChange={(value) => 
                setAlertSettings(prev => ({ ...prev, autoRefresh: value }))
              }
            />
          </View>
        </Card>

        {/* Alerts List */}
        {filteredAlerts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Alerts</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'all' 
                ? 'All inventory levels are healthy!' 
                : `No ${filter} priority alerts at this time.`}
            </Text>
          </View>
        ) : (
          alertSections.map((section, index) => (
            <View key={section.title}>
              <View style={[styles.sectionHeader, { borderLeftColor: section.color }]}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>({section.data.length})</Text>
              </View>
              {section.data.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onQuickAction={handleQuickAction}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Quick Restock Modal */}
      <QuickRestockModal
        visible={showQuickRestock}
        alert={selectedAlert}
        onClose={() => setShowQuickRestock(false)}
        onRestock={handleQuickRestock}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    marginRight: 8,
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
  settingsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1D1D1F',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 4,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  sectionCount: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  alertItem: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertDetails: {
    flex: 1,
  },
  alertProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  alertStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  restockButton: {
    backgroundColor: '#34C759',
  },
  thresholdButton: {
    backgroundColor: '#007AFF',
  },
  hideButton: {
    backgroundColor: '#8E8E93',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
  modalContent: {
    flex: 1,
    padding: 16,
  },
  productInfo: {
    marginBottom: 24,
  },
  productName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  currentStock: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 4,
  },
  threshold: {
    fontSize: 16,
    color: '#8E8E93',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  suggestionButton: {
    padding: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  resultPreview: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  modalActions: {
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
});