import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useContentWorkflow } from '@/hooks/marketing/useContentWorkflow';
import { useContentUpload } from '@/hooks/marketing/useContentUpload';
import { RichTextEditor } from '@/components/marketing/RichTextEditor';
import { ImageGallery } from '@/components/marketing/ImageGallery';
import { WorkflowBadge } from '@/components/marketing/WorkflowBadge';
import { LoadingOverlay } from '@/components/marketing/LoadingOverlay';
import { ProgressBar } from '@/components/marketing/ProgressBar';
import { TagInput } from '@/components/marketing/TagInput';

interface ProductContentScreenProps {
  route: {
    params: {
      contentId?: string;
      mode: 'create' | 'edit';
    };
  };
  navigation: any;
}

interface WorkflowState {
  targetState: string;
}

export function ProductContentScreen({ 
  route, 
  navigation 
}: ProductContentScreenProps) {
  const { contentId, mode } = route.params || { mode: 'edit' };
  const isCreateMode = mode === 'create';
  
  const {
    content,
    isLoading,
    saveContent,
    createContent,
    transitionTo,
    availableTransitions,
    canTransitionTo,
  } = useContentWorkflow(contentId || 'new');
  
  const {
    upload,
    isUploading,
    uploadProgress,
  } = useContentUpload(contentId || 'new');
  
  const [localContent, setLocalContent] = useState({
    title: '',
    description: '',
    seoKeywords: [] as string[],
    imageUrls: [] as string[],
    workflowState: 'draft',
    ...content,
  });
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  useEffect(() => {
    if (content && !isCreateMode) {
      setLocalContent({
        ...content,
        seoKeywords: content.seoKeywords || [],
        imageUrls: content.imageUrls || [],
      });
    }
  }, [content, isCreateMode]);
  
  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    
    try {
      if (isCreateMode && createContent) {
        await createContent(localContent);
      } else {
        await saveContent(localContent);
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      Alert.alert('Save Error', 'Failed to save content');
    }
  }, [localContent, hasUnsavedChanges, saveContent, createContent, isCreateMode]);
  
  const handleTextChange = useCallback((field: string, value: any) => {
    setLocalContent(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  }, []);
  
  const handleImageUpload = useCallback(async () => {
    try {
      const mockImage = { uri: 'file://test.jpg', type: 'image/jpeg' };
      const file = { ...mockImage };
      await upload({ file, type: 'image' });
      
      const newImageUrl = 'https://example.com/uploaded-image.jpg';
      handleTextChange('imageUrls', [...localContent.imageUrls, newImageUrl]);
    } catch (error) {
      Alert.alert('Upload Error', 'Failed to upload image');
    }
  }, [upload, localContent.imageUrls, handleTextChange]);
  
  const handleImageDelete = useCallback(async (index: number) => {
    const updated = [...localContent.imageUrls];
    updated.splice(index, 1);
    const updatedContent = { ...localContent, imageUrls: updated };
    setLocalContent(updatedContent);
    setHasUnsavedChanges(true);
    
    // Save immediately
    if (saveContent) {
      await saveContent(updatedContent);
    }
  }, [localContent, saveContent]);

  const handleImageReorder = useCallback(async (fromIndex: number, direction: 'up' | 'down') => {
    const updated = [...localContent.imageUrls];
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= updated.length) return;
    
    [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
    const updatedContent = { ...localContent, imageUrls: updated };
    setLocalContent(updatedContent);
    setHasUnsavedChanges(true);
    
    // Save immediately
    if (saveContent) {
      await saveContent(updatedContent);
    }
  }, [localContent, saveContent]);
  
  const handleTransition = useCallback(async (targetState: string) => {
    const isPublish = targetState === 'published';
    Alert.alert(
      isPublish ? 'Confirm Publish' : 'Confirm Transition',
      isPublish 
        ? 'This will make the content live. Are you sure?'
        : `Move content to ${targetState}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await transitionTo({ targetState });
            } catch (error) {
              Alert.alert('Transition Error', 'Failed to update workflow state');
            }
          },
        },
      ]
    );
  }, [transitionTo]);
  
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>Save</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleSave]);
  
  if (isLoading) {
    return <LoadingOverlay testID="loading-overlay" />;
  }
  
  const transitionLabels: Record<string, string> = {
    review: 'Send for Review',
    published: 'Publish',
    draft: 'Back to Draft',
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        {localContent.workflowState && !isCreateMode && (
          <View style={styles.workflowContainer}>
            <WorkflowBadge state={localContent.workflowState} />
            <View style={styles.transitionButtons}>
              {availableTransitions?.map(state => (
                <TouchableOpacity
                  key={state}
                  testID={`transition-button-${state}`}
                  style={[
                    styles.transitionButton,
                    !canTransitionTo?.(state) && styles.disabledButton,
                  ]}
                  onPress={() => handleTransition(state)}
                  disabled={!canTransitionTo?.(state)}
                >
                  <Text style={styles.transitionButtonText}>
                    {transitionLabels[state] || `Send to ${state}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        
        <TextInput
          testID="title-input"
          style={styles.titleInput}
          placeholder="Product Title"
          value={localContent.title}
          onChangeText={text => handleTextChange('title', text)}
          onBlur={handleSave}
        />
        
        <View style={styles.editorContainer}>
          <RichTextEditor
            testID="rich-text-editor"
            value={localContent.description}
            onChange={html => handleTextChange('description', html)}
            onBlur={handleSave}
            placeholder="Enter product description..."
          />
        </View>
        
        <View style={styles.galleryContainer}>
          <Text style={styles.sectionTitle}>Product Images</Text>
          <ImageGallery
            images={localContent.imageUrls}
            onAddImage={handleImageUpload}
            onRemoveImage={handleImageDelete}
            onReorderImage={handleImageReorder}
            emptyMessage="No images uploaded"
          />
          {isUploading && (
            <ProgressBar
              testID="progress-bar"
              progress={uploadProgress / 100}
              text={`${uploadProgress}%`}
            />
          )}
        </View>
        
        <View style={styles.keywordsContainer}>
          <Text style={styles.sectionTitle}>SEO Keywords</Text>
          <TagInput
            testID="keyword-input"
            tags={localContent.seoKeywords}
            onTagsChange={tags => handleTextChange('seoKeywords', tags)}
            placeholder="Add keywords..."
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  workflowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  transitionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  transitionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  transitionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  editorContainer: {
    minHeight: 200,
    padding: 16,
  },
  galleryContainer: {
    padding: 16,
  },
  keywordsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  saveButton: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 16,
  },
});