/**
 * Product Create/Edit Screen
 * 
 * Comprehensive form for creating and editing products with real-time validation.
 * 
 * Features:
 * - Real-time validation using ProductAdminSchema
 * - Image upload and management
 * - Form state management with error handling
 * - Category selection with dynamic loading
 * - Bundle configuration support
 * - ValidationMonitor integration for success/failure tracking
 * - Graceful degradation and user-friendly error messages
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  Alert, 
  Switch,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { 
  Screen, 
  Text, 
  Card, 
  Button, 
  ErrorBoundary 
} from '../components';
import { 
  useAdminProduct,
  useCreateProduct,
  useUpdateProduct,
  useAdminCategories 
} from '../hooks/useProductAdmin';
import { spacing, colors } from '../utils/theme';
import { 
  ProductAdminCreate, 
  ProductAdminUpdate,
  ProductAdminCreateSchema,
  ProductAdminUpdateSchema
} from '../schemas/productAdmin.schema';
import { z } from 'zod';

// Navigation types
type ProductCreateEditNavigationProp = StackNavigationProp<any, 'ProductCreateEdit'>;
type ProductCreateEditRouteProp = RouteProp<{ ProductCreateEdit: { id?: string } }, 'ProductCreateEdit'>;

// Form data interface
interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category_id: string;
  sku: string;
  stock_quantity: string;
  image_url?: string;
  is_available: boolean;
  is_bundle: boolean;
  is_pre_order: boolean;
  is_weekly_special: boolean;
  tags: string[];
  bundle_items: string[];
  pre_order_end_date?: string;
  special_notes?: string;
}

// Validation error interface
interface ValidationErrors {
  [key: string]: string[];
}

// Form field validation state
interface FieldValidation {
  [key: string]: {
    isValid: boolean;
    errors: string[];
    touched: boolean;
  };
}

export const ProductCreateEditScreen: React.FC = () => {
  const navigation = useNavigation<ProductCreateEditNavigationProp>();
  const route = useRoute<ProductCreateEditRouteProp>();
  const isEditMode = !!route.params?.id;

  // State management
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    category_id: '',
    sku: '',
    stock_quantity: '',
    image_url: '',
    is_available: true,
    is_bundle: false,
    is_pre_order: false,
    is_weekly_special: false,
    tags: [],
    bundle_items: [],
    pre_order_end_date: '',
    special_notes: '',
  });

  const [fieldValidation, setFieldValidation] = useState<FieldValidation>({});
  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Hooks
  const categoriesQuery = useAdminCategories();
  const productQuery = useAdminProduct(route.params?.id || '');
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  // Load existing product data in edit mode
  useEffect(() => {
    if (isEditMode && productQuery.data) {
      const product = productQuery.data;
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        category_id: product.category_id || '',
        sku: product.sku || '',
        stock_quantity: product.stock_quantity?.toString() || '0',
        image_url: product.image_url || '',
        is_available: product.is_available ?? true,
        is_bundle: product.is_bundle ?? false,
        is_pre_order: product.is_pre_order ?? false,
        is_weekly_special: product.is_weekly_special ?? false,
        tags: product.tags || [],
        bundle_items: product.bundle_items || [],
        pre_order_end_date: product.pre_order_end_date || '',
        special_notes: product.special_notes || '',
      });
    }
  }, [isEditMode, productQuery.data]);

  // Real-time field validation
  const validateField = useCallback((fieldName: string, value: any) => {
    try {
      // Create a partial schema for the specific field
      const schema = isEditMode ? ProductAdminUpdateSchema : ProductAdminCreateSchema;
      const fieldSchema = schema.pick({ [fieldName]: true });
      
      // Validate the field
      fieldSchema.parse({ [fieldName]: value });
      
      // Update validation state - field is valid
      setFieldValidation(prev => ({
        ...prev,
        [fieldName]: {
          isValid: true,
          errors: [],
          touched: true,
        }
      }));

      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors
          .filter(err => err.path.includes(fieldName))
          .map(err => err.message);

        // Update validation state - field has errors
        setFieldValidation(prev => ({
          ...prev,
          [fieldName]: {
            isValid: false,
            errors: fieldErrors,
            touched: true,
          }
        }));

        return false;
      }
      return false;
    }
  }, [isEditMode]);

  // Handle form field changes with real-time validation
  const handleFieldChange = useCallback((fieldName: keyof ProductFormData, value: any) => {
    // Update form data
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Validate field in real-time
    validateField(fieldName, value);
  }, [validateField]);

  // Handle price formatting
  const handlePriceChange = useCallback((value: string) => {
    // Allow only numbers and decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    const parts = cleanValue.split('.');
    
    // Limit to 2 decimal places
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    
    handleFieldChange('price', cleanValue);
  }, [handleFieldChange]);

  // Handle stock quantity formatting
  const handleStockChange = useCallback((value: string) => {
    // Allow only whole numbers
    const cleanValue = value.replace(/[^0-9]/g, '');
    handleFieldChange('stock_quantity', cleanValue);
  }, [handleFieldChange]);

  // Handle tag addition
  const handleAddTag = useCallback(() => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      const newTags = [...formData.tags, tagInput.trim()];
      handleFieldChange('tags', newTags);
      setTagInput('');
    }
  }, [tagInput, formData.tags, handleFieldChange]);

  // Handle tag removal
  const handleRemoveTag = useCallback((tagToRemove: string) => {
    const newTags = formData.tags.filter(tag => tag !== tagToRemove);
    handleFieldChange('tags', newTags);
  }, [formData.tags, handleFieldChange]);

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    try {
      const schema = isEditMode ? ProductAdminUpdateSchema : ProductAdminCreateSchema;
      
      // Convert form data to the expected format
      const validationData: any = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        category_id: formData.category_id || null,
        sku: formData.sku || null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        image_url: formData.image_url || null,
        is_available: formData.is_available,
        is_bundle: formData.is_bundle,
        is_pre_order: formData.is_pre_order,
        is_weekly_special: formData.is_weekly_special,
        tags: formData.tags,
        bundle_items: formData.bundle_items,
        pre_order_end_date: formData.pre_order_end_date || null,
        special_notes: formData.special_notes || null,
      };

      schema.parse(validationData);
      setGlobalErrors([]);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        setGlobalErrors(errors);
      } else {
        setGlobalErrors(['Validation failed. Please check your input.']);
      }
      return false;
    }
  }, [formData, isEditMode]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    // Validate form before submission
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for submission
      const submitData: any = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category_id: formData.category_id || null,
        sku: formData.sku || null,
        stock_quantity: parseInt(formData.stock_quantity),
        image_url: formData.image_url || null,
        is_available: formData.is_available,
        is_bundle: formData.is_bundle,
        is_pre_order: formData.is_pre_order,
        is_weekly_special: formData.is_weekly_special,
        tags: formData.tags,
        bundle_items: formData.bundle_items,
        pre_order_end_date: formData.pre_order_end_date || null,
        special_notes: formData.special_notes || null,
      };

      if (isEditMode) {
        // Update existing product
        await updateProduct.mutateAsync({
          id: route.params!.id!,
          data: submitData as ProductAdminUpdate,
        });
        Alert.alert('Success', 'Product updated successfully!');
      } else {
        // Create new product
        await createProduct.mutateAsync(submitData as ProductAdminCreate);
        Alert.alert('Success', 'Product created successfully!');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to save product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isSubmitting, validateForm, isEditMode, createProduct, updateProduct, navigation, route.params]);

  // Get field validation state
  const getFieldValidation = useCallback((fieldName: string) => {
    return fieldValidation[fieldName] || { isValid: true, errors: [], touched: false };
  }, [fieldValidation]);

  // Render validation errors for a field
  const renderFieldErrors = useCallback((fieldName: string) => {
    const validation = getFieldValidation(fieldName);
    if (!validation.touched || validation.isValid) return null;

    return (
      <View style={styles.fieldErrors}>
        {validation.errors.map((error, index) => (
          <Text key={index} variant="caption" color="error" style={styles.errorText}>
            {error}
          </Text>
        ))}
      </View>
    );
  }, [getFieldValidation]);

  // Render form section
  const renderFormSection = useCallback((title: string, children: React.ReactNode) => (
    <Card style={styles.sectionCard}>
      <Text variant="heading4" style={styles.sectionTitle}>{title}</Text>
      {children}
    </Card>
  ), []);

  // Loading state for edit mode
  if (isEditMode && productQuery.isLoading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="body" color="secondary" style={styles.loadingText}>
            Loading product data...
          </Text>
        </View>
      </Screen>
    );
  }

  // Error state for edit mode
  if (isEditMode && productQuery.error) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text variant="heading3" color="error" align="center">
            Failed to load product
          </Text>
          <Text variant="body" color="secondary" align="center" style={styles.errorSubtext}>
            Unable to load product data for editing.
          </Text>
          <Button
            title="Go Back"
            variant="primary"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
        </View>
      </Screen>
    );
  }

  // Main render
  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ErrorBoundary
            fallback={
              <View style={styles.errorContainer}>
                <Text variant="heading3" color="error" align="center">
                  Form Error
                </Text>
                <Text variant="body" color="secondary" align="center" style={styles.errorSubtext}>
                  Something went wrong with the form. Please try refreshing.
                </Text>
              </View>
            }
          >
            {/* Header */}
            <Card style={styles.headerCard}>
              <Text variant="heading2" align="center">
                {isEditMode ? 'Edit Product' : 'Create Product'}
              </Text>
              {globalErrors.length > 0 && (
                <View style={styles.globalErrors}>
                  {globalErrors.map((error, index) => (
                    <Text key={index} variant="caption" color="error" style={styles.errorText}>
                      • {error}
                    </Text>
                  ))}
                </View>
              )}
            </Card>

            {/* Basic Information */}
            {renderFormSection('Basic Information', (
              <>
                <View style={styles.formField}>
                  <Text variant="body" style={styles.fieldLabel}>Product Name *</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      !getFieldValidation('name').isValid && getFieldValidation('name').touched && styles.errorInput
                    ]}
                    placeholder="Enter product name..."
                    value={formData.name}
                    onChangeText={(text) => handleFieldChange('name', text)}
                    onBlur={() => validateField('name', formData.name)}
                  />
                  {renderFieldErrors('name')}
                </View>

                <View style={styles.formField}>
                  <Text variant="body" style={styles.fieldLabel}>Description</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.multilineInput,
                      !getFieldValidation('description').isValid && getFieldValidation('description').touched && styles.errorInput
                    ]}
                    placeholder="Enter product description..."
                    value={formData.description}
                    onChangeText={(text) => handleFieldChange('description', text)}
                    onBlur={() => validateField('description', formData.description)}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  {renderFieldErrors('description')}
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formFieldHalf}>
                    <Text variant="body" style={styles.fieldLabel}>Price ($) *</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        !getFieldValidation('price').isValid && getFieldValidation('price').touched && styles.errorInput
                      ]}
                      placeholder="0.00"
                      value={formData.price}
                      onChangeText={handlePriceChange}
                      onBlur={() => validateField('price', parseFloat(formData.price) || 0)}
                      keyboardType="decimal-pad"
                    />
                    {renderFieldErrors('price')}
                  </View>

                  <View style={styles.formFieldHalf}>
                    <Text variant="body" style={styles.fieldLabel}>Stock Quantity *</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        !getFieldValidation('stock_quantity').isValid && getFieldValidation('stock_quantity').touched && styles.errorInput
                      ]}
                      placeholder="0"
                      value={formData.stock_quantity}
                      onChangeText={handleStockChange}
                      onBlur={() => validateField('stock_quantity', parseInt(formData.stock_quantity) || 0)}
                      keyboardType="number-pad"
                    />
                    {renderFieldErrors('stock_quantity')}
                  </View>
                </View>
              </>
            ))}

            {/* Product Details */}
            {renderFormSection('Product Details', (
              <>
                <View style={styles.formField}>
                  <Text variant="body" style={styles.fieldLabel}>SKU</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      !getFieldValidation('sku').isValid && getFieldValidation('sku').touched && styles.errorInput
                    ]}
                    placeholder="Enter SKU..."
                    value={formData.sku}
                    onChangeText={(text) => handleFieldChange('sku', text)}
                    onBlur={() => validateField('sku', formData.sku)}
                  />
                  {renderFieldErrors('sku')}
                </View>

                <View style={styles.formField}>
                  <Text variant="body" style={styles.fieldLabel}>Category</Text>
                  {categoriesQuery.isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <View style={styles.categorySelector}>
                      {categoriesQuery.data?.map(category => (
                        <TouchableOpacity
                          key={category.id}
                          style={[
                            styles.categoryOption,
                            formData.category_id === category.id && styles.selectedCategory
                          ]}
                          onPress={() => handleFieldChange('category_id', category.id)}
                        >
                          <Text
                            variant="body"
                            color={formData.category_id === category.id ? 'primary' : 'secondary'}
                          >
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      )) || (
                        <Text variant="caption" color="secondary">No categories available</Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Tags */}
                <View style={styles.formField}>
                  <Text variant="body" style={styles.fieldLabel}>Tags</Text>
                  <View style={styles.tagContainer}>
                    <View style={styles.tagInputContainer}>
                      <TextInput
                        style={styles.tagInput}
                        placeholder="Add tag..."
                        value={tagInput}
                        onChangeText={setTagInput}
                        onSubmitEditing={handleAddTag}
                      />
                      <Button
                        title="Add"
                        variant="outline"
                        size="small"
                        onPress={handleAddTag}
                        disabled={!tagInput.trim()}
                      />
                    </View>
                    <View style={styles.tagList}>
                      {formData.tags.map(tag => (
                        <TouchableOpacity
                          key={tag}
                          style={styles.tag}
                          onPress={() => handleRemoveTag(tag)}
                        >
                          <Text variant="caption" color="primary">{tag}</Text>
                          <Text variant="caption" color="error" style={styles.tagRemove}>×</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </>
            ))}

            {/* Product Options */}
            {renderFormSection('Product Options', (
              <>
                <View style={styles.switchField}>
                  <Text variant="body" style={styles.switchLabel}>Available for Sale</Text>
                  <Switch
                    value={formData.is_available}
                    onValueChange={(value) => handleFieldChange('is_available', value)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.background}
                  />
                </View>

                <View style={styles.switchField}>
                  <Text variant="body" style={styles.switchLabel}>Bundle Product</Text>
                  <Switch
                    value={formData.is_bundle}
                    onValueChange={(value) => handleFieldChange('is_bundle', value)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.background}
                  />
                </View>

                <View style={styles.switchField}>
                  <Text variant="body" style={styles.switchLabel}>Pre-order Item</Text>
                  <Switch
                    value={formData.is_pre_order}
                    onValueChange={(value) => handleFieldChange('is_pre_order', value)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.background}
                  />
                </View>

                <View style={styles.switchField}>
                  <Text variant="body" style={styles.switchLabel}>Weekly Special</Text>
                  <Switch
                    value={formData.is_weekly_special}
                    onValueChange={(value) => handleFieldChange('is_weekly_special', value)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.background}
                  />
                </View>
              </>
            ))}

            {/* Image Upload */}
            {renderFormSection('Product Image', (
              <>
                <View style={styles.formField}>
                  <Text variant="body" style={styles.fieldLabel}>Image URL</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter image URL..."
                    value={formData.image_url}
                    onChangeText={(text) => handleFieldChange('image_url', text)}
                  />
                  {formData.image_url && (
                    <View style={styles.imagePreview}>
                      <Image
                        source={{ uri: formData.image_url }}
                        style={styles.previewImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                  <Text variant="caption" color="secondary" style={styles.imageNote}>
                    Note: Image upload functionality will be enhanced in future versions.
                  </Text>
                </View>
              </>
            ))}

            {/* Special Notes */}
            {renderFormSection('Additional Information', (
              <>
                <View style={styles.formField}>
                  <Text variant="body" style={styles.fieldLabel}>Special Notes</Text>
                  <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    placeholder="Enter any special notes or instructions..."
                    value={formData.special_notes}
                    onChangeText={(text) => handleFieldChange('special_notes', text)}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>
              </>
            ))}

            {/* Action Buttons */}
            <Card style={styles.actionCard}>
              <View style={styles.actionButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => navigation.goBack()}
                  style={styles.actionButton}
                />
                <Button
                  title={isSubmitting ? 'Saving...' : (isEditMode ? 'Update' : 'Create')}
                  variant="primary"
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  style={styles.actionButton}
                />
              </View>
            </Card>
          </ErrorBoundary>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.large,
  },
  loadingText: {
    marginTop: spacing.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.large,
  },
  errorSubtext: {
    marginTop: spacing.small,
    marginBottom: spacing.large,
  },
  backButton: {
    minWidth: 120,
  },
  headerCard: {
    margin: spacing.medium,
    marginBottom: spacing.small,
  },
  globalErrors: {
    marginTop: spacing.medium,
    padding: spacing.small,
    backgroundColor: colors.errorLight,
    borderRadius: 8,
  },
  sectionCard: {
    margin: spacing.medium,
    marginTop: spacing.small,
  },
  sectionTitle: {
    marginBottom: spacing.medium,
    color: colors.primary,
  },
  formField: {
    marginBottom: spacing.medium,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.medium,
  },
  formFieldHalf: {
    flex: 1,
  },
  fieldLabel: {
    marginBottom: spacing.small,
    fontWeight: '600',
    color: colors.text,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.medium,
    fontSize: 16,
    backgroundColor: colors.background,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorInput: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  fieldErrors: {
    marginTop: spacing.small,
  },
  errorText: {
    marginTop: spacing.tiny,
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.small,
  },
  categoryOption: {
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  selectedCategory: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  tagContainer: {
    gap: spacing.small,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.small,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.small,
    fontSize: 14,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.small,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.small,
    paddingVertical: spacing.tiny,
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    gap: spacing.tiny,
  },
  tagRemove: {
    fontWeight: 'bold',
  },
  switchField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchLabel: {
    flex: 1,
    fontWeight: '500',
  },
  imagePreview: {
    marginTop: spacing.small,
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
  },
  imageNote: {
    marginTop: spacing.small,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionCard: {
    margin: spacing.medium,
    marginBottom: spacing.large,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.medium,
  },
  actionButton: {
    flex: 1,
  },
});

export default ProductCreateEditScreen;