import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ScrollView
} from 'react-native';
import { useErrorRecovery } from '../../hooks/error/useErrorRecovery';
import { AppError } from '../../services/error/errorRecoveryService';

interface ErrorReporterProps {
  visible: boolean;
  error: AppError | Error | null;
  onClose: () => void;
  onSubmit?: (feedback: string) => void;
}

export function ErrorReporter({ visible, error, onClose, onSubmit }: ErrorReporterProps) {
  const [userFeedback, setUserFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleError } = useErrorRecovery({
    showUserFriendlyMessages: false,
    silentRecovery: true
  });

  const handleSubmit = useCallback(async () => {
    if (!error) return;

    setIsSubmitting(true);

    try {
      // Submit feedback to error recovery service
      await handleError(error instanceof Error ? error : new Error(error.message), {
        userFeedback,
        reportedBy: 'user',
        screen: 'error_reporter',
        action: 'manual_report'
      });

      onSubmit?.(userFeedback);

      Alert.alert(
        'Report Submitted',
        'Thank you for helping us improve the app. Your feedback has been recorded.',
        [{ text: 'OK', onPress: onClose }]
      );

      setUserFeedback('');
    } catch (submitError) {
      console.error('Failed to submit error report:', submitError);
      Alert.alert(
        'Submission Failed',
        'We couldn\'t submit your report right now. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [error, userFeedback, handleError, onSubmit, onClose]);

  const getErrorInfo = () => {
    if (!error) return null;

    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'UNKNOWN_ERROR',
        severity: 'medium' as const
      };
    }

    return {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      severity: error.severity || 'medium'
    };
  };

  const errorInfo = getErrorInfo();

  if (!visible || !error || !errorInfo) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Report Error</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.errorSection}>
            <Text style={styles.sectionTitle}>Error Details</Text>

            <View style={styles.errorCard}>
              <View style={styles.errorHeader}>
                <Text style={styles.errorCode}>{errorInfo.code}</Text>
                <View style={[styles.severityBadge, styles[`severity${errorInfo.severity}`]]}>
                  <Text style={styles.severityText}>{errorInfo.severity}</Text>
                </View>
              </View>

              <Text style={styles.errorMessage}>{errorInfo.message}</Text>

              {error instanceof Error && error.stack && __DEV__ && (
                <View style={styles.stackTrace}>
                  <Text style={styles.stackTitle}>Stack Trace:</Text>
                  <Text style={styles.stackText}>{error.stack}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.feedbackSection}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            <Text style={styles.feedbackLabel}>
              Please describe what you were doing when this error occurred:
            </Text>

            <TextInput
              style={styles.feedbackInput}
              value={userFeedback}
              onChangeText={setUserFeedback}
              placeholder="Describe the steps that led to this error..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>How you can help:</Text>
            <Text style={styles.helpText}>
              • Describe what you were trying to do{'\n'}
              • Mention if this happens frequently{'\n'}
              • Include any error messages you saw{'\n'}
              • Note if restarting the app helps
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529'
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6c757d'
  },
  content: {
    flex: 1,
    padding: 20
  },
  errorSection: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12
  },
  errorCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545'
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  errorCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    fontFamily: 'monospace'
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  severitylow: {
    backgroundColor: '#d1ecf1'
  },
  severitymedium: {
    backgroundColor: '#fff3cd'
  },
  severityhigh: {
    backgroundColor: '#f8d7da'
  },
  severitycritical: {
    backgroundColor: '#d1ecf1'
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057'
  },
  errorMessage: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20
  },
  stackTrace: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 4
  },
  stackTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4
  },
  stackText: {
    fontSize: 10,
    color: '#6c757d',
    fontFamily: 'monospace'
  },
  feedbackSection: {
    marginBottom: 24
  },
  feedbackLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    backgroundColor: '#fff'
  },
  helpSection: {
    backgroundColor: '#e7f3ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066cc',
    marginBottom: 8
  },
  helpText: {
    fontSize: 13,
    color: '#004499',
    lineHeight: 18
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef'
  },
  submitButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d'
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600'
  }
});