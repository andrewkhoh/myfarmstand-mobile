import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ContentItemProps {
  title: string;
  type: 'post' | 'story' | 'reel' | 'email';
  status: 'draft' | 'scheduled' | 'published';
  scheduledDate?: string;
  thumbnail?: string;
  onPress?: () => void;
}

export const ContentItem: React.FC<ContentItemProps> = ({
  title,
  type,
  status,
  scheduledDate,
  thumbnail,
  onPress
}) => {
  const getTypeIcon = () => {
    switch (type) {
      case 'post': return 'image-outline';
      case 'story': return 'clock-outline';
      case 'reel': return 'movie-outline';
      case 'email': return 'email-outline';
      default: return 'file-outline';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'published': return '#4CAF50';
      case 'scheduled': return '#2196F3';
      case 'draft': return '#757575';
      default: return '#757575';
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
            <MaterialCommunityIcons name={getTypeIcon()} size={24} color="#999" />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <View style={styles.meta}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{status.toUpperCase()}</Text>
            </View>
            {scheduledDate && (
              <Text style={styles.date}>{scheduledDate}</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    padding: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 12,
  },
  placeholderThumbnail: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
});