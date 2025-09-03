import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert
} from 'react-native';
import { marketingService } from '../../services/marketing/marketingService';
import { workflowService } from '../../services/marketing/workflowService';
import { Content } from '../../types/marketing.types';
import { MarketingCampaign, MarketingContent, CampaignFilter, Product, ProductBundle, WorkflowState, WorkflowConfig, WorkflowResult, WorkflowContext, CalendarEvent } from '@/schemas/marketing';


interface ProductContentScreenProps {
  contentId?: string;
}

export const ProductContentScreen: React.FC<ProductContentScreenProps> = ({ contentId }) => {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [showMediaGallery, setShowMediaGallery] = useState(false);

  // New content form state
  const [newContent, setNewContent] = useState<Omit<Content, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    type: 'blog' as const,
    status: 'draft' as const,
    body: '',
    metadata: {
      tags: [],
      category: '',
      seoTitle: '',
      seoDescription: '',
      keywords: [],
      targetAudience: []
    },
    campaignId: '',
    authorId: 'author1'
  });

  useEffect(() => {
    loadContent();
    if (contentId) {
      loadWorkflowState();
    }
  }, [contentId]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const data = await marketingService.getContent();
      setContent(data);
    } catch (error) {
      console.error('Operation failed:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflowState = async () => {
    if (!contentId) return;
    try {
      const state = await workflowService.getWorkflowState(contentId);
      setWorkflowState(state);
    } catch (error) {
      console.error('Operation failed:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    }
  };

  const handleCreateContent = async () => {
    try {
      const created = await marketingService.createContent(newContent);
      setContent([...content, created]);
      setIsCreating(false);
      resetNewContent();
    } catch (error) {
      console.error('Error creating content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create content';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleDeleteContent = async (id: string) => {
    try {
      await marketingService.deleteContent(id);
      setContent(content.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete content';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleTransition = async (toState: string) => {
    if (!workflowState) return;
    try {
      const updated = await workflowService.transitionState(workflowState.id, toState);
      setWorkflowState(updated);
    } catch (error) {
      console.error('Error transitioning workflow state:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to transition state';
      Alert.alert('Error', errorMessage);
    }
  };

  const resetNewContent = () => {
    setNewContent({
      title: '',
      type: 'blog' as const,
      status: 'draft' as const,
      body: '',
      metadata: {
        tags: [],
        category: '',
        seoTitle: '',
        seoDescription: '',
        keywords: [],
        targetAudience: []
      },
      campaignId: '',
      authorId: 'author1'
    });
  };

  const filteredContent = (content || []).filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <View style={styles.centered} testID="loading-state">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isCreating) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create New Content</Text>
          <TouchableOpacity 
            onPress={() => setIsCreating(false)}
            accessibilityRole="button"
            accessibilityLabel="Cancel">
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Content Title"
          value={newContent.title}
          onChangeText={(text) => setNewContent({...newContent, title: text})}
        />

        <View testID="rich-text-editor" style={styles.richTextEditor}>
          <View style={styles.formatBar}>
            <TouchableOpacity 
              testID="format-bold" 
              style={styles.formatButton}
              accessibilityRole="button"
              accessibilityLabel="B">
              <Text style={styles.formatButtonText}>B</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              testID="format-italic" 
              style={styles.formatButton}
              accessibilityRole="button"
              accessibilityLabel="I">
              <Text style={[styles.formatButtonText, styles.italic]}>I</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              testID="format-link" 
              style={styles.formatButton}
              accessibilityRole="button"
              accessibilityLabel="Link">
              <Text style={styles.formatButtonText}>🔗</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.bodyInput}
            placeholder="Content Body"
            value={newContent.body}
            onChangeText={(text) => setNewContent({...newContent, body: text})}
            multiline
          />
        </View>

        <TouchableOpacity 
          testID="upload-media-button"
          style={styles.button}
          onPress={() => setShowMediaGallery(true)}
          accessibilityRole="button"
          accessibilityLabel="Upload Media"
        >
          <Text style={styles.buttonText}>Upload Media</Text>
        </TouchableOpacity>

        {showMediaGallery && (
          <View testID="media-gallery" style={styles.mediaGallery}>
            <Text>Media Gallery</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="SEO Title"
          value={newContent.metadata?.seoTitle || ''}
          onChangeText={(text) => setNewContent({
            ...newContent,
            metadata: {
              tags: newContent.metadata?.tags || [],
              category: newContent.metadata?.category || '',
              seoTitle: text,
              seoDescription: newContent.metadata?.seoDescription || '',
              keywords: newContent.metadata?.keywords || [],
              targetAudience: newContent.metadata?.targetAudience || []
            }
          })}
        />

        <TextInput
          style={styles.input}
          placeholder="SEO Description"
          value={newContent.metadata?.seoDescription || ''}
          onChangeText={(text) => setNewContent({
            ...newContent,
            metadata: {
              tags: newContent.metadata?.tags || [],
              category: newContent.metadata?.category || '',
              seoTitle: newContent.metadata?.seoTitle || '',
              seoDescription: text,
              keywords: newContent.metadata?.keywords || [],
              targetAudience: newContent.metadata?.targetAudience || []
            }
          })}
        />

        <TouchableOpacity 
          testID="submit-content-button"
          style={styles.primaryButton}
          onPress={handleCreateContent}
          accessibilityRole="button"
          accessibilityLabel="Create Content"
        >
          <Text style={styles.buttonText}>Create Content</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container} testID="product-content-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Product Content</Text>
        <TouchableOpacity 
          testID="create-content-button"
          style={styles.button}
          onPress={() => setIsCreating(true)}
          accessibilityRole="button"
          accessibilityLabel="Create Content"
        >
          <Text style={styles.buttonText}>Create Content</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search content..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <View style={styles.filterBar}>
        <TouchableOpacity 
          style={[styles.filterButton, filterStatus === 'all' && styles.activeFilter]}
          onPress={() => setFilterStatus('all')}
          accessibilityRole="button"
          accessibilityLabel="All"
        >
          <Text>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          testID="filter-published"
          style={[styles.filterButton, filterStatus === 'published' && styles.activeFilter]}
          onPress={() => setFilterStatus('published')}
          accessibilityRole="button"
          accessibilityLabel="Published"
        >
          <Text>Published</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterButton, filterStatus === 'draft' && styles.activeFilter]}
          onPress={() => setFilterStatus('draft')}
          accessibilityRole="button"
          accessibilityLabel="Draft"
        >
          <Text>Draft</Text>
        </TouchableOpacity>
      </View>

      {workflowState && (
        <View testID="workflow-state" style={styles.workflowContainer}>
          <Text style={styles.workflowTitle}>Workflow State</Text>
          <View testID={`workflow-state-${workflowState.current_state}`}>
            <Text>Current: {workflowState.current_state}</Text>
            {workflowState.current_state === 'draft' && (
              <TouchableOpacity 
                testID="transition-to-review"
                style={styles.button}
                onPress={() => handleTransition('review')}
                accessibilityRole="button"
                accessibilityLabel="Send to Review"
              >
                <Text style={styles.buttonText}>Send to Review</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={filteredContent}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View testID={`content-item-${item.id}`} style={styles.contentItem}>
            <View style={styles.contentHeader}>
              <Text style={styles.contentTitle}>{item.title}</Text>
              <Text style={styles.contentStatus}>{item.status}</Text>
            </View>
            
            {item.metadata?.seoTitle && (
              <Text style={styles.seoTitle}>{item.metadata.seoTitle}</Text>
            )}
            
            <View style={styles.tagContainer}>
              {item.metadata?.tags?.map((tag, index) => (
                <Text key={index} style={styles.tag}>{tag}</Text>
              ))}
            </View>
            
            <Text style={styles.contentBody} numberOfLines={2}>{item.body}</Text>
            
            <TouchableOpacity 
              testID={`delete-content-${item.id}`}
              style={styles.deleteButton}
              onPress={() => handleDeleteContent(item.id)}
              accessibilityRole="button"
              accessibilityLabel="Delete"
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text>No content found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchInput: {
    margin: 16,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeFilter: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  contentItem: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  contentStatus: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  seoTitle: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
  },
  contentBody: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
    fontSize: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  deleteButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#FF3B30',
  },
  input: {
    margin: 16,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  bodyInput: {
    padding: 12,
    minHeight: 200,
    textAlignVertical: 'top',
  },
  workflowContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  workflowTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  richTextEditor: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  formatBar: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  formatButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  formatButtonText: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  mediaGallery: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    minHeight: 100,
  },
});