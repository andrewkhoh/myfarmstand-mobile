import React, { useState } from 'react';
import { View, StyleSheet, Modal, Alert, TextInput, Pressable } from 'react-native';
import { Text, Button, Card } from './index';
import { useKioskContext } from '../contexts';
import { spacing } from '../utils/theme';

export const KioskStaffAuth: React.FC = () => {
  const [pin, setPin] = useState(['', '', '', '']);
  const pinRefs = React.useRef<(TextInput | null)[]>([]);
  
  const {
    isAuthenticationVisible,
    isLoading,
    error,
    hideAuthentication,
    authenticateStaff,
  } = useKioskContext();

  const handlePinChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input or submit when PIN is complete
    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus();
    } else if (newPin.every(digit => digit !== '')) {
      handleAuthenticate(newPin.join(''));
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

  const handleAuthenticate = async (pinValue: string) => {
    if (pinValue.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN');
      return;
    }

    const success = await authenticateStaff(pinValue);
    if (success) {
      // Clear PIN and close modal
      setPin(['', '', '', '']);
      // Modal will close automatically via context state change
    } else {
      // Clear PIN and refocus
      setPin(['', '', '', '']);
      pinRefs.current[0]?.focus();
    }
  };

  const handleClose = () => {
    setPin(['', '', '', '']);
    hideAuthentication();
  };

  const clearPin = () => {
    setPin(['', '', '', '']);
    pinRefs.current[0]?.focus();
  };

  return (
    <Modal
      visible={isAuthenticationVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <Card variant="elevated" style={styles.authCard}>
            <View style={styles.header}>
              <Text variant="heading2" align="center">
                Staff Authentication
              </Text>
              <Text variant="body" color="secondary" align="center" style={styles.subtitle}>
                Enter your 4-digit PIN to start kiosk session
              </Text>
            </View>

            <View style={styles.pinContainer}>
              {pin.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (pinRefs.current[index] = ref)}
                  style={[
                    styles.pinInput,
                    digit ? styles.pinInputFilled : styles.pinInputEmpty,
                    error ? styles.pinInputError : {}
                  ]}
                  value={digit}
                  onChangeText={(value) => handlePinChange(value, index)}
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
                disabled={isLoading}
              />
              
              <Button
                title="Cancel"
                variant="ghost"
                onPress={handleClose}
                style={styles.cancelButton}
                disabled={isLoading}
              />
            </View>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  authCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  pinInput: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderRadius: 8,
    fontSize: 20,
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
  cancelButton: {
    flex: 1,
  },
});