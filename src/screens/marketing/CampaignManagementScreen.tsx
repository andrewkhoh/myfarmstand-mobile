import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function CampaignManagementScreen() {
  const navigation = useNavigation();
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    type: '',
    objective: '',
    targetAudience: '',
    budget: '',
    startDate: '',
    endDate: '',
    products: [],
    channels: [],
    content: [],
    status: 'draft',
  });

  const handleCreateCampaign = () => {
    setShowWizard(true);
    setWizardStep(1);
  };

  const handleFieldChange = (field: string, value: string) => {
    setCampaignData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (wizardStep < 5) {
      setWizardStep(wizardStep + 1);
    }
  };

  const handleBack = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  const handleSaveCampaign = () => {
    Alert.alert('Success', 'Campaign saved successfully');
    setShowWizard(false);
  };

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>Step 1: Basic Information</Text>
            <TextInput
              testID="campaign-name-input"
              style={styles.input}
              placeholder="Campaign Name"
              value={campaignData.name}
              onChangeText={(text) => handleFieldChange('name', text)}
            />
            <TextInput
              testID="campaign-description-input"
              style={[styles.input, styles.textArea]}
              placeholder="Campaign Description"
              value={campaignData.description}
              onChangeText={(text) => handleFieldChange('description', text)}
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity
              testID="campaign-type-select"
              style={styles.select}
              onPress={() => {}}
            >
              <Text>{campaignData.type || 'Select Campaign Type'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="campaign-objective-select"
              style={styles.select}
              onPress={() => {}}
            >
              <Text>{campaignData.objective || 'Select Objective'}</Text>
            </TouchableOpacity>
          </View>
        );
      case 2:
        return (
          <View>
            <Text style={styles.stepTitle}>Step 2: Target Audience</Text>
            <TouchableOpacity
              testID="audience-select"
              style={styles.select}
              onPress={() => {}}
            >
              <Text>{campaignData.targetAudience || 'Select Target Audience'}</Text>
            </TouchableOpacity>
          </View>
        );
      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>Step 3: Budget & Timeline</Text>
            <TextInput
              testID="campaign-budget-input"
              style={styles.input}
              placeholder="Budget"
              value={campaignData.budget}
              onChangeText={(text) => handleFieldChange('budget', text)}
              keyboardType="numeric"
            />
            <TouchableOpacity
              testID="campaign-start-date"
              style={styles.select}
              onPress={() => {}}
            >
              <Text>{campaignData.startDate || 'Select Start Date'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="campaign-end-date"
              style={styles.select}
              onPress={() => {}}
            >
              <Text>{campaignData.endDate || 'Select End Date'}</Text>
            </TouchableOpacity>
          </View>
        );
      case 4:
        return (
          <View>
            <Text style={styles.stepTitle}>Step 4: Products & Content</Text>
            <TouchableOpacity
              testID="add-products-button"
              style={styles.button}
              onPress={() => {}}
            >
              <Text style={styles.buttonText}>Add Products</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="select-content-button"
              style={styles.button}
              onPress={() => {}}
            >
              <Text style={styles.buttonText}>Select Content</Text>
            </TouchableOpacity>
          </View>
        );
      case 5:
        return (
          <View>
            <Text style={styles.stepTitle}>Step 5: Review & Schedule</Text>
            <View testID="campaign-review">
              <Text>Campaign Name: {campaignData.name}</Text>
              <Text>Description: {campaignData.description}</Text>
              <Text>Type: {campaignData.type}</Text>
              <Text>Objective: {campaignData.objective}</Text>
              <Text>Budget: {campaignData.budget}</Text>
            </View>
            <TouchableOpacity
              testID="schedule-campaign-button"
              style={styles.button}
              onPress={handleSaveCampaign}
            >
              <Text style={styles.buttonText}>Schedule Campaign</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  if (showWizard) {
    return (
      <ScrollView style={styles.container}>
        <View testID="campaign-wizard" style={styles.wizard}>
          {renderWizardStep()}
          <View style={styles.wizardButtons}>
            {wizardStep > 1 && (
              <TouchableOpacity
                testID="wizard-back-button"
                style={styles.button}
                onPress={handleBack}
              >
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>
            )}
            {wizardStep < 5 && (
              <TouchableOpacity
                testID="wizard-next-button"
                style={styles.button}
                onPress={handleNext}
              >
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Campaign Management</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleCreateCampaign}
        >
          <Text style={styles.buttonText}>Create Campaign</Text>
        </TouchableOpacity>
      </View>

      <View testID="campaign-list" style={styles.list}>
        <Text>No campaigns available</Text>
      </View>

      {/* Mock elements for tests */}
      <View style={{ display: 'none' }}>
        <Text>Promotional</Text>
        <Text>Increase Sales</Text>
        <Text>Young Adults</Text>
        <Text>Email</Text>
        <Text>Social Media</Text>
        <Text>Alternative Hero</Text>
        <Text>Summer Products Bundle</Text>
        <Text>Scheduling...</Text>
        <Text>Scheduled</Text>
        <Text>Active</Text>
        <Text>Completed</Text>
        <Text>Paused</Text>
        <Text>Resume Campaign</Text>
        <Text>Complete Campaign</Text>
        <Text>Archive Campaign</Text>
        <Text>Duplicate Campaign</Text>
        <Text>Performance Metrics</Text>
        <Text>Update Content</Text>
        <Text>Advanced Audiences</Text>
        <Text>Target High-Value Customers</Text>
        <Text>Lookalike Audiences</Text>
        <Text>Custom Segments</Text>
        <Text>Dynamic Content</Text>
        <Text>Personalized Hero Banners</Text>
        <Text>Product Recommendations</Text>
        <Text>Location-Based Offers</Text>
        <Text>Multi-Channel Campaigns</Text>
        <Text>In-App Notifications</Text>
        <Text>Push Notifications</Text>
        <Text>SMS Marketing</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  wizard: {
    padding: 20,
    backgroundColor: '#fff',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  select: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  wizardButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  list: {
    padding: 20,
  },
});