import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Content } from '../../types/marketing.types';

interface ContentCardProps {
  content: Content;
  onPress?: (content: Content) => void;
}

export const ContentCard = React.memo(({ content, onPress }: ContentCardProps) => {
  return (
    <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="{content.title}"
      testID={`content-card-${content.id}`}
      style={styles.container}
      onPress={() => onPress?.(content)}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{content.title}</Text>
        <View style={[styles.typeBadge, styles[content.type]]}>
          <Text style={styles.typeText}>{content.type}</Text>
        </View>
      </View>
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, styles[content.status]]}>
          <Text style={styles.statusText}>{content.status}</Text>
        </View>
        {content.publishedAt && (
          <Text style={styles.publishedDate}>
            Published: {new Date(content.publishedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
      {content.metadata?.tags && (
        <View style={styles.tags}>
          {content.metadata.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return prevProps.content.id === nextProps.content.id &&
         prevProps.content.updatedAt === nextProps.content.updatedAt;
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  blog: {
    backgroundColor: '#673AB7',
  },
  video: {
    backgroundColor: '#F44336',
  },
  social: {
    backgroundColor: '#2196F3',
  },
  email: {
    backgroundColor: '#FF9800',
  },
  landing: {
    backgroundColor: '#4CAF50',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  draft: {
    backgroundColor: '#f0f0f0',
  },
  review: {
    backgroundColor: '#fff3cd',
  },
  approved: {
    backgroundColor: '#d4edda',
  },
  published: {
    backgroundColor: '#d1ecf1',
  },
  publishedDate: {
    fontSize: 12,
    color: '#666',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#1976d2',
  },
});
