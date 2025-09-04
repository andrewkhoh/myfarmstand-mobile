import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { useProductBundles } from '@/hooks/marketing/useProductBundles';

interface BundleManagementScreenProps {
  navigation: any;
}

export function BundleManagementScreen({ navigation }: BundleManagementScreenProps) {
  const { bundles, isLoading, deleteBundle, toggleBundleActive, refetch } = useProductBundles();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price'>('name');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch?.();
    setRefreshing(false);
  }, [refetch]);

  const handleDelete = useCallback((bundleId: string) => {
    deleteBundle?.(bundleId);
  }, [deleteBundle]);

  const handleToggleActive = useCallback((bundleId: string, value: boolean) => {
    toggleBundleActive?.(bundleId, value);
  }, [toggleBundleActive]);

  const filteredBundles = bundles
    ?.filter(bundle => 
      bundle.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    ?.sort((a, b) => {
      if (sortBy === 'price') {
        return a.price - b.price;
      }
      return a.name.localeCompare(b.name);
    });

  const renderBundle = ({ item }: any) => (
    <View testID={`bundle-card-${item.id}`} style={styles.bundleCard}>
      <View style={styles.bundleHeader}>
        <Text style={styles.bundleName}>{item.name}</Text>
        <Switch
          testID={`toggle-active-${item.id}`}
          value={item.isActive}
          onValueChange={(value) => handleToggleActive(item.id, value)}
        />
      </View>
      <Text style={styles.bundlePrice}>${item.price.toFixed(2)}</Text>
      <Text style={styles.productCount}>{item.products.length} products</Text>
      {item.savings && (
        <Text style={styles.savings}>Save ${item.savings.toFixed(2)}</Text>
      )}
      <View style={styles.bundleActions}>
        <TouchableOpacity
          testID={`edit-bundle-${item.id}`}
          style={styles.actionButton}
          onPress={() => navigation.navigate('EditBundle', { bundleId: item.id })}
        >
          <Text>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={`delete-bundle-${item.id}`}
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator testID="loading-indicator" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search bundles..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          testID="sort-by-price"
          style={styles.sortButton}
          onPress={() => setSortBy(sortBy === 'name' ? 'price' : 'name')}
        >
          <Text>Sort by {sortBy}</Text>
        </TouchableOpacity>
      </View>

      {filteredBundles && filteredBundles.length > 0 ? (
        <FlatList
          testID="bundle-list"
          data={filteredBundles}
          keyExtractor={item => item.id}
          renderItem={renderBundle}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No bundles created yet</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateBundle')}
      >
        <Text style={styles.createButtonText}>Create Bundle</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginRight: 8,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  bundleCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  bundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bundleName: {
    fontSize: 18,
    fontWeight: '600',
  },
  bundlePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginVertical: 4,
  },
  productCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  savings: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginVertical: 4,
  },
  bundleActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    marginRight: 8,
  },
  deleteButton: {
    borderColor: '#f44336',
  },
  deleteText: {
    color: '#f44336',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  createButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});