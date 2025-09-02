import React, { memo, useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  ProductContent,
  WorkflowState,
  ContentPermissions,
} from '@/types/marketing';

interface ContentEditorProps {
  initialContent?: ProductContent;
  onSave: (content: ProductContent) => Promise<void>;
  onApprovalRequest?: () => void;
  workflowState: WorkflowState;
  permissions: ContentPermissions;
}

export const ContentEditor = memo<ContentEditorProps>(({
  initialContent,
  onSave,
  onApprovalRequest,
  workflowState,
  permissions,
}) => {
  const theme = useTheme();
  const [content, setContent] = useState<ProductContent>(
    initialContent || {
      id: '',
      title: '',
      description: '',
      keywords: [],
      images: [],
      lastModified: new Date(),
      version: 1,
    }
  );
  const [keywordInput, setKeywordInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (hasChanges && permissions.canEdit) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000);
    }
    return () => clearTimeout(autoSaveTimeoutRef.current);
  }, [content, hasChanges, permissions.canEdit]);

  const handleAutoSave = useCallback(async () => {
    if (!hasChanges || !permissions.canEdit) return;
    
    try {
      await onSave({
        ...content,
        lastModified: new Date(),
        version: content.version + 1,
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [content, hasChanges, permissions.canEdit, onSave]);

  const handleSave = useCallback(async () => {
    if (!permissions.canEdit) {
      Alert.alert('Permission Denied', 'You do not have permission to edit this content.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...content,
        lastModified: new Date(),
        version: content.version + 1,
      });
      setHasChanges(false);
      Alert.alert('Success', 'Content saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save content');
    } finally {
      setIsSaving(false);
    }
  }, [content, permissions.canEdit, onSave]);

  const handleTitleChange = useCallback((text: string) => {
    setContent(prev => ({ ...prev, title: text }));
    setHasChanges(true);
  }, []);

  const handleDescriptionChange = useCallback((text: string) => {
    setContent(prev => ({ ...prev, description: text }));
    setHasChanges(true);
  }, []);

  const handleAddKeyword = useCallback(() => {
    if (keywordInput.trim()) {
      setContent(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()],
      }));
      setKeywordInput('');
      setHasChanges(true);
    }
  }, [keywordInput]);

  const handleRemoveKeyword = useCallback((index: number) => {
    setContent(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  }, []);

  const handleSEOUpdate = useCallback((field: 'title' | 'description', value: string) => {
    setContent(prev => ({
      ...prev,
      seoMeta: {
        ...prev.seoMeta,
        title: field === 'title' ? value : prev.seoMeta?.title || '',
        description: field === 'description' ? value : prev.seoMeta?.description || '',
        keywords: prev.seoMeta?.keywords || [],
      },
    }));
    setHasChanges(true);
  }, []);

  const handleRequestApproval = useCallback(() => {
    if (onApprovalRequest && workflowState === 'draft') {
      Alert.alert(
        'Request Approval',
        'Are you sure you want to submit this content for approval?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Submit',
            onPress: () => {
              onApprovalRequest();
              Alert.alert('Success', 'Content submitted for approval');
            },
          },
        ]
      );
    }
  }, [onApprovalRequest, workflowState]);

  const isReadOnly = !permissions.canEdit || workflowState === 'published' || workflowState === 'archived';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="content-editor"
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Content Editor
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{workflowState.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Title</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            value={content.title}
            onChangeText={handleTitleChange}
            placeholder="Enter product title"
            placeholderTextColor={theme.colors.textSecondary}
            editable={!isReadOnly}
            accessibilityLabel="Product title"
            testID="title-input"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Description</Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            value={content.description}
            onChangeText={handleDescriptionChange}
            placeholder="Enter product description"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            editable={!isReadOnly}
            accessibilityLabel="Product description"
            testID="description-input"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Keywords</Text>
          <View style={styles.keywordContainer}>
            <View style={styles.keywordList}>
              {content.keywords.map((keyword, index) => (
                <View
                  key={index}
                  style={[styles.keywordTag, { backgroundColor: theme.colors.primary }]}
                  testID={`keyword-${index}`}
                >
                  <Text style={styles.keywordText}>{keyword}</Text>
                  {!isReadOnly && (
                    <TouchableOpacity
                      onPress={() => handleRemoveKeyword(index)}
                      accessibilityLabel={`Remove keyword ${keyword}`}
                      testID={`remove-keyword-${index}`}
                    >
                      <Text style={styles.keywordRemove}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
            {!isReadOnly && (
              <View style={styles.keywordInputContainer}>
                <TextInput
                  style={[
                    styles.keywordInput,
                    {
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  value={keywordInput}
                  onChangeText={setKeywordInput}
                  placeholder="Add keyword"
                  placeholderTextColor={theme.colors.textSecondary}
                  onSubmitEditing={handleAddKeyword}
                  returnKeyType="done"
                  testID="keyword-input"
                />
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleAddKeyword}
                  accessibilityLabel="Add keyword"
                  testID="add-keyword-button"
                >
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>SEO Settings</Text>
          <View style={styles.seoContainer}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Meta Title</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={content.seoMeta?.title || ''}
              onChangeText={(text) => handleSEOUpdate('title', text)}
              placeholder="SEO meta title"
              placeholderTextColor={theme.colors.textSecondary}
              editable={!isReadOnly}
              testID="seo-title-input"
            />
            
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Meta Description
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={content.seoMeta?.description || ''}
              onChangeText={(text) => handleSEOUpdate('description', text)}
              placeholder="SEO meta description"
              placeholderTextColor={theme.colors.textSecondary}
              editable={!isReadOnly}
              testID="seo-description-input"
            />
          </View>
        </View>

        <View style={styles.footer}>
          {hasChanges && (
            <Text style={[styles.unsavedText, { color: theme.colors.warning }]}>
              Unsaved changes (auto-saving...)
            </Text>
          )}
          
          <View style={styles.actions}>
            {permissions.canEdit && !isReadOnly && (
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.colors.primary },
                  isSaving && styles.disabledButton,
                ]}
                onPress={handleSave}
                disabled={isSaving}
                accessibilityLabel="Save content"
                testID="save-button"
              >
                {isSaving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            )}
            
            {workflowState === 'draft' && onApprovalRequest && permissions.canEdit && (
              <TouchableOpacity
                style={[styles.approvalButton, { backgroundColor: theme.colors.secondary }]}
                onPress={handleRequestApproval}
                accessibilityLabel="Request approval"
                testID="approval-button"
              >
                <Text style={styles.approvalButtonText}>Request Approval</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

ContentEditor.displayName = 'ContentEditor';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  keywordContainer: {
    marginTop: 8,
  },
  keywordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  keywordTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  keywordText: {
    color: 'white',
    fontSize: 14,
  },
  keywordRemove: {
    color: 'white',
    fontSize: 20,
    marginLeft: 6,
    fontWeight: '600',
  },
  keywordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keywordInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginRight: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '400',
  },
  seoContainer: {
    marginTop: 12,
  },
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  unsavedText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  approvalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  approvalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});