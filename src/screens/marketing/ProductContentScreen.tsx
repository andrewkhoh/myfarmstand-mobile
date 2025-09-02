import React, { useState } from 'react';
import { View, ScrollView, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useContentWorkflow } from '@/hooks/marketing/useContentWorkflow';
import { ContentEditor } from '@/components/marketing/ContentEditor';
import { ImageUploader } from '@/components/marketing/ImageUploader';
import { ScreenContainer, LoadingState, ErrorState } from '@/components/common';

export function ProductContentScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const contentId = (route.params as any)?.id;
  
  const {
    content,
    workflowStages,
    currentStage,
    isLoading,
    isSaving,
    error,
    saveContent,
    moveToNextStage,
    uploadImage,
  } = useContentWorkflow(contentId);

  const [title, setTitle] = useState(content?.title || '');
  const [tags, setTags] = useState(content?.tags.join(', ') || '');

  // Handle loading state
  if (isLoading && !content) {
    return <LoadingState testID="content-loading" />;
  }

  // Handle error state
  if (error && !content) {
    return (
      <ErrorState
        testID="content-error"
        error={error}
        message="Unable to load content"
        onRetry={() => navigation.goBack()}
      />
    );
  }

  const handleSaveContent = async (editorContent: string) => {
    try {
      await saveContent({
        title,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      // Show success feedback
    } catch (err) {
      // Handle error
    }
  };

  const handleAdvanceWorkflow = async () => {
    try {
      await moveToNextStage();
      // Show success feedback
    } catch (err) {
      // Handle error
    }
  };

  return (
    <ScreenContainer testID="product-content-screen">
      <ScrollView>
        {/* Content Header */}
        <View style={styles.header}>
          <TextInput
            style={styles.titleInput}
            placeholder="Content Title"
            value={title}
            onChangeText={setTitle}
            testID="content-title-input"
          />
          
          <TextInput
            style={styles.tagsInput}
            placeholder="Tags (comma separated)"
            value={tags}
            onChangeText={setTags}
            testID="content-tags-input"
          />
        </View>

        {/* Workflow Status */}
        <View style={styles.workflowSection} testID="workflow-status">
          <Text style={styles.sectionTitle}>Workflow Status</Text>
          <View style={styles.workflowStages}>
            {workflowStages.map((stage, index) => (
              <View key={stage.id} style={styles.stageItem}>
                <View style={[
                  styles.stageDot,
                  stage.status === 'completed' && styles.stageDotCompleted,
                  stage.status === 'in_progress' && styles.stageDotActive,
                ]}>
                  {stage.status === 'completed' && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[
                  styles.stageName,
                  stage.status === 'in_progress' && styles.stageNameActive,
                ]}>
                  {stage.name}
                </Text>
                {stage.assignee && (
                  <Text style={styles.stageAssignee}>{stage.assignee}</Text>
                )}
              </View>
            ))}
          </View>
          
          <TouchableOpacity
            style={[styles.advanceButton, isSaving && styles.advanceButtonDisabled]}
            onPress={handleAdvanceWorkflow}
            disabled={isSaving}
            testID="advance-workflow-button"
          >
            <Text style={styles.advanceButtonText}>
              {isSaving ? 'Processing...' : 'Move to Next Stage'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Editor */}
        <View style={styles.editorSection}>
          <Text style={styles.sectionTitle}>Content Editor</Text>
          <ContentEditor
            initialContent={content?.title || ''}
            onSave={handleSaveContent}
            testID="rich-text-editor"
          />
        </View>

        {/* Image Upload */}
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>Media</Text>
          <ImageUploader
            onUpload={uploadImage}
            testID="image-uploader"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={() => handleSaveContent('')}
            disabled={isSaving}
            testID="save-draft-button"
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            testID="cancel-button"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tagsInput: {
    fontSize: 14,
    color: '#666',
    padding: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
  },
  workflowSection: {
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  workflowStages: {
    marginBottom: 16,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stageDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageDotActive: {
    backgroundColor: '#2196F3',
  },
  stageDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  stageName: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  stageNameActive: {
    color: '#333',
    fontWeight: '600',
  },
  stageAssignee: {
    fontSize: 12,
    color: '#999',
  },
  advanceButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  advanceButtonDisabled: {
    opacity: 0.5,
  },
  advanceButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editorSection: {
    padding: 16,
  },
  uploadSection: {
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginRight: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});