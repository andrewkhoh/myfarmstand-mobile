import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Text, Button, Card } from '../../components';
import { useCurrentUser } from '../../hooks/useAuth';
import { useCurrentUserRole } from '../../hooks/role-based';
import { useInventoryDashboard } from '../../hooks/inventory/useInventoryDashboard';
import { spacing, colors } from '../../utils/theme';
import { runInventoryTestDataGeneration } from '../../utils/generateInventoryTestData';
import { InventoryWorkflowErrorBoundary } from '../../components/error/InventoryWorkflowErrorBoundary';

type InventoryHubNavigationProp = StackNavigationProp<any, 'InventoryHub'>;

interface MenuItemProps {
  title: string;
  description: string;
  icon: string;
  screen: string;
  badge?: string;
  alertLevel?: 'normal' | 'warning' | 'critical';
  isEnabled: boolean;
  onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ 
  title, 
  description, 
  icon,
  badge,
  alertLevel = 'normal',
  isEnabled,
  onPress 
}) => {
  const getAlertColor = () => {
    switch (alertLevel) {
      case 'critical': return colors.error;
      case 'warning': return colors.warning;
      default: return colors.primary[600];
    }
  };

  return (
    <TouchableOpacity
      onPress={isEnabled ? onPress : undefined}
      disabled={!isEnabled}
      activeOpacity={0.7}
    >
      <Card
        variant="outlined"
        style={[styles.menuCard, !isEnabled && styles.disabledCard]}
      >
        <View style={styles.menuItem}>
          <Text variant="heading1" style={styles.menuIcon}>{icon}</Text>
          <View style={styles.menuContent}>
            <View style={styles.titleRow}>
              <Text variant="heading3" style={!isEnabled ? styles.disabledText : undefined}>
                {title}
              </Text>
              {badge && (
                <View style={[styles.badge, { backgroundColor: getAlertColor() }]}>
                  <Text variant="caption" style={styles.badgeText}>{badge}</Text>
                </View>
              )}
            </View>
            <Text
              variant="body"
              color={isEnabled ? "secondary" : "tertiary"}
              style={styles.menuDescription}
            >
              {description}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

interface QuickStockUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: (productId: string, quantity: number) => void;
}

const QuickStockUpdateModal: React.FC<QuickStockUpdateModalProps> = ({
  visible,
  onClose,
  onUpdate
}) => {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');

  const handleUpdate = () => {
    if (productId && quantity) {
      onUpdate(productId, parseInt(quantity, 10));
      setProductId('');
      setQuantity('');
      onClose();
    } else {
      Alert.alert('Error', 'Please enter both product ID and quantity');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <Card variant="elevated" style={styles.modalContent}>
          <Text variant="heading3" style={styles.modalTitle}>
            Quick Stock Update
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Product ID or SKU"
            value={productId}
            onChangeText={setProductId}
          />
          <TextInput
            style={styles.input}
            placeholder="New Quantity"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />
          <View style={styles.modalButtons}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={styles.modalButton}
            />
            <Button
              title="Update"
              variant="primary"
              onPress={handleUpdate}
              style={styles.modalButton}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
};

interface ReceiveStockModalProps {
  visible: boolean;
  onClose: () => void;
}

const ReceiveStockModal: React.FC<ReceiveStockModalProps> = ({
  visible,
  onClose
}) => {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReceiveStock = async () => {
    if (!productId || !quantity) {
      Alert.alert('Error', 'Please enter product ID and quantity');
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Implement actual API call to receive stock
      console.log('Receiving stock:', {
        productId,
        quantity: parseInt(quantity, 10),
        supplierName,
        invoiceNumber
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert(
        'Success',
        `Received ${quantity} units of product ${productId}`,
        [{ text: 'OK', onPress: () => {
          setProductId('');
          setQuantity('');
          setSupplierName('');
          setInvoiceNumber('');
          onClose();
        }}]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to receive stock. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <Card variant="elevated" style={styles.modalContent}>
          <Text variant="heading3" style={styles.modalTitle}>
            📥 Receive Stock
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Product ID or SKU *"
            value={productId}
            onChangeText={setProductId}
            editable={!isProcessing}
          />

          <TextInput
            style={styles.input}
            placeholder="Quantity to Receive *"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            editable={!isProcessing}
          />

          <TextInput
            style={styles.input}
            placeholder="Supplier Name (optional)"
            value={supplierName}
            onChangeText={setSupplierName}
            editable={!isProcessing}
          />

          <TextInput
            style={styles.input}
            placeholder="Invoice/PO Number (optional)"
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            editable={!isProcessing}
          />

          <View style={styles.modalButtons}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={styles.modalButton}
              disabled={isProcessing}
            />
            <Button
              title={isProcessing ? "Processing..." : "Receive Stock"}
              variant="primary"
              onPress={handleReceiveStock}
              style={styles.modalButton}
              disabled={isProcessing}
              loading={isProcessing}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
};

interface TransferStockModalProps {
  visible: boolean;
  onClose: () => void;
}

const TransferStockModal: React.FC<TransferStockModalProps> = ({
  visible,
  onClose
}) => {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTransferStock = async () => {
    if (!productId || !quantity || !fromLocation || !toLocation) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (fromLocation === toLocation) {
      Alert.alert('Error', 'Source and destination locations must be different');
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Implement actual API call to transfer stock
      console.log('Transferring stock:', {
        productId,
        quantity: parseInt(quantity, 10),
        fromLocation,
        toLocation,
        notes
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert(
        'Success',
        `Transferred ${quantity} units from ${fromLocation} to ${toLocation}`,
        [{ text: 'OK', onPress: () => {
          setProductId('');
          setQuantity('');
          setFromLocation('');
          setToLocation('');
          setNotes('');
          onClose();
        }}]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to transfer stock. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <Card variant="elevated" style={[styles.modalContent, { maxHeight: '80%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="heading3" style={styles.modalTitle}>
              📤 Transfer Stock
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Product ID or SKU *"
              value={productId}
              onChangeText={setProductId}
              editable={!isProcessing}
            />

            <TextInput
              style={styles.input}
              placeholder="Quantity to Transfer *"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              editable={!isProcessing}
            />

            <TextInput
              style={styles.input}
              placeholder="From Location/Warehouse *"
              value={fromLocation}
              onChangeText={setFromLocation}
              editable={!isProcessing}
            />

            <TextInput
              style={styles.input}
              placeholder="To Location/Warehouse *"
              value={toLocation}
              onChangeText={setToLocation}
              editable={!isProcessing}
            />

            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Transfer Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              editable={!isProcessing}
            />
          </ScrollView>

          <View style={styles.modalButtons}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={styles.modalButton}
              disabled={isProcessing}
            />
            <Button
              title={isProcessing ? "Processing..." : "Transfer Stock"}
              variant="primary"
              onPress={handleTransferStock}
              style={styles.modalButton}
              disabled={isProcessing}
              loading={isProcessing}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
};

const InventoryHubContent: React.FC = () => {
  const navigation = useNavigation<InventoryHubNavigationProp>();
  const { data: user } = useCurrentUser();
  const { role, isAdmin, isExecutive, isStaff } = useCurrentUserRole();
  const { metrics, alerts, isLoading } = useInventoryDashboard();
  const [showQuickUpdate, setShowQuickUpdate] = useState(false);
  const [showReceiveStock, setShowReceiveStock] = useState(false);
  const [showTransferStock, setShowTransferStock] = useState(false);

  // Role-based access checks
  const isManager = role === 'manager';
  const canEditInventory = isAdmin || isExecutive || isStaff;
  const canManageSettings = isAdmin || isExecutive;
  
  // Calculate alert counts
  const lowStockCount = alerts?.filter(a => a.type === 'low_stock').length || 0;
  const outOfStockCount = alerts?.filter(a => a.type === 'out_of_stock').length || 0;
  const criticalAlerts = lowStockCount + outOfStockCount;
  
  const menuItems = [
    {
      title: 'Inventory Dashboard',
      description: 'Complete inventory overview and metrics',
      icon: '📊',
      screen: 'InventoryDashboard',
      isEnabled: true
    },
    {
      title: 'Inventory Alerts',
      description: 'Low stock alerts and threshold management',
      icon: '🚨',
      screen: 'InventoryAlerts',
      badge: criticalAlerts > 0 ? `${criticalAlerts}` : undefined,
      alertLevel: criticalAlerts > 5 ? 'critical' : criticalAlerts > 0 ? 'warning' : 'normal' as const,
      isEnabled: true
    },
    {
      title: 'Bulk Operations',
      description: 'Update multiple products at once',
      icon: '📦',
      screen: 'BulkOperations',
      isEnabled: canEditInventory
    },
    {
      title: 'Stock Movement History',
      description: 'Track all inventory changes and audit trail',
      icon: '📜',
      screen: 'StockMovementHistory',
      isEnabled: true
    },
    {
      title: 'Quick Stock Update',
      description: 'Rapid single-item stock adjustment',
      icon: '⚡',
      screen: 'QuickUpdate',
      isEnabled: canEditInventory,
      isQuickAction: true
    }
  ];

  const handleNavigate = (screen: string) => {
    if (screen === 'QuickUpdate') {
      setShowQuickUpdate(true);
      return;
    }
    
    try {
      navigation.navigate(screen as never);
    } catch (err) {
      console.warn(`Screen ${screen} not yet implemented`);
      Alert.alert(
        'Coming Soon',
        `The ${screen} feature is being finalized and will be available soon.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleQuickStockUpdate = (productId: string, quantity: number) => {
    Alert.alert(
      'Stock Updated',
      `Product ${productId} stock set to ${quantity}`,
      [{ text: 'OK' }]
    );
    // TODO: Implement actual stock update
  };

  return (
    <Screen scrollable>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Card variant="elevated" style={styles.header}>
          <Text variant="heading2">📦 Inventory Management</Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Stock control, alerts, and movement tracking
          </Text>
          {role && (
            <Text variant="caption" color="tertiary" style={styles.roleText}>
              Access Level: {role.toUpperCase()}
            </Text>
          )}
        </Card>

        {/* Inventory Summary Stats */}
        {!isLoading && metrics && (
          <Card variant="outlined" style={styles.statsCard}>
            <Text variant="heading3" style={styles.statsTitle}>Current Status</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text variant="heading2" style={styles.statValue}>
                  {metrics.totalProducts || 0}
                </Text>
                <Text variant="caption" color="secondary">Total Products</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text variant="heading2" style={[styles.statValue, styles.warningText]}>
                  {lowStockCount}
                </Text>
                <Text variant="caption" color="secondary">Low Stock</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text variant="heading2" style={[styles.statValue, styles.errorText]}>
                  {outOfStockCount}
                </Text>
                <Text variant="caption" color="secondary">Out of Stock</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text variant="heading2" style={styles.statValue}>
                  ${metrics.totalValue?.toLocaleString() || 0}
                </Text>
                <Text variant="caption" color="secondary">Total Value</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Critical Alerts Banner */}
        {criticalAlerts > 0 && (
          <TouchableOpacity
            onPress={() => handleNavigate('InventoryAlerts')}
            activeOpacity={0.7}
          >
            <Card
              variant="outlined"
              style={[styles.alertBanner, criticalAlerts > 5 && styles.criticalBanner]}
            >
              <View style={styles.alertBannerContent}>
                <Text variant="heading3" style={styles.alertBannerText}>
                  ⚠️ {criticalAlerts} items need attention
                </Text>
                <Text variant="body" color="secondary">
                  Tap to view alerts →
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text variant="heading3" style={styles.sectionTitle}>
            Inventory Tools
          </Text>
          {menuItems.map((item: any) => (
            <MenuItem
              key={item.screen}
              title={item.title}
              description={item.description}
              icon={item.icon}
              screen={item.screen}
              badge={item.badge}
              alertLevel={item.alertLevel}
              isEnabled={item.isEnabled}
              onPress={() => handleNavigate(item.screen)}
            />
          ))}
        </View>

        {/* Access Notice */}
        {isStaff && (
          <Card variant="outlined" style={styles.noticeCard}>
            <Text variant="body" color="secondary">
              ℹ️ As staff, you can view inventory and update stock levels. 
              Some administrative features require manager access.
            </Text>
          </Card>
        )}

        {/* Quick Actions */}
        {canEditInventory && (
          <View style={styles.quickActionsSection}>
            <Text variant="heading3" style={styles.sectionTitle}>
              Quick Actions
            </Text>
            <View style={styles.quickActionsGrid}>
              <Button
                title="📥 Receive Stock"
                variant="outline"
                onPress={() => {
                  console.log('Receive Stock button pressed');
                  setShowReceiveStock(true);
                }}
                style={styles.quickActionButton}
              />
              <Button
                title="📤 Transfer Stock"
                variant="outline"
                onPress={() => {
                  console.log('Transfer Stock button pressed');
                  setShowTransferStock(true);
                }}
                style={styles.quickActionButton}
              />
            </View>
          </View>
        )}

        {/* Dev Tools - Generate Test Data */}
        {__DEV__ && (
          <Card variant="outlined" style={styles.devToolsCard}>
            <Text variant="heading3" style={styles.sectionTitle}>
              Development Tools
            </Text>
            <Button
              title="🧪 Generate Test Data"
              variant="outline"
              onPress={async () => {
                Alert.alert(
                  'Generate Test Data',
                  'This will create sample inventory alerts and stock movements for testing.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Generate',
                      onPress: async () => {
                        try {
                          const result = await runInventoryTestDataGeneration();
                          if (result?.success) {
                            Alert.alert(
                              'Success',
                              `Created ${result.data.alertsCreated} alerts and ${result.data.movementsCreated} stock movements`
                            );
                            // Refresh the dashboard
                            handleNavigate('InventoryAlerts');
                          } else {
                            Alert.alert('Error', 'Failed to generate test data');
                          }
                        } catch (error) {
                          Alert.alert('Error', 'Failed to generate test data');
                          console.error(error);
                        }
                      }
                    }
                  ]
                );
              }}
              style={styles.testDataButton}
            />
          </Card>
        )}
      </ScrollView>

      {/* Quick Stock Update Modal */}
      <QuickStockUpdateModal
        visible={showQuickUpdate}
        onClose={() => setShowQuickUpdate(false)}
        onUpdate={handleQuickStockUpdate}
      />

      {/* Receive Stock Modal */}
      <ReceiveStockModal
        visible={showReceiveStock}
        onClose={() => setShowReceiveStock(false)}
      />

      {/* Transfer Stock Modal */}
      <TransferStockModal
        visible={showTransferStock}
        onClose={() => setShowTransferStock(false)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  roleText: {
    marginTop: spacing.sm,
  },
  statsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsTitle: {
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.light,
  },
  warningText: {
    color: colors.warning,
  },
  errorText: {
    color: colors.error,
  },
  alertBanner: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderColor: colors.warning,
    borderWidth: 1,
  },
  criticalBanner: {
    borderColor: colors.error,
    backgroundColor: colors.error + '10',
  },
  alertBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertBannerText: {
    flex: 1,
  },
  menuSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  menuCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  disabledCard: {
    opacity: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuDescription: {
    marginTop: spacing.xs,
  },
  disabledText: {
    color: colors.text.tertiary,
  },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
    marginLeft: spacing.xs,
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: 10,
    fontWeight: '600',
  },
  noticeCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  quickActionsSection: {
    marginBottom: spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    marginHorizontal: spacing.xs / 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.lg,
  },
  modalTitle: {
    marginBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: spacing.xs / 2,
  },
  devToolsCard: {
    padding: spacing.md,
    marginVertical: spacing.lg,
    borderColor: colors.primary[400],
    borderWidth: 2,
    borderStyle: 'dashed' as any,
  },
  testDataButton: {
    marginTop: spacing.sm,
  },
});

// Export wrapped with error boundary
export const InventoryHub: React.FC = () => {
  return (
    <InventoryWorkflowErrorBoundary
      showErrorHistory={__DEV__}
      enableAutoRecovery={true}
      maxAutoRetries={3}
    >
      <InventoryHubContent />
    </InventoryWorkflowErrorBoundary>
  );
};