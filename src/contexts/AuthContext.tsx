import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthState, User } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  clearUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'LOGOUT' };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        // For development/testing, always use the latest role setting
        const updatedUser = {
          ...user,
          role: 'admin', // Always use admin for testing
        };
        dispatch({ type: 'SET_USER', payload: updatedUser });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Function to clear stored user data for testing
  const clearUserData = async () => {
    try {
      await AsyncStorage.removeItem('user');
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  };

  const login = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    // Mock authentication - replace with actual API call
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: User = {
        id: '1',
        email,
        name: email.split('@')[0],
        role: 'admin',
        // role: 'customer',
      };
      
      await AsyncStorage.setItem('user', JSON.stringify(mockUser));
      dispatch({ type: 'SET_USER', payload: mockUser });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw new Error('Login failed');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    // Mock registration - replace with actual API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: User = {
        id: Date.now().toString(),
        email,
        name,
        role: 'customer',
      };
      
      await AsyncStorage.setItem('user', JSON.stringify(mockUser));
      dispatch({ type: 'SET_USER', payload: mockUser });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw new Error('Registration failed');
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        clearUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
