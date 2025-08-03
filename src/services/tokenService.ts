import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Keys for secure storage
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

/**
 * Secure token storage service
 * Uses SecureStore on native platforms, AsyncStorage on web
 */
export class TokenService {
  private static isSecureStoreAvailable(): boolean {
    return Platform.OS !== 'web' && SecureStore.isAvailableAsync !== undefined;
  }

  static async setAccessToken(token: string): Promise<void> {
    try {
      if (this.isSecureStoreAvailable()) {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
      } else {
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
      }
    } catch (error) {
      console.error('Error storing access token:', error);
      throw error;
    }
  }

  static async getAccessToken(): Promise<string | null> {
    try {
      if (this.isSecureStoreAvailable()) {
        return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      } else {
        return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error retrieving access token:', error);
      return null;
    }
  }

  static async setRefreshToken(token: string): Promise<void> {
    try {
      if (this.isSecureStoreAvailable()) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
      } else {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
      }
    } catch (error) {
      console.error('Error storing refresh token:', error);
      throw error;
    }
  }

  static async getRefreshToken(): Promise<string | null> {
    try {
      if (this.isSecureStoreAvailable()) {
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      } else {
        return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      }
    } catch (error) {
      console.error('Error retrieving refresh token:', error);
      return null;
    }
  }

  static async setUser(user: any): Promise<void> {
    try {
      const userJson = JSON.stringify(user);
      if (this.isSecureStoreAvailable()) {
        await SecureStore.setItemAsync(USER_KEY, userJson);
      } else {
        await AsyncStorage.setItem(USER_KEY, userJson);
      }
    } catch (error) {
      console.error('Error storing user:', error);
      throw error;
    }
  }

  static async getUser(): Promise<any | null> {
    try {
      let userJson: string | null;
      if (this.isSecureStoreAvailable()) {
        userJson = await SecureStore.getItemAsync(USER_KEY);
      } else {
        userJson = await AsyncStorage.getItem(USER_KEY);
      }
      
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error retrieving user:', error);
      return null;
    }
  }

  static async clearAllTokens(): Promise<void> {
    try {
      if (this.isSecureStoreAvailable()) {
        await Promise.all([
          SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {}),
          SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {}),
          SecureStore.deleteItemAsync(USER_KEY).catch(() => {}),
        ]);
      } else {
        await Promise.all([
          AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
          AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
          AsyncStorage.removeItem(USER_KEY),
        ]);
      }
    } catch (error) {
      console.error('Error clearing tokens:', error);
      throw error;
    }
  }

  static async hasValidTokens(): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      return !!accessToken;
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  }
}
