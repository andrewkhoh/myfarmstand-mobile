import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Text, Card, Button } from '../../components';
import { useCurrentUser } from '../../hooks/useAuth';
import { spacing, colors } from '../../utils/theme';

type MarketingHubNavigationProp = StackNavigationProp<any, 'MarketingHub'>;

interface MenuItemProps {
  title: string;
  description: string;
  icon: string;
  screen: string;
  badge?: string;
  isNew?: boolean;
  onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ 
  title, 
  description, 
  icon, 
  badge,
  isNew,
  onPress 
}) => (
  <Card
    variant="outlined"
    style={styles.menuCard}
    onPress={onPress}
  >
    <View style={styles.menuItem}>
      <Text variant="heading1" style={styles.menuIcon}>{icon}</Text>
      <View style={styles.menuContent}>
        <View style={styles.titleRow}>
          <Text variant="heading3">{title}</Text>
          {isNew && (
            <View style={styles.newBadge}>
              <Text variant="caption" style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
          {badge && (
            <View style={styles.badge}>
              <Text variant="caption" style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text variant="body" color="secondary" style={styles.menuDescription}>
          {description}
        </Text>
      </View>
    </View>
  </Card>
);

export const MarketingHub: React.FC = () => {
  const navigation = useNavigation<MarketingHubNavigationProp>();
  const { data: user } = useCurrentUser();
  
  // Role-based access checks (case-insensitive)
  const userRole = user?.role?.toLowerCase();
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const isMarketing = userRole === 'marketing';
  const canAccessMarketing = isAdmin || isManager || isMarketing;
  
  const menuItems = [
    {
      title: 'Marketing Dashboard',
      description: 'Overview of marketing performance and metrics',
      icon: '📊',
      screen: 'MarketingDashboard',
      isNew: false
    },
    {
      title: 'Campaign Management',
      description: 'Create and manage marketing campaigns',
      icon: '📢',
      screen: 'CampaignManagement',
      badge: 'Active: 3'
    },
    {
      title: 'Campaign Planner',
      description: 'Plan and schedule future campaigns',
      icon: '📅',
      screen: 'CampaignPlanner',
      isNew: true
    },
    {
      title: 'Product Content',
      description: 'Manage product descriptions and media',
      icon: '📝',
      screen: 'ProductContent'
    },
    {
      title: 'Bundle Management',
      description: 'Create and manage product bundles',
      icon: '🎁',
      screen: 'BundleManagement',
      badge: 'Bundles: 5'
    },
    {
      title: 'Marketing Analytics',
      description: 'Detailed analytics and ROI tracking',
      icon: '📈',
      screen: 'MarketingAnalytics'
    }
  ];

  const quickActions = [
    {
      title: 'Create Campaign',
      icon: '➕',
      action: 'create-campaign'
    },
    {
      title: 'View Reports',
      icon: '📄',
      action: 'view-reports'
    },
    {
      title: 'Schedule Post',
      icon: '⏰',
      action: 'schedule-post'
    }
  ];

  const handleNavigate = (screen: string) => {
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

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'create-campaign':
        handleNavigate('CampaignManagement');
        break;
      case 'view-reports':
        handleNavigate('MarketingAnalytics');
        break;
      case 'schedule-post':
        handleNavigate('CampaignPlanner');
        break;
      default:
        Alert.alert('Action', `${action} triggered`);
    }
  };

  if (!canAccessMarketing) {
    return (
      <Screen>
        <View style={styles.accessDenied}>
          <Card variant="outlined" style={styles.accessCard}>
            <Text variant="heading2" style={styles.accessIcon}>🔒</Text>
            <Text variant="heading3" align="center">Access Restricted</Text>
            <Text variant="body" color="secondary" align="center" style={styles.accessText}>
              Marketing features are available for admin, manager, and marketing roles only.
            </Text>
            <Button
              title="Go Back"
              variant="primary"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Card variant="elevated" style={styles.header}>
          <Text variant="heading2">📢 Marketing Tools</Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            Campaigns, content, and customer engagement
          </Text>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text variant="heading3" style={styles.sectionTitle}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <Button
                key={index}
                title={`${action.icon} ${action.title}`}
                variant="outline"
                onPress={() => handleQuickAction(action.action)}
                style={styles.quickActionButton}
              />
            ))}
          </View>
        </View>

        {/* Marketing Stats Summary */}
        <Card variant="outlined" style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="heading3">12</Text>
              <Text variant="caption" color="secondary">Active Campaigns</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="heading3">847</Text>
              <Text variant="caption" color="secondary">Total Reach</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="heading3">23%</Text>
              <Text variant="caption" color="secondary">Conversion Rate</Text>
            </View>
          </View>
        </Card>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text variant="heading3" style={styles.sectionTitle}>
            Marketing Modules
          </Text>
          {menuItems.map((item) => (
            <MenuItem
              key={item.screen}
              title={item.title}
              description={item.description}
              icon={item.icon}
              screen={item.screen}
              badge={item.badge}
              isNew={item.isNew}
              onPress={() => handleNavigate(item.screen)}
            />
          ))}
        </View>

        {/* Tips Section */}
        <Card variant="outlined" style={styles.tipsCard}>
          <Text variant="heading3" style={styles.tipsTitle}>💡 Marketing Tips</Text>
          <Text variant="body" color="secondary" style={styles.tipText}>
            • Bundle products to increase average order value
          </Text>
          <Text variant="body" color="secondary" style={styles.tipText}>
            • Schedule campaigns during peak customer hours
          </Text>
          <Text variant="body" color="secondary" style={styles.tipText}>
            • Use analytics to optimize campaign performance
          </Text>
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
  header: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  quickActionsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    marginHorizontal: spacing.xs / 2,
  },
  statsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.light,
  },
  menuSection: {
    marginBottom: spacing.lg,
  },
  menuCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
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
  badge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
    marginLeft: spacing.xs,
  },
  badgeText: {
    color: colors.primary[600],
    fontSize: 10,
    fontWeight: '600',
  },
  newBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
    marginLeft: spacing.xs,
  },
  newBadgeText: {
    color: colors.text.inverse,
    fontSize: 10,
    fontWeight: '600',
  },
  tipsCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  tipsTitle: {
    marginBottom: spacing.md,
  },
  tipText: {
    marginBottom: spacing.xs,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  accessCard: {
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  accessIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  accessText: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: {
    marginTop: spacing.md,
  },
});