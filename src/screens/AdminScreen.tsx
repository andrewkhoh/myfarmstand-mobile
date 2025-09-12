import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Text, Card, Button } from '../components';
import { useCurrentUser } from '../hooks/useAuth';
import { spacing, colors } from '../utils/theme';
import { AdminStackParamList } from '../navigation/AdminStackNavigator';

type AdminScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'AdminDashboard'>;

export const AdminScreen: React.FC = () => {
  const { data: user } = useCurrentUser();
  const navigation = useNavigation<AdminScreenNavigationProp>();
  
  // Role-based visibility helpers (case-insensitive)
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isManager = user?.role?.toLowerCase() === 'manager';
  const isStaff = user?.role?.toLowerCase() === 'staff';
  const isMarketing = user?.role?.toLowerCase() === 'marketing';
  const canSeeExecutive = isAdmin || isManager;
  const canSeeMarketing = isAdmin || isManager || isMarketing;
  const canSeeInventory = isAdmin || isManager || isStaff;

  return (
    <Screen scrollable>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Welcome Card */}
        <Card variant="elevated" style={styles.welcomeCard}>
          <Text variant="heading3" align="center">
            ⚙️ Admin Dashboard
          </Text>
          <Text variant="body" color="secondary" align="center" style={styles.subtitle}>
            Welcome, {user?.name}
          </Text>
          <Text variant="caption" color="tertiary" align="center" style={styles.roleText}>
            Role: {user?.role?.toUpperCase() || 'UNKNOWN'}
          </Text>
        </Card>

        {/* Core Operations Section */}
        <Card variant="outlined" style={styles.sectionCard}>
          <Text variant="heading3" style={styles.sectionTitle}>
            📦 Core Operations
          </Text>
          
          {canSeeInventory && (
            <Button
              title="📦 Inventory Management"
              variant="primary"
              onPress={() => navigation.navigate('InventoryHub')}
              style={styles.featureButton}
            />
          )}
          
          <Button
            title="🏷️ Product Management"
            variant="primary"
            onPress={() => navigation.navigate('ProductManagement')}
            style={styles.featureButton}
          />
          
          <Button
            title="📋 Order Management"
            variant="primary"
            onPress={() => navigation.navigate('AdminOrders')}
            style={styles.featureButton}
          />
        </Card>

        {/* Analytics & Insights Section - Role Restricted */}
        {canSeeExecutive && (
          <Card variant="outlined" style={styles.sectionCard}>
            <Text variant="heading3" style={styles.sectionTitle}>
              📊 Analytics & Insights
            </Text>
            
            <Button
              title="📊 Executive Analytics"
              variant="primary"
              onPress={() => navigation.navigate('ExecutiveHub')}
              style={styles.featureButton}
            />
            
            {isAdmin && (
              <Text variant="caption" color="secondary" style={styles.accessNote}>
                Full access to all metrics and forecasts
              </Text>
            )}
            {isManager && !isAdmin && (
              <Text variant="caption" color="secondary" style={styles.accessNote}>
                Access to team performance and department metrics
              </Text>
            )}
          </Card>
        )}

        {/* Marketing & Growth Section - Role Restricted */}
        {canSeeMarketing && (
          <Card variant="outlined" style={styles.sectionCard}>
            <Text variant="heading3" style={styles.sectionTitle}>
              📢 Marketing & Growth
            </Text>
            
            <Button
              title="📢 Marketing Tools"
              variant="primary"
              onPress={() => navigation.navigate('MarketingHub')}
              style={styles.featureButton}
            />
            
            <Text variant="caption" color="secondary" style={styles.accessNote}>
              Campaigns, content, bundles, and customer engagement
            </Text>
          </Card>
        )}

        {/* Quick Actions Section */}
        <Card variant="outlined" style={styles.sectionCard}>
          <Text variant="heading3" style={styles.sectionTitle}>
            ⚡ Quick Actions
          </Text>
          
          <View style={styles.quickActionsGrid}>
            <Button
              title="➕ Add Product"
              variant="outline"
              onPress={() => navigation.navigate('ProductCreateEdit', {})}
              style={styles.quickActionButton}
            />
            
            <Button
              title="📊 Today's Sales"
              variant="outline"
              onPress={() => canSeeExecutive ? navigation.navigate('ExecutiveDashboard') : null}
              disabled={!canSeeExecutive}
              style={styles.quickActionButton}
            />
          </View>
        </Card>

        {/* Access Level Info */}
        <Card variant="outlined" style={styles.infoCard}>
          <Text variant="heading3" style={styles.infoTitle}>
            ℹ️ Your Access Level
          </Text>
          <Text variant="body" color="secondary" style={styles.infoText}>
            As {user?.role === 'admin' ? 'an' : 'a'} <Text style={styles.bold}>{user?.role}</Text>, you have access to:
          </Text>
          <View style={styles.accessList}>
            {canSeeInventory && (
              <Text variant="body" color="secondary" style={styles.accessItem}>
                • Inventory management and stock control
              </Text>
            )}
            {canSeeExecutive && (
              <Text variant="body" color="secondary" style={styles.accessItem}>
                • Executive analytics and business insights
              </Text>
            )}
            {canSeeMarketing && (
              <Text variant="body" color="secondary" style={styles.accessItem}>
                • Marketing campaigns and customer engagement
              </Text>
            )}
            <Text variant="body" color="secondary" style={styles.accessItem}>
              • Product and order management
            </Text>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  welcomeCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
  roleText: {
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  sectionCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  featureButton: {
    marginTop: spacing.sm,
  },
  accessNote: {
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
    fontStyle: 'italic',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  quickActionButton: {
    flex: 1,
    marginHorizontal: spacing.xs / 2,
  },
  infoCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  infoTitle: {
    marginBottom: spacing.sm,
  },
  infoText: {
    marginBottom: spacing.sm,
  },
  accessList: {
    marginTop: spacing.xs,
  },
  accessItem: {
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
  },
  bold: {
    fontWeight: '600',
    color: colors.primary[600],
  },
});
