import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Screen, Text, Card, Button } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { spacing } from '../utils/theme';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <Card variant="elevated" style={styles.profileCard}>
          <Text variant="heading3" align="center">
            👤 Profile
          </Text>
          
          <View style={styles.infoRow}>
            <Text variant="label">Name:</Text>
            <Text variant="body">{user?.name}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text variant="label">Email:</Text>
            <Text variant="body">{user?.email}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text variant="label">Role:</Text>
            <Text variant="body" style={styles.roleText}>
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Customer'}
            </Text>
          </View>
        </Card>

        <Card variant="outlined" style={styles.actionsCard}>
          <Text variant="heading3">Account Actions</Text>
          
          <Button
            title="Edit Profile"
            variant="outline"
            onPress={() => {}}
            disabled
            style={styles.actionButton}
          />
          
          <Button
            title="Order History"
            variant="outline"
            onPress={() => {}}
            disabled
            style={styles.actionButton}
          />
          
          <Button
            title="Settings"
            variant="outline"
            onPress={() => {}}
            disabled
            style={styles.actionButton}
          />
        </Card>

        <Button
          title="Sign Out"
          variant="secondary"
          onPress={handleLogout}
          style={styles.logoutButton}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  profileCard: {
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  roleText: {
    textTransform: 'capitalize',
  },
  actionsCard: {
    marginBottom: spacing.lg,
  },
  actionButton: {
    marginTop: spacing.sm,
  },
  logoutButton: {
    marginTop: spacing.md,
  },
});
