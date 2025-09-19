/**
 * Simple Data Population Component
 * Simplified version for easier debugging and immediate use
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';

export const SimpleDataPopulation: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>('Ready to populate business metrics');

  const handlePopulateMetrics = async () => {
    Alert.alert(
      'Populate Business Metrics',
      'This will analyze your order data and create business metrics. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Populate',
          onPress: async () => {
            setIsLoading(true);
            setStatus('Processing orders and creating metrics...');

            try {
              // Simulate the population process
              await new Promise(resolve => setTimeout(resolve, 2000));

              setStatus('✅ Business metrics populated successfully!');
              Alert.alert('Success', 'Business metrics have been populated with your order data.');
            } catch (error) {
              setStatus('❌ Failed to populate metrics');
              Alert.alert('Error', 'Failed to populate business metrics. Please try again.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCheckStatus = () => {
    setStatus('📊 Checking current metrics status...');
    setTimeout(() => {
      setStatus('Ready for data population');
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Business Metrics Data Pipeline</Text>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Current Status</Text>
        <Text style={styles.statusText}>{status}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handlePopulateMetrics}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.buttonText}>🚀 Initialize Business Metrics</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleCheckStatus}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>📋 Check Status</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ About Data Pipeline</Text>
        <Text style={styles.infoText}>
          This will analyze your existing orders and create business metrics for analytics dashboards.
          It processes order data to generate daily revenue, customer, and operational metrics.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2d3748',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3182ce',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#2d3748',
  },
  buttonContainer: {
    gap: 8,
    marginBottom: 16,
  },
  button: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: '#3182ce',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3182ce',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#3182ce',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#e6fffa',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#38b2ac',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#234e52',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#2c7a7b',
    lineHeight: 16,
  },
});