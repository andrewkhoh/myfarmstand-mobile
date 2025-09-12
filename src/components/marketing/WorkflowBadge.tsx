import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface WorkflowBadgeProps {
  status: 'draft' | 'review' | 'approved' | 'published';
  size?: 'small' | 'medium' | 'large';
}

export const WorkflowBadge: React.FC<WorkflowBadgeProps> = ({
  status,
  size = 'medium'
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'draft':
        return { color: '#757575', icon: 'file-document-outline', label: 'Draft' };
      case 'review':
        return { color: '#FF9800', icon: 'eye-outline', label: 'In Review' };
      case 'approved':
        return { color: '#4CAF50', icon: 'check-circle-outline', label: 'Approved' };
      case 'published':
        return { color: '#2196F3', icon: 'earth', label: 'Published' };
      default:
        return { color: '#757575', icon: 'help-circle-outline', label: 'Unknown' };
    }
  };

  const config = getStatusConfig();
  const sizeStyles = {
    small: { fontSize: 10, iconSize: 12, padding: 4 },
    medium: { fontSize: 12, iconSize: 16, padding: 6 },
    large: { fontSize: 14, iconSize: 20, padding: 8 },
  };

  const currentSize = sizeStyles[size];

  return (
    <View style={[styles.container, { backgroundColor: config.color, padding: currentSize.padding }]}>
      <MaterialCommunityIcons
        name={config.icon as any}
        size={currentSize.iconSize}
        color="#fff"
      />
      <Text style={[styles.label, { fontSize: currentSize.fontSize }]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 8,
  },
  label: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
});