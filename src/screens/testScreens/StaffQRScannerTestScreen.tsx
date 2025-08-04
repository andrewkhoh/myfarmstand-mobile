import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, Card } from '../../components';
import { spacing, colors } from '../../utils/theme';
import { useCurrentUser } from '../../hooks/useAuth';

interface TestResult {
  testName: string;
  status: 'pending' | 'pass' | 'fail';
  details?: string;
}

export const StaffQRScannerTestScreen: React.FC = () => {
  const { data: user } = useCurrentUser();
  const [testResults, setTestResults] = useState<TestResult[]>([
    { testName: 'Staff Access Control', status: 'pending' },
    { testName: 'Camera Permission Request', status: 'pending' },
    { testName: 'QR Code Scanning', status: 'pending' },
    { testName: 'Order Data Validation', status: 'pending' },
    { testName: 'Order Status Update', status: 'pending' },
    { testName: 'Error Handling', status: 'pending' },
    { testName: 'UI/UX Flow', status: 'pending' },
  ]);

  const updateTestResult = (testName: string, status: 'pass' | 'fail', details?: string) => {
    setTestResults(prev => prev.map(test => 
      test.testName === testName 
        ? { ...test, status, details }
        : test
    ));
  };

  const resetAllTests = () => {
    setTestResults(prev => prev.map(test => ({ ...test, status: 'pending', details: undefined })));
  };

  const getTestIcon = (status: 'pending' | 'pass' | 'fail') => {
    switch (status) {
      case 'pass':
        return <Ionicons name="checkmark-circle" size={24} color={colors.success} />;
      case 'fail':
        return <Ionicons name="close-circle" size={24} color={colors.error} />;
      default:
        return <Ionicons name="ellipse-outline" size={24} color={colors.text.tertiary} />;
    }
  };

  const getOverallStatus = () => {
    const passCount = testResults.filter(test => test.status === 'pass').length;
    const failCount = testResults.filter(test => test.status === 'fail').length;
    const totalTests = testResults.length;

    if (failCount > 0) {
      return { status: 'fail', message: `${failCount} test(s) failed` };
    } else if (passCount === totalTests) {
      return { status: 'pass', message: 'All tests passed!' };
    } else {
      return { status: 'pending', message: `${passCount}/${totalTests} tests completed` };
    }
  };

  const showTestInstructions = (testName: string) => {
    const instructions: { [key: string]: string } = {
      'Staff Access Control': `
**Expected Behavior:**
- Only users with role 'admin', 'manager', or 'staff' should see the QR Scanner tab
- Non-staff users should see "Access Restricted" message when accessing the screen
- Lock icon and appropriate error message should be displayed

**Test Instructions:**
1. Check if QR Scanner tab is visible in bottom navigation (should only show for staff)
2. If you're not staff, try accessing the screen directly
3. Verify access control message is shown for non-staff users

**Pass Criteria:**
□ QR Scanner tab only visible to staff users
□ Non-staff users see access restriction message
□ Appropriate lock icon and messaging displayed`,

      'Camera Permission Request': `
**Expected Behavior:**
- App should request camera permissions on first access
- Clear permission request message should be displayed
- Appropriate handling of granted/denied permissions
- Fallback UI for denied permissions

**Test Instructions:**
1. Navigate to Staff QR Scanner screen
2. Grant camera permissions when prompted
3. Try denying permissions and check fallback UI
4. Verify permission status is handled correctly

**Pass Criteria:**
□ Camera permission requested appropriately
□ Clear messaging about permission requirement
□ Proper handling of granted permissions
□ Appropriate fallback for denied permissions`,

      'QR Code Scanning': `
**Expected Behavior:**
- Camera view should display with scanning overlay
- QR code scanning frame should be visible and centered
- Scanner should detect valid QR codes automatically
- Clear instructions should guide the user

**Test Instructions:**
1. Point camera at a customer's pickup order QR code
2. Verify scanning frame is visible and properly positioned
3. Test with valid order QR codes
4. Check that scanning stops after successful scan

**Pass Criteria:**
□ Camera view displays correctly
□ Scanning frame is visible and centered
□ QR codes are detected automatically
□ Clear scanning instructions provided`,

      'Order Data Validation': `
**Expected Behavior:**
- Scanned QR code data should be parsed and validated
- Invalid QR codes should show appropriate error messages
- Order information should be displayed clearly
- All required order fields should be present

**Test Instructions:**
1. Scan a valid pickup order QR code
2. Try scanning invalid/malformed QR codes
3. Verify order details are displayed correctly
4. Check that all customer and order info is shown

**Pass Criteria:**
□ Valid QR codes parsed successfully
□ Invalid QR codes show error messages
□ Order details displayed clearly
□ Customer information shown correctly`,

      'Order Status Update': `
**Expected Behavior:**
- "Mark as Picked Up" button should update order status
- Success confirmation should be displayed
- Order should be marked as 'picked_up' in the system
- Loading state should be shown during update

**Test Instructions:**
1. Scan a valid order QR code
2. Tap "Mark as Picked Up" button
3. Verify loading state is shown
4. Check success confirmation message
5. Confirm order status was updated

**Pass Criteria:**
□ Order status updates successfully
□ Loading state shown during update
□ Success confirmation displayed
□ Order marked as 'picked_up' in system`,

      'Error Handling': `
**Expected Behavior:**
- Network errors should be handled gracefully
- Invalid order IDs should show appropriate errors
- User should be able to retry failed operations
- Clear error messages should guide the user

**Test Instructions:**
1. Try scanning QR codes with invalid order data
2. Test with non-existent order IDs
3. Simulate network errors (if possible)
4. Verify retry mechanisms work correctly

**Pass Criteria:**
□ Invalid QR codes handled gracefully
□ Non-existent orders show appropriate errors
□ Network errors handled with retry options
□ Clear error messages provided`,

      'UI/UX Flow': `
**Expected Behavior:**
- Smooth transition between scanning and order details
- Modal displays order information clearly
- Easy navigation back to scanning mode
- Intuitive button placement and actions

**Test Instructions:**
1. Complete full flow: scan → view details → mark picked up
2. Test "Scan Another Code" functionality
3. Verify modal can be dismissed properly
4. Check overall user experience and flow

**Pass Criteria:**
□ Smooth transitions between screens
□ Order details modal displays clearly
□ Easy return to scanning mode
□ Intuitive and user-friendly interface`
    };

    Alert.alert(
      `Test: ${testName}`,
      instructions[testName] || 'No specific instructions available.',
      [{ text: 'Got it', style: 'default' }]
    );
  };

  const overallStatus = getOverallStatus();

  return (
    <Screen>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Staff QR Scanner Test Suite</Text>
          <Text style={styles.subtitle}>
            Comprehensive testing for staff pickup verification system
          </Text>
          
          <Card variant="outlined" style={styles.statusCard}>
            <View style={styles.statusHeader}>
              {getTestIcon(overallStatus.status as any)}
              <Text style={[styles.statusText, { color: getStatusColor(overallStatus.status) }]}>
                {overallStatus.message}
              </Text>
            </View>
          </Card>
        </View>

        <View style={styles.testSection}>
          <Text style={styles.sectionTitle}>Test Categories</Text>
          
          {testResults.map((test, index) => (
            <Card key={index} variant="outlined" style={styles.testCard}>
              <View style={styles.testHeader}>
                <View style={styles.testInfo}>
                  {getTestIcon(test.status)}
                  <Text style={styles.testName}>{test.testName}</Text>
                </View>
                <View style={styles.testActions}>
                  <Button
                    title="Info"
                    variant="ghost"
                    size="sm"
                    onPress={() => showTestInstructions(test.testName)}
                    style={styles.infoButton}
                  />
                </View>
              </View>
              
              {test.details && (
                <Text style={styles.testDetails}>{test.details}</Text>
              )}
              
              <View style={styles.testButtons}>
                <Button
                  title="Pass"
                  variant="outline"
                  size="sm"
                  onPress={() => updateTestResult(test.testName, 'pass')}
                  style={{...styles.testButton, ...styles.passButton}}
                />
                <Button
                  title="Fail"
                  variant="outline"
                  size="sm"
                  onPress={() => updateTestResult(test.testName, 'fail')}
                  style={{...styles.testButton, ...styles.failButton}}
                />
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            title="Reset All Tests"
            variant="outline"
            onPress={resetAllTests}
            style={styles.resetButton}
          />
        </View>

        <View style={styles.info}>
          <Card variant="outlined" style={styles.infoCard}>
            <Text style={styles.infoTitle}>Testing Notes</Text>
            <Text style={styles.infoText}>
              • This test suite validates the complete staff QR scanner workflow{'\n'}
              • Requires staff-level access (admin, manager, or staff role){'\n'}
              • Tests camera permissions, QR scanning, and order management{'\n'}
              • Validates both happy path and error scenarios{'\n'}
              • Ensures secure pickup verification process
            </Text>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pass':
      return colors.success;
    case 'fail':
      return colors.error;
    default:
      return colors.text.secondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.primary[50],
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  statusCard: {
    backgroundColor: colors.background,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  testSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  testCard: {
    marginBottom: spacing.md,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  testInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  testName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  testActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  infoButton: {
    minWidth: 60,
  },
  testDetails: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  testButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  testButton: {
    flex: 1,
  },
  passButton: {
    borderColor: colors.success,
  },
  failButton: {
    borderColor: colors.error,
  },
  actions: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  resetButton: {
    marginBottom: spacing.lg,
  },
  info: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  infoCard: {
    backgroundColor: colors.primary[50],
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
