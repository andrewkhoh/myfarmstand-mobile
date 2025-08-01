import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Text, Card, Button } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { spacing } from '../utils/theme';

export const AdminScreen: React.FC = () => {
  const { user } = useAuth();

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <Card variant="elevated" style={styles.welcomeCard}>
          <Text variant="heading3" align="center">
            ⚙️ Admin Dashboard
          </Text>
          <Text variant="body" color="secondary" align="center" style={styles.subtitle}>
            Welcome, {user?.name}
          </Text>
        </Card>

        <Card variant="outlined" style={styles.featuresCard}>
          <Text variant="heading3">Management Features</Text>
          
          <Button
            title="Inventory Management"
            variant="outline"
            onPress={() => {}}
            disabled
            style={styles.featureButton}
          />
          
          <Button
            title="Order Management"
            variant="outline"
            onPress={() => {}}
            disabled
            style={styles.featureButton}
          />
          
          <Button
            title="Customer Management"
            variant="outline"
            onPress={() => {}}
            disabled
            style={styles.featureButton}
          />
          
          <Button
            title="Analytics & Reports"
            variant="outline"
            onPress={() => {}}
            disabled
            style={styles.featureButton}
          />
          
          <Button
            title="Bundle Management"
            variant="outline"
            onPress={() => {}}
            disabled
            style={styles.featureButton}
          />
        </Card>

        <Card variant="outlined" style={styles.quickStatsCard}>
          <Text variant="heading3">Quick Stats</Text>
          <Text variant="body" color="secondary" style={styles.comingSoon}>
            Real-time business metrics coming soon...
          </Text>
        </Card>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  welcomeCard: {
    marginBottom: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
  featuresCard: {
    marginBottom: spacing.lg,
  },
  featureButton: {
    marginTop: spacing.sm,
  },
  quickStatsCard: {
    marginBottom: spacing.lg,
  },
  comingSoon: {
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
