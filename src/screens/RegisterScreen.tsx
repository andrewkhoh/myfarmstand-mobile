import React, { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Text, Input, Card, Button } from '../components';
import { useRegisterMutation, useCurrentUser } from '../hooks/useAuth';
import { spacing } from '../utils/theme';

export const RegisterScreen: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const registerMutation = useRegisterMutation();
  const navigation = useNavigation();

  const validateForm = () => {
    let isValid = true;
    
    setNameError('');
    setEmailError('');
    setPhoneError('');
    setAddressError('');
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

    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      isValid = false;
    } else if (phone.length < 10) {
      setPhoneError('Phone number must be at least 10 digits');
      isValid = false;
    }
    
    if (!address.trim()) {
      setAddressError('Address is required');
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
      const result = await registerMutation.mutateAsync({ email, password, name, phone, address });
      
      if (result.success) {
        if (result?.data?.user) {
          // Email confirmation disabled - user is logged in immediately
          Alert.alert(
            'Welcome to Farm Stand!', 
            'Your account has been created successfully. You are now logged in and ready to start shopping!',
            [
              {
                text: 'Start Shopping',
                onPress: () => {}
              }
            ]
          );
        } else {
          // Email confirmation enabled - user needs to confirm email first
          Alert.alert(
            'Registration Successful!', 
            'Your account has been created successfully. Please check your email to confirm your account, then return to log in.',
            [
              {
                text: 'Go to Login',
                onPress: () => navigation.navigate('Login' as never)
              }
            ]
          );
        }
      } else {
        Alert.alert('Registration Failed', result.message || 'Please try again');
      }
    } catch (error) {
      Alert.alert('Registration Failed', 'Please try again');
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login' as never);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            error={phoneError}
            keyboardType="phone-pad"
            placeholder="Enter your phone number"
          />

          <Input
            label="Address"
            value={address}
            onChangeText={setAddress}
            error={addressError}
            placeholder="Enter your address"
            multiline
            numberOfLines={2}
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
            loading={registerMutation.isPending}
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
        
        {/* Extra space at bottom to ensure last fields are accessible */}
        <View style={styles.bottomSpacer} />
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    minHeight: 600, // Ensure minimum height for proper scrolling
  },
  header: {
    marginBottom: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
  form: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  bottomSpacer: {
    height: 100, // Extra space at bottom for keyboard clearance
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
