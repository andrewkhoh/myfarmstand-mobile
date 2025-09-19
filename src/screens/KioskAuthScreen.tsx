import React, { useState, useRef } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Text, Card } from '../components';
import { useKioskAuth } from '../hooks/useKiosk';
import { spacing } from '../utils/theme';

export const KioskAuthScreen: React.FC = () => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const pinRefs = useRef<(TextInput | null)[]>([]);
  const kioskAuth = useKioskAuth();
  const navigation = useNavigation();

  const handlePinChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');

    // Auto-focus next input or submit when PIN is complete
    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus();
    } else if (newPin.every(digit => digit !== '')) {
      handleKioskAuth(newPin.join(''));
    }
  };

  const handleBackspace = (index: number) => {
    if (pin[index] === '' && index > 0) {
      pinRefs.current[index - 1]?.focus();
      const newPin = [...pin];
      newPin[index - 1] = '';
      setPin(newPin);
    }
  };

  const handleKioskAuth = async (pinValue: string) => {
    if (pinValue.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    try {
      const result = await kioskAuth.mutateAsync(pinValue);
      
      if (result.success) {
        // Navigate to kiosk dashboard with session info
        (navigation as any).navigate('KioskDashboard', {
          sessionId: result.sessionId,
          staffId: result.staffId,
          staffName: result.staffName
        });
      } else {
        setError(result.message || 'Authentication failed');
        setPin(['', '', '', '']);
        pinRefs.current[0]?.focus();
      }
    } catch (error) {
      setError('Authentication failed. Please try again.');
      setPin(['', '', '', '']);
      pinRefs.current[0]?.focus();
    }
  };

  const clearPin = () => {
    setPin(['', '', '', '']);
    setError('');
    pinRefs.current[0]?.focus();
  };

  const navigateBack = () => {
    navigation.goBack();
  };

  return (
    <Screen padding>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="heading1" align="center">
            Staff Access
          </Text>
          <Text variant="body" color="secondary" align="center" style={styles.subtitle}>
            Enter your 4-digit PIN to access kiosk mode
          </Text>
        </View>

        <Card variant="elevated" style={styles.authCard}>
          <View style={styles.pinContainer}>
            {pin.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { pinRefs.current[index] = ref; }}
                style={[
                  styles.pinInput,
                  digit ? styles.pinInputFilled : styles.pinInputEmpty,
                  error ? styles.pinInputError : {}
                ]}
                value={digit}
                onChangeText={(value: any) => handlePinChange(value, index)}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace') {
                    handleBackspace(index);
                  }
                }}
                keyboardType="numeric"
                maxLength={1}
                secureTextEntry
                textAlign="center"
                autoFocus={index === 0}
                selectTextOnFocus
              />
            ))}
          </View>

          {error ? (
            <Text variant="body" color="error" align="center" style={styles.errorText}>
              {error}
            </Text>
          ) : null}

          <View style={styles.buttonContainer}>
            <Button
              title="Clear"
              variant="outline"
              onPress={clearPin}
              style={styles.clearButton}
              disabled={kioskAuth.isPending}
            />
            
            <Button
              title="Authenticate"
              onPress={() => handleKioskAuth(pin.join(''))}
              loading={kioskAuth.isPending}
              disabled={pin.some(digit => digit === '')}
              style={styles.authButton}
            />
          </View>
        </Card>

        <View style={styles.footer}>
          <Button
            title="Back to Main"
            variant="ghost"
            onPress={navigateBack}
            disabled={kioskAuth.isPending}
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
  authCard: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  pinInput: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pinInputEmpty: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  pinInputFilled: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  pinInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    marginBottom: spacing.md,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  clearButton: {
    flex: 1,
  },
  authButton: {
    flex: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});