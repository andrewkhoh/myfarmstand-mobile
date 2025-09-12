import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SectionProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  title,
  actionLabel,
  onActionPress,
  children
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {actionLabel && (
          <TouchableOpacity onPress={onActionPress} style={styles.action}>
            <Text style={styles.actionText}>{actionLabel}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#2196F3" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#2196F3',
    marginRight: 4,
  },
  content: {
    
  },
});