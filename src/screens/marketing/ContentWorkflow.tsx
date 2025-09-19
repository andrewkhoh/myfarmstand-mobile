import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert
} from 'react-native';
import {
  useContentItems,
  useUpdateContentStage,
  useBulkUpdateContentStage,
  useCreateContent
} from '../../hooks/marketing/useContentItems';
import { useMarketingRealtime } from '../../hooks/marketing/useMarketingRealtime';
import { useProducts } from '../../hooks/useProducts';
import type { WorkflowState, ProductContent } from '../../types/marketing';

interface Props {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
  };
}

const ContentWorkflow: React.FC<Props> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [contentTitle, setContentTitle] = useState('');
  const [contentDescription, setContentDescription] = useState('');
  const [contentType, setContentType] = useState<'blog' | 'video' | 'social'>('blog');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Enable real-time updates for content workflow
  useMarketingRealtime({
    content: true,
    enabled: true
  });

  // React Query hooks
  const {
    content,
    contentByStage,
    workflowStats,
    isLoading,
    error,
    refetch
  } = useContentItems({
    type: activeFilter?.toLowerCase(),
    search: searchQuery
  });

  const { data: products, isLoading: productsLoading } = useProducts();

  const updateStageMutation = useUpdateContentStage();
  const bulkUpdateMutation = useBulkUpdateContentStage();
  const createContentMutation = useCreateContent();

  const handleContentPress = useCallback((contentId: string) => {
    if (selectionMode) {
      setSelectedItems(prev =>
        prev.includes(contentId)
          ? prev.filter(id => id !== contentId)
          : [...prev, contentId]
      );
    } else {
      navigation?.navigate('ContentDetails', { contentId });
    }
  }, [navigation, selectionMode]);

  const handleLongPress = useCallback((contentId: string) => {
    setSelectionMode(true);
    setSelectedItems([contentId]);
  }, []);

  const handleBulkMove = useCallback(async (stage: WorkflowState) => {
    try {
      await bulkUpdateMutation.mutateAsync({ ids: selectedItems, stage });
      setSelectionMode(false);
      setSelectedItems([]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update content stages');
    }
  }, [bulkUpdateMutation, selectedItems]);

  const handleDrop = useCallback(async (contentId: string, newStage: WorkflowState) => {
    try {
      await updateStageMutation.mutateAsync({ id: contentId, stage: newStage });
    } catch (error) {
      Alert.alert('Error', 'Failed to update content stage');
    }
  }, [updateStageMutation]);

  const handleCreateContent = useCallback(async () => {
    if (!contentTitle.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    try {
      await createContentMutation.mutateAsync({
        title: contentTitle,
        description: contentDescription,
        type: contentType,
        productId: selectedProductId || '',
        content: {
          shortDescription: contentDescription,
        },
        media: [],
      });

      // Reset form
      setContentTitle('');
      setContentDescription('');
      setContentType('blog');
      setSelectedProductId('');
      setShowCreateModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create content');
    }
  }, [contentTitle, contentDescription, contentType, createContentMutation]);

  const renderContentCard = (item: ProductContent) => {
    const isOverdue = item.deadline && new Date(item.deadline) < new Date();
    const isUrgent = item.deadline &&
      new Date(item.deadline) < new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) &&
      !isOverdue;

    return (
      <Pressable
        key={item.id}
        style={[
          styles.contentCard,
          selectionMode && selectedItems.includes(item.id) && styles.selectedCard
        ]}
        onPress={() => handleContentPress(item.id)}
        onLongPress={() => handleLongPress(item.id)}
        draggable
        onDragStart={(e: any) => e.dataTransfer?.setData('contentId', item.id)}
      >
        {selectionMode && (
          <View
            testID={`checkbox-${item.id}`}
            style={[
              styles.checkbox,
              selectedItems.includes(item.id) && styles.checkboxChecked
            ]}
          />
        )}
        <Text style={styles.contentTitle}>{item.title}</Text>
        <Text style={styles.contentType}>{item.type}</Text>
        {isOverdue && (
          <View testID={`deadline-overdue-${item.id}`} style={styles.deadlineOverdue}>
            <Text style={styles.deadlineText}>Overdue</Text>
          </View>
        )}
        {isUrgent && (
          <View testID={`deadline-warning-${item.id}`} style={styles.deadlineWarning}>
            <Text style={styles.deadlineText}>Due soon</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const renderStageColumn = (stage: WorkflowState, items: ProductContent[]) => (
    <View
      key={stage}
      style={styles.stageColumn}
      testID={`${stage}-column`}
      onDrop={(e: any) => {
        e.preventDefault();
        const contentId = e.dataTransfer?.getData('contentId');
        if (contentId) {
          handleDrop(contentId, stage);
        }
      }}
      onDragOver={(e: any) => e.preventDefault()}
    >
      <View style={styles.stageHeader}>
        <Text style={styles.stageTitle}>
          {stage.charAt(0).toUpperCase() + stage.slice(1)}
        </Text>
        <Text style={styles.stageCount}>{items.length}</Text>
      </View>
      <ScrollView style={styles.stageContent}>
        {items.map(renderContentCard)}
      </ScrollView>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading content...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Failed to load content</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Content Workflow</Text>

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search content..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'Blog' && styles.activeFilter]}
          onPress={() => setActiveFilter(activeFilter === 'Blog' ? null : 'Blog')}
        >
          <Text style={activeFilter === 'Blog' ? styles.activeFilterText : styles.filterText}>
            Blog
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'Video' && styles.activeFilter]}
          onPress={() => setActiveFilter(activeFilter === 'Video' ? null : 'Video')}
        >
          <Text style={activeFilter === 'Video' ? styles.activeFilterText : styles.filterText}>
            Video
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'Social' && styles.activeFilter]}
          onPress={() => setActiveFilter(activeFilter === 'Social' ? null : 'Social')}
        >
          <Text style={activeFilter === 'Social' ? styles.activeFilterText : styles.filterText}>
            Social
          </Text>
        </TouchableOpacity>
      </View>

      {/* Workflow Analytics */}
      <View style={styles.analyticsContainer}>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsLabel}>Draft</Text>
          <Text style={styles.analyticsValue}>{workflowStats.draft}</Text>
        </View>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsLabel}>Review</Text>
          <Text style={styles.analyticsValue}>{workflowStats.review}</Text>
        </View>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsLabel}>Approved</Text>
          <Text style={styles.analyticsValue}>{workflowStats.approved}</Text>
        </View>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsLabel}>Published</Text>
          <Text style={styles.analyticsValue}>{workflowStats.published}</Text>
        </View>
      </View>

      {/* Bulk Actions */}
      {selectionMode && (
        <View style={styles.bulkActions}>
          <TouchableOpacity
            style={[styles.bulkButton, bulkUpdateMutation.isPending && styles.disabledButton]}
            onPress={() => handleBulkMove('review' as WorkflowState)}
            disabled={bulkUpdateMutation.isPending}
          >
            <Text style={styles.bulkButtonText}>
              {bulkUpdateMutation.isPending ? 'Moving...' : 'Move to Review'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bulkButton}
            onPress={() => {
              setSelectionMode(false);
              setSelectedItems([]);
            }}
          >
            <Text style={styles.bulkButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Workflow Columns */}
      <ScrollView horizontal style={styles.workflowContainer}>
        {renderStageColumn('draft' as WorkflowState, contentByStage.draft)}
        {renderStageColumn('review' as WorkflowState, contentByStage.review)}
        {renderStageColumn('approved' as WorkflowState, contentByStage.approved)}
        {renderStageColumn('published' as WorkflowState, contentByStage.published)}
      </ScrollView>

      {/* Create Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Text style={styles.createButtonText}>Create Content</Text>
      </TouchableOpacity>

      {/* Create Content Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Content</Text>
            <TextInput
              style={styles.input}
              placeholder="Content Title"
              value={contentTitle}
              onChangeText={setContentTitle}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={contentDescription}
              onChangeText={setContentDescription}
              multiline
              numberOfLines={4}
            />
            <View style={styles.typeContainer}>
              <Text style={styles.typeLabel}>Product (Optional):</Text>
              <View style={styles.pickerContainer}>
                {productsLoading ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Product ID (optional)"
                    value={selectedProductId}
                    onChangeText={setSelectedProductId}
                  />
                )}
              </View>
            </View>
            <View style={styles.typeContainer}>
              <Text style={styles.typeLabel}>Content Type:</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[styles.typeButton, contentType === 'blog' && styles.typeButtonActive]}
                  onPress={() => setContentType('blog')}
                >
                  <Text style={contentType === 'blog' ? styles.typeButtonTextActive : styles.typeButtonText}>
                    Blog
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, contentType === 'video' && styles.typeButtonActive]}
                  onPress={() => setContentType('video')}
                >
                  <Text style={contentType === 'video' ? styles.typeButtonTextActive : styles.typeButtonText}>
                    Video
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, contentType === 'social' && styles.typeButtonActive]}
                  onPress={() => setContentType('social')}
                >
                  <Text style={contentType === 'social' ? styles.typeButtonTextActive : styles.typeButtonText}>
                    Social
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton, createContentMutation.isPending && styles.disabledButton]}
                onPress={handleCreateContent}
                disabled={createContentMutation.isPending}
              >
                <Text style={styles.primaryButtonText}>
                  {createContentMutation.isPending ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
  },
  searchInput: {
    backgroundColor: 'white',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
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
  filterText: {
    color: '#333',
  },
  activeFilterText: {
    color: 'white',
  },
  analyticsContainer: {
    flexDirection: 'row',
    padding: 16,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  workflowContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stageColumn: {
    width: 280,
    marginRight: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  stageTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  stageCount: {
    backgroundColor: '#666',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 12,
    overflow: 'hidden',
  },
  stageContent: {
    maxHeight: 400,
  },
  contentCard: {
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
  },
  selectedCard: {
    backgroundColor: '#e3f2fd',
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentType: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  deadlineWarning: {
    backgroundColor: '#ffeb3b',
    padding: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  deadlineOverdue: {
    backgroundColor: '#f44336',
    padding: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  deadlineText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  bulkActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  bulkButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  bulkButtonText: {
    color: 'white',
  },
  disabledButton: {
    opacity: 0.6,
  },
  createButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeContainer: {
    marginBottom: 16,
  },
  typeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  typeButtons: {
    flexDirection: 'row',
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    color: '#333',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 8,
  },
  picker: {
    height: 44,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    padding: 12,
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  primaryButtonText: {
    color: 'white',
  },
});

export default React.memo(ContentWorkflow);