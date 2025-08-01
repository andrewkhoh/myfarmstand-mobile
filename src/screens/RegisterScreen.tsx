import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Text, Input, Button, Card } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { spacing } from '../utils/theme';

export const RegisterScreen: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const { register, isLoading } = useAuth();
  const navigation = useNavigation();

  const validateForm = () => {
    let isValid = true;
    
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    if (!name.trim()) {
      setNameError('Name is required');
      isValid = false;
    }

    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email');
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      await register(email, password, name);
    } catch (error) {
      Alert.alert('Registration Failed', 'Please try again');
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login' as never);
  };

  return (
    <Screen scrollable padding>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="heading1" align="center">
            Create Account
          </Text>
          <Text variant="body" color="secondary" align="center" style={styles.subtitle}>
            Join the Farm Stand community
          </Text>
        </View>

        <Card variant="elevated" style={styles.form}>
          <Input
            label="Full Name"
            value={name}
            onChangeText={setName}
            error={nameError}
            placeholder="Enter your full name"
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Enter your email"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            secureTextEntry
            placeholder="Create a password"
          />

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={confirmPasswordError}
            secureTextEntry
            placeholder="Confirm your password"
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            style={styles.registerButton}
          />

          <View style={styles.loginContainer}>
            <Text variant="body" color="secondary">
              Already have an account?{' '}
            </Text>
            <Button
              title="Sign In"
              variant="ghost"
              onPress={navigateToLogin}
              style={styles.loginButton}
            />
          </View>
        </Card>
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
  form: {
    marginBottom: spacing.lg,
  },
  registerButton: {
    marginTop: spacing.md,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  loginButton: {
    paddingHorizontal: 0,
    minHeight: 0,
  },
});
