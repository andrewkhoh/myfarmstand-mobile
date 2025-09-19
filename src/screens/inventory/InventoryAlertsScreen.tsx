import React, { useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useStockAlerts, useAcknowledgeAlert } from '../../hooks/inventory/useStockAlerts';
import { AlertCard } from './components/AlertCard';
import { InventoryAlert } from 'types/inventory';
import { debugInventoryAlerts } from '../../utils/debugInventoryAlerts';

interface InventoryAlertsScreenProps {
  navigation?: any;
}

export function InventoryAlertsScreen({ navigation }: InventoryAlertsScreenProps) {
  const { data: alerts, isLoading, refetch, error } = useStockAlerts();
  const dismissAlert = useAcknowledgeAlert();

  console.log('[InventoryAlertsScreen] Alerts data:', alerts);
  console.log('[InventoryAlertsScreen] Loading:', isLoading);
  console.log('[InventoryAlertsScreen] Error:', error);
  
  const handleAlertAction = useCallback((alert: InventoryAlert) => {
    if (alert.itemId) {
      navigation?.navigate('ItemDetail', { id: alert.itemId });
    }
  }, [navigation]);
  
  const handleDismiss = useCallback((alertId: string) => {
    dismissAlert.mutate(alertId);
  }, [dismissAlert]);
  
  const renderAlert = useCallback(({ item }: { item: InventoryAlert }) => (
    <AlertCard
      alert={item}
      onDismiss={() => handleDismiss(item.id)}
      onAction={() => handleAlertAction(item)}
    />
  ), [handleDismiss, handleAlertAction]);
  
  const renderSectionHeader = useCallback(({ section }: any) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  ), []);
  
  const sections = [
    { 
      title: 'Critical', 
      data: alerts?.critical || [],
      testID: 'critical-section',
    },
    { 
      title: 'Warning', 
      data: alerts?.warning || [],
      testID: 'warning-section',
    },
    { 
      title: 'Info', 
      data: alerts?.info || [],
      testID: 'info-section',
    },
  ].filter(section => section.data.length > 0);
  
  if (!isLoading && sections.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No active alerts</Text>
        <Text style={styles.emptySubtext}>Your inventory is running smoothly</Text>
        {__DEV__ && (
          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              console.log('Running debug...');
              await debugInventoryAlerts();
              refetch();
            }}
          >
            <Text style={styles.debugButtonText}>Debug Alerts</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  
  return (
    <SectionList
      testID="alerts-list"
      sections={sections}
      renderSectionHeader={renderSectionHeader}
      renderItem={renderAlert}
      keyExtractor={item => item.id}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
        />
      }
      stickySectionHeadersEnabled={true}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  debugButton: {
    marginTop: 20,
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});