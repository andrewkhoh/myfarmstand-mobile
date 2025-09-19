import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useCampaignMutation } from '../../hooks/marketing/useCampaignMutation';
import { useCampaignData } from '../../hooks/marketing/useCampaignData';

interface CampaignPlannerScreenProps {
  route: {
    params?: {
      campaignId?: string;
      mode?: 'create' | 'edit';
    };
  };
  navigation: any;
}

export function CampaignPlannerScreen({ route, navigation }: CampaignPlannerScreenProps) {
  const { campaignId, mode = 'create' } = route.params || {};
  const isEditMode = mode === 'edit' && campaignId;
  
  const { createCampaign, updateCampaign, isCreating } = useCampaignMutation();
  const { campaign, isLoading, audienceSegments, availableProducts } = useCampaignData(campaignId);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(),
    targetAudience: '',
    budget: 0,
    selectedProducts: [] as string[],
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAudienceDropdown, setShowAudienceDropdown] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        description: campaign.description || '',
        startDate: campaign.startDate ? new Date(campaign.startDate) : new Date(),
        endDate: campaign.endDate ? new Date(campaign.endDate) : new Date(),
        targetAudience: campaign.targetAudience || '',
        budget: campaign.budget || 0,
        selectedProducts: campaign.selectedProducts || [],
      });
    }
  }, [campaign]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }
    
    if (formData.endDate <= formData.startDate) {
      newErrors.dateRange = 'End date must be after start date';
    }
    
    if (formData.budget < 0) {
      newErrors.budget = 'Budget must be positive';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      const campaignData = {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        targetAudience: formData.targetAudience,
        budget: formData.budget,
        selectedProducts: formData.selectedProducts,
        id: campaignId,
      };
      
      if (isEditMode) {
        const { selectedProducts, ...updateData } = campaignData;
        // Only include selectedProducts if not empty
        const dataForUpdate = formData.selectedProducts.length > 0 
          ? { ...updateData, selectedProducts: formData.selectedProducts }
          : updateData;
        await updateCampaign(campaignId, dataForUpdate);
        Alert.alert('Success', 'Campaign updated');
      } else {
        const { id, selectedProducts, ...dataForCreate } = campaignData;
        // Only include selectedProducts if not empty
        const createData = {
          ...dataForCreate,
          selectedProducts: formData.selectedProducts || []
        };
        await createCampaign(createData);
        Alert.alert('Success', 'Campaign created');
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const toggleProduct = (productId: string) => {
    const updated = formData.selectedProducts.includes(productId)
      ? formData.selectedProducts.filter(p => p !== productId)
      : [...formData.selectedProducts, productId];
    updateField('selectedProducts', updated);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Campaign Name"
          value={formData.name}
          onChangeText={text => updateField('name', text)}
        />
        {errors.name && <Text style={styles.error}>{errors.name}</Text>}
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description"
          value={formData.description}
          onChangeText={text => updateField('description', text)}
          multiline
        />
        
        <TouchableOpacity
          testID="start-date-picker"
          style={styles.datePicker}
          onPress={() => {
            // Date picker would be shown here
            // In a real app, this would open a date picker modal
            // For now, we'll just update with current date
            updateField('startDate', new Date());
          }}
        >
          <Text>Start Date: {formData.startDate.toLocaleDateString()}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          testID="end-date-picker"
          style={styles.datePicker}
          onPress={() => {
            // Date picker would be shown here
            // In a real app, this would open a date picker modal
            // For now, we'll just update with current date
            updateField('endDate', new Date());
          }}
        >
          <Text>End Date: {formData.endDate.toLocaleDateString()}</Text>
        </TouchableOpacity>
        {errors.dateRange && <Text style={styles.error}>{errors.dateRange}</Text>}
        
        <View>
          <TextInput
            testID="target-audience-input"
            style={styles.input}
            placeholder="Target Audience"
            value={formData.targetAudience}
            onChangeText={text => updateField('targetAudience', text)}
          />
          <TouchableOpacity
            testID="audience-dropdown"
            style={styles.dropdownButton}
            onPress={() => setShowAudienceDropdown(!showAudienceDropdown)}
          >
            <Text>Select Audience Segment</Text>
          </TouchableOpacity>
          {showAudienceDropdown && (
            <View style={styles.dropdown}>
              {audienceSegments?.map(segment => (
                <TouchableOpacity
                  key={segment}
                  style={styles.dropdownItem}
                  onPress={() => {
                    updateField('targetAudience', segment);
                    setShowAudienceDropdown(false);
                  }}
                >
                  <Text>{segment}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        <TextInput
          testID="budget-input"
          style={styles.input}
          placeholder="Budget"
          value={formData.budget.toString()}
          onChangeText={text => updateField('budget', parseFloat(text) || 0)}
          keyboardType="numeric"
        />
        {errors.budget && <Text style={styles.error}>{errors.budget}</Text>}
        
        <TouchableOpacity
          testID="product-selector"
          style={styles.dropdownButton}
          onPress={() => setShowProductSelector(!showProductSelector)}
        >
          <Text>Select Products</Text>
        </TouchableOpacity>
        {showProductSelector && availableProducts && (
          <View style={styles.dropdown}>
            {availableProducts.map(product => (
              <TouchableOpacity
                key={product.id}
                style={styles.dropdownItem}
                onPress={() => {
                  toggleProduct(product.id);
                  setShowProductSelector(false);
                }}
              >
                <Text>{product.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <View testID="selected-products">
          {formData.selectedProducts.map(productId => {
            const product = availableProducts?.find(p => p.id === productId);
            return (
              <View key={productId} style={styles.selectedProduct}>
                <Text>{product?.name || productId}</Text>
                <TouchableOpacity
                  testID={`remove-product-${productId}`}
                  onPress={() => toggleProduct(productId)}
                >
                  <Text>×</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
        
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="submit-button"
            style={[styles.submitButton, isCreating && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isCreating}
          >
            {isCreating && <ActivityIndicator testID="submit-loading" />}
            <Text style={styles.submitButtonText}>
              {isEditMode ? 'Update Campaign' : 'Create Campaign'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  datePicker: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 16,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedProduct: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 8,
  },
  error: {
    color: '#f44336',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});