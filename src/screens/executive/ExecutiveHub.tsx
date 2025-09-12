import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Text, Card, Button, KPIGrid, KPICard } from '../../components';
import { useCurrentUser } from '../../hooks/useAuth';
import { useSimpleBusinessMetrics } from '../../hooks/executive/useSimpleBusinessMetrics';
import { spacing, colors } from '../../utils/theme';

type ExecutiveHubNavigationProp = StackNavigationProp<any, 'ExecutiveHub'>;

interface MenuItemProps {
  title: string;
  description: string;
  icon: string;
  screen: string;
  isEnabled: boolean;
  onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ 
  title, 
  description, 
  icon, 
  isEnabled, 
  onPress 
}) => (
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
          <Text variant="heading3" style={!isEnabled && styles.disabledText}>
            {title}
          </Text>
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

export const ExecutiveHub: React.FC = () => {
  const navigation = useNavigation<ExecutiveHubNavigationProp>();
  const { data: user } = useCurrentUser();
  const { data: metrics, isLoading, error } = useSimpleBusinessMetrics();
  
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isExecutive = user?.role?.toLowerCase() === 'executive';
  const isManager = user?.role?.toLowerCase() === 'manager';
  // High security: Executive + Admin only
  const canAccessExecutiveFeatures = isAdmin || isExecutive;
  // Standard security: Executive + Admin + Manager  
  const canAccessManagerFeatures = isAdmin || isExecutive || isManager;
  
  // Quick KPI Summary for the hub
  const quickMetrics = React.useMemo(() => {
    if (!metrics) return [];
    
    return [
      { 
        label: 'Revenue (Today)', 
        value: `$${metrics.revenue?.toLocaleString() || '0'}`,
        trend: metrics.revenueTrend,
        icon: '💰'
      },
      { 
        label: 'Orders', 
        value: metrics.orderCount?.toString() || '0',
        trend: metrics.orderTrend,
        icon: '📦'
      },
      { 
        label: 'Customers', 
        value: metrics.customerCount?.toString() || '0',
        trend: metrics.customerTrend,
        icon: '👥'
      },
      { 
        label: 'Avg Order Value', 
        value: `$${metrics.avgOrderValue?.toFixed(2) || '0'}`,
        trend: metrics.avgOrderTrend,
        icon: '📊'
      }
    ];
  }, [metrics]);
  
  const menuItems = [
    {
      title: 'Executive Dashboard',
      description: 'High-level KPIs and business metrics',
      icon: '📊',
      screen: 'ExecutiveDashboard',
      minRole: 'executive',
      isEnabled: canAccessExecutiveFeatures
    },
    {
      title: 'Revenue Insights',
      description: 'Revenue analysis and trends',
      icon: '💰',
      screen: 'RevenueInsights',
      minRole: 'executive',
      isEnabled: canAccessExecutiveFeatures
    },
    {
      title: 'Customer Analytics',
      description: 'Customer behavior and segmentation',
      icon: '👥',
      screen: 'CustomerAnalytics',
      minRole: 'manager',
      isEnabled: canAccessManagerFeatures
    },
    {
      title: 'Performance Analytics',
      description: 'Operational performance metrics',
      icon: '📈',
      screen: 'PerformanceAnalytics',
      minRole: 'manager',
      isEnabled: canAccessManagerFeatures
    },
    {
      title: 'Inventory Overview',
      description: 'Executive inventory summary',
      icon: '📦',
      screen: 'InventoryOverview',
      minRole: 'manager',
      isEnabled: canAccessManagerFeatures
    }
  ];

  const handleNavigate = (screen: string) => {
    try {
      navigation.navigate(screen as never);
    } catch (err) {
      console.warn(`Screen ${screen} not yet implemented`);
    }
  };

  return (
    <Screen scrollable>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Card variant="elevated" style={styles.header}>
          <Text variant="heading2">📊 Executive Analytics</Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Strategic insights and business intelligence
          </Text>
          <Text variant="caption" color="tertiary" style={styles.roleText}>
            Access Level: {user?.role?.toUpperCase() || 'UNKNOWN'}
          </Text>
        </Card>

        {/* Live KPI Summary */}
        {!isLoading && !error && quickMetrics.length > 0 && (
          <View style={styles.kpiSection}>
            <Text variant="heading3" style={styles.sectionTitle}>
              Today's Performance
            </Text>
            <View style={styles.kpiGrid}>
              {quickMetrics.map((metric, index) => (
                <View key={index} style={styles.kpiCard}>
                  <KPICard
                    title={metric.label}
                    value={metric.value}
                    trend={metric.trend}
                    icon={metric.icon}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Loading State for Metrics */}
        {isLoading && (
          <Card variant="outlined" style={styles.loadingCard}>
            <ActivityIndicator size="small" color={colors.primary[600]} />
            <Text variant="body" color="secondary" style={styles.loadingText}>
              Loading metrics...
            </Text>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card variant="outlined" style={styles.errorCard}>
            <Text variant="body" color="error">
              Unable to load metrics. Showing menu only.
            </Text>
          </Card>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text variant="heading3" style={styles.sectionTitle}>
            Analytics Modules
          </Text>
          {menuItems.map((item) => (
            <MenuItem
              key={item.screen}
              title={item.title}
              description={item.description}
              icon={item.icon}
              screen={item.screen}
              isEnabled={item.isEnabled}
              onPress={() => handleNavigate(item.screen)}
            />
          ))}
        </View>

        {/* Access Notice for Limited Roles */}
        {!canAccessManagerFeatures && (
          <Card variant="outlined" style={styles.noticeCard}>
            <Text variant="body" color="secondary">
              ℹ️ Executive analytics require manager, admin, or executive access
            </Text>
          </Card>
        )}
        {canAccessManagerFeatures && !canAccessExecutiveFeatures && (
          <Card variant="outlined" style={styles.noticeCard}>
            <Text variant="body" color="secondary">
              ℹ️ Some premium features require admin or executive access
            </Text>
          </Card>
        )}
      </ScrollView>
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
  kpiSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: '48%',
    marginBottom: spacing.md,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  loadingText: {
    marginLeft: spacing.sm,
  },
  errorCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  menuSection: {
    marginBottom: spacing.lg,
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
  menuDescription: {
    marginTop: spacing.xs,
  },
  disabledText: {
    color: colors.text.tertiary,
  },
  noticeCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
});