import React, { useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Text, Input, Card, Button } from '../components';
import { useLoginMutation } from '../hooks/useAuth';
import { spacing } from '../utils/theme';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const loginMutation = useLoginMutation();
  const navigation = useNavigation();

  const validateForm = () => {
    let isValid = true;
    
    setEmailError('');
    setPasswordError('');

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

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      await loginMutation.mutateAsync({ email, password });
    } catch (error) {
      Alert.alert('Login Failed', 'Invalid email or password');
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register' as never);
  };

  return (
    <Screen scrollable padding>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="heading1" align="center">
            Welcome Back
          </Text>
          <Text variant="body" color="secondary" align="center" style={styles.subtitle}>
            Sign in to your Farm Stand account
          </Text>
        </View>

        <Card variant="elevated" style={styles.form}>
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
            placeholder="Enter your password"
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loginMutation.isPending}
            style={styles.loginButton}
          />

          <View style={styles.registerContainer}>
            <Text variant="body" color="secondary">
              Don't have an account?{' '}
            </Text>
            <Button
              title="Sign Up"
              variant="ghost"
              onPress={navigateToRegister}
              style={styles.registerButton}
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
  loginButton: {
    marginTop: spacing.md,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  registerButton: {
    paddingHorizontal: 0,
    minHeight: 0,
  },
});
