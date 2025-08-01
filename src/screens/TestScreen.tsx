import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Screen, Text, Button, Card, Input, Loading, Toast } from '../components';
import { spacing, colors } from '../utils/theme';

export const TestScreen: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const testValidation = () => {
    if (!inputValue.trim()) {
      setInputError('This field is required');
    } else {
      setInputError('');
      Alert.alert('Success', 'Validation passed!');
    }
  };

  const testLoading = () => {
    setShowLoading(true);
    setTimeout(() => setShowLoading(false), 2000);
  };

  const testToast = () => {
    console.log('Toast test button pressed');
    setShowToast(true);
    console.log('showToast set to true');
    setTimeout(() => {
      console.log('Hiding toast after 3 seconds');
      setShowToast(false);
    }, 3000);
  };

  return (
    <Screen scrollable padding>
      <View style={styles.container}>
        <Text variant="heading1" align="center" style={styles.title}>
          🧪 Design System Test
        </Text>
        
        {/* Typography Test */}
        <Card variant="elevated" style={styles.section}>
          <Text variant="heading3" style={styles.sectionTitle}>Typography</Text>
          <Text variant="heading1">Heading 1</Text>
          <Text variant="heading2">Heading 2</Text>
          <Text variant="heading3">Heading 3</Text>
          <Text variant="body">Body text with normal weight</Text>
          <Text variant="body" weight="medium">Body text with medium weight</Text>
          <Text variant="body" weight="bold">Body text with bold weight</Text>
          <Text variant="caption" color="secondary">Caption text in secondary color</Text>
        </Card>

        {/* Button Variants Test */}
        <Card variant="elevated" style={styles.section}>
          <Text variant="heading3" style={styles.sectionTitle}>Button Variants</Text>
          <Button title="Primary Button" onPress={() => Alert.alert('Primary')} />
          <Button title="Secondary Button" variant="secondary" onPress={() => Alert.alert('Secondary')} />
          <Button title="Outline Button" variant="outline" onPress={() => Alert.alert('Outline')} />
          <Button title="Ghost Button" variant="ghost" onPress={() => Alert.alert('Ghost')} />
          <Button title="Disabled Button" disabled onPress={() => {}} />
        </Card>

        {/* Input Test */}
        <Card variant="elevated" style={styles.section}>
          <Text variant="heading3" style={styles.sectionTitle}>Input Components</Text>
          <Input
            label="Test Input"
            value={inputValue}
            onChangeText={setInputValue}
            error={inputError}
            placeholder="Enter some text"
          />
          <Button title="Test Validation" onPress={testValidation} />
        </Card>

        {/* Card Variants Test */}
        <Card variant="default" style={styles.section}>
          <Text variant="heading3" style={styles.sectionTitle}>Card Variants</Text>
          <Text variant="body">This is a default card</Text>
        </Card>

        <Card variant="elevated" style={styles.section}>
          <Text variant="body">This is an elevated card with shadow</Text>
        </Card>

        {/* Interactive Tests */}
        <Card variant="elevated" style={styles.section}>
          <Text variant="heading3" style={styles.sectionTitle}>Interactive Components</Text>
          <Button title="Test Loading" onPress={testLoading} />
          <Button title="Test Toast" onPress={testToast} />
          <Text variant="caption" color="secondary">
            Toast visible: {showToast ? 'Yes' : 'No'}
          </Text>
        </Card>

        {/* Color System Test */}
        <Card variant="elevated" style={styles.section}>
          <Text variant="heading3" style={styles.sectionTitle}>Color System</Text>
          <View style={styles.colorRow}>
            <View style={[styles.colorBox, { backgroundColor: colors.primary[500] }]} />
            <Text variant="caption">Primary</Text>
          </View>
          <View style={styles.colorRow}>
            <View style={[styles.colorBox, { backgroundColor: colors.neutral[500] }]} />
            <Text variant="caption">Neutral</Text>
          </View>
          <View style={styles.colorRow}>
            <View style={[styles.colorBox, { backgroundColor: colors.success }]} />
            <Text variant="caption">Success</Text>
          </View>
          <View style={styles.colorRow}>
            <View style={[styles.colorBox, { backgroundColor: colors.warning }]} />
            <Text variant="caption">Warning</Text>
          </View>
          <View style={styles.colorRow}>
            <View style={[styles.colorBox, { backgroundColor: colors.error }]} />
            <Text variant="caption">Error</Text>
          </View>
        </Card>
      </View>

      {showLoading && <Loading overlay message="Testing loading..." />}
      {showToast && (
        <Toast
          type="success"
          message="Toast notification test!"
          visible={showToast}
          onHide={() => setShowToast(false)}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  title: {
    marginBottom: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
});
