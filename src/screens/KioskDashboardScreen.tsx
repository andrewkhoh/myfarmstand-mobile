import React, { useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Screen, Text, Button, Card } from '../components';
import { useKioskSession, useKioskSessionOperations } from '../hooks/useKiosk';
import { spacing } from '../utils/theme';

type KioskDashboardRouteParams = {
  sessionId: string;
  staffId: string;
  staffName: string;
};

type KioskDashboardRouteProp = RouteProp<
  { KioskDashboard: KioskDashboardRouteParams },
  'KioskDashboard'
>;

export const KioskDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<KioskDashboardRouteProp>();
  const { sessionId, staffId, staffName } = route.params;
  
  const sessionQuery = useKioskSession(sessionId);
  const sessionOps = useKioskSessionOperations();

  useEffect(() => {
    if (sessionQuery.data?.success === false) {
      Alert.alert('Session Error', 'Unable to load session data', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
  }, [sessionQuery.data, navigation]);

  const handleEndSession = async () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this kiosk session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await sessionOps.endSession.mutateAsync(sessionId);
              if (result.success) {
                Alert.alert('Session Ended', 'Kiosk session has been ended successfully', [
                  { text: 'OK', onPress: () => navigation.navigate('Login' as never) }
                ]);
              } else {
                Alert.alert('Error', result.message || 'Failed to end session');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to end session');
            }
          }
        }
      ]
    );
  };

  const navigateToShopping = () => {
    navigation.navigate('KioskShopping' as never, { 
      sessionId,
      staffId,
      staffName 
    } as never);
  };

  const session = sessionQuery.data?.session;

  return (
    <Screen padding>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="heading1" align="center">
            Kiosk Mode
          </Text>
          <Text variant="body" color="secondary" align="center" style={styles.subtitle}>
            Welcome, {staffName}
          </Text>
        </View>

        {/* Session Info Card */}
        <Card variant="elevated" style={styles.sessionCard}>
          <Text variant="heading2" style={styles.sectionTitle}>
            Session Information
          </Text>
          
          <View style={styles.infoRow}>
            <Text variant="body" style={styles.infoLabel}>Staff:</Text>
            <Text variant="body" style={styles.infoValue}>{staffName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text variant="body" style={styles.infoLabel}>Session ID:</Text>
            <Text variant="body" style={styles.infoValue}>
              {sessionId.slice(0, 8)}...
            </Text>
          </View>
          
          {session && (
            <>
              <View style={styles.infoRow}>
                <Text variant="body" style={styles.infoLabel}>Started:</Text>
                <Text variant="body" style={styles.infoValue}>
                  {new Date(session.sessionStart).toLocaleTimeString()}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text variant="body" style={styles.infoLabel}>Total Sales:</Text>
                <Text variant="body" style={styles.infoValue}>
                  ${session.totalSales.toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text variant="body" style={styles.infoLabel}>Transactions:</Text>
                <Text variant="body" style={styles.infoValue}>
                  {session.transactionCount}
                </Text>
              </View>
            </>
          )}
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Button
            title="Start Shopping"
            onPress={navigateToShopping}
            style={styles.primaryButton}
            disabled={!session?.isActive}
          />
          
          <Button
            title="View Transactions"
            variant="outline"
            onPress={() => {
              navigation.navigate('KioskTransactions' as never, { sessionId } as never);
            }}
            style={styles.secondaryButton}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="End Session"
            variant="outline"
            onPress={handleEndSession}
            loading={sessionOps.endSession.isPending}
            style={styles.endSessionButton}
          />
        </View>

        {/* Loading State */}
        {sessionQuery.isLoading && (
          <Text variant="body" color="secondary" align="center">
            Loading session...
          </Text>
        )}

        {/* Error State */}
        {sessionQuery.isError && (
          <Text variant="body" color="error" align="center">
            Failed to load session data
          </Text>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
  sessionCard: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    color: '#374151',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontWeight: '500',
    color: '#6B7280',
  },
  infoValue: {
    fontWeight: '600',
    color: '#111827',
  },
  actionContainer: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  primaryButton: {
    marginBottom: spacing.sm,
  },
  secondaryButton: {
    marginBottom: spacing.sm,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
  },
  endSessionButton: {
    borderColor: '#EF4444',
  },
});