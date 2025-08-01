import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Text, Card, Button } from '../components';
import { useCart } from '../contexts/CartContext';
import { spacing } from '../utils/theme';

export const CartScreen: React.FC = () => {
  const { items, total } = useCart();

  if (items.length === 0) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          <Text variant="heading3" align="center">
            🛒 Your cart is empty
          </Text>
          <Text variant="body" color="secondary" align="center" style={styles.emptyText}>
            Add some fresh produce to get started!
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <Card variant="elevated" style={styles.summaryCard}>
          <Text variant="heading3">Order Summary</Text>
          <View style={styles.totalRow}>
            <Text variant="body">Total:</Text>
            <Text variant="heading3">${total.toFixed(2)}</Text>
          </View>
        </Card>

        <Button
          title="Proceed to Checkout"
          onPress={() => {}}
          disabled
          style={styles.checkoutButton}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.md,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  checkoutButton: {
    marginTop: spacing.md,
  },
});
