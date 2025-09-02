import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Pressable
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { updateContentStage, bulkUpdateContentStage } from '../../store/marketingSlice';

interface Props {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
  };
}

const ContentWorkflow: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch();
  const { content, workflows } = useSelector((state: any) => state.marketing);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [contentTitle, setContentTitle] = useState('');
  const [contentDescription, setContentDescription] = useState('');
  const [contentType, setContentType] = useState<'blog' | 'video' | 'social'>('blog');

  const filteredContent = useMemo(() => {
    let filtered = content;
    
    if (activeFilter) {
      filtered = filtered.filter((c: any) => c.type === activeFilter.toLowerCase());
    }
    
    if (searchQuery) {
      filtered = filtered.filter((c: any) => 
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [content, activeFilter, searchQuery]);

  const contentByStage = useMemo(() => {
    return {
      draft: filteredContent.filter((c: any) => c.stage === 'draft'),
      review: filteredContent.filter((c: any) => c.stage === 'review'),
      approved: filteredContent.filter((c: any) => c.stage === 'approved'),
      published: filteredContent.filter((c: any) => c.stage === 'published')
    };
  }, [filteredContent]);

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

  const handleBulkMove = useCallback((stage: any) => {
    dispatch(bulkUpdateContentStage({ ids: selectedItems, stage }));
    setSelectionMode(false);
    setSelectedItems([]);
  }, [dispatch, selectedItems]);

  const handleDrop = useCallback((contentId: string, newStage: any) => {
    dispatch(updateContentStage({ id: contentId, stage: newStage }));
  }, [dispatch]);

  const renderContentCard = (item: any) => {
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
        onDragStart={(e: any) => e.dataTransfer.setData('contentId', item.id)}
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

  const renderStageColumn = (stage: string, items: any[]) => (
    <View
      key={stage}
      style={styles.stageColumn}
      testID={`${stage}-column`}
      onDrop={(e: any) => {
        e.preventDefault();
        const contentId = e.dataTransfer.getData('contentId');
        handleDrop(contentId, stage);
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
          <Text>Blog</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'Video' && styles.activeFilter]}
          onPress={() => setActiveFilter(activeFilter === 'Video' ? null : 'Video')}
        >
          <Text>Video</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'Social' && styles.activeFilter]}
          onPress={() => setActiveFilter(activeFilter === 'Social' ? null : 'Social')}
        >
          <Text>Social</Text>
        </TouchableOpacity>
      </View>

      {/* Workflow Analytics */}
      <View style={styles.analyticsContainer}>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsLabel}>Draft</Text>
          <Text style={styles.analyticsValue}>{workflows.draft}</Text>
        </View>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsLabel}>Review</Text>
          <Text style={styles.analyticsValue}>{workflows.review}</Text>
        </View>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsLabel}>Approved</Text>
          <Text style={styles.analyticsValue}>{workflows.approved}</Text>
        </View>
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsLabel}>Published</Text>
          <Text style={styles.analyticsValue}>{workflows.published}</Text>
        </View>
      </View>

      {/* Bulk Actions */}
      {selectionMode && (
        <View style={styles.bulkActions}>
          <TouchableOpacity
            style={styles.bulkButton}
            onPress={() => handleBulkMove('review')}
          >
            <Text>Move to Review</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bulkButton}
            onPress={() => {
              setSelectionMode(false);
              setSelectedItems([]);
            }}
          >
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Workflow Columns */}
      <ScrollView horizontal style={styles.workflowContainer}>
        {renderStageColumn('draft', contentByStage.draft)}
        {renderStageColumn('review', contentByStage.review)}
        {renderStageColumn('approved', contentByStage.approved)}
        {renderStageColumn('published', contentByStage.published)}
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
            <TouchableOpacity style={styles.typeSelector}>
              <Text>Select Type</Text>
            </TouchableOpacity>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={() => {
                  // Handle content creation
                  setShowCreateModal(false);
                }}
              >
                <Text style={styles.primaryButtonText}>Create</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
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
  },
  activeFilter: {
    backgroundColor: '#007AFF',
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
  typeSelector: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
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