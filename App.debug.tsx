import React from 'react';
import { View, Text } from 'react-native';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('App Error:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 24, color: 'red' }}>App Error!</Text>
          <Text style={{ fontSize: 14, marginTop: 10 }}>{this.state.error?.message}</Text>
          <Text style={{ fontSize: 12, marginTop: 10, fontFamily: 'monospace' }}>
            {this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  console.log('App.debug starting...');
  
  try {
    // Try to load the real app
    const RealApp = require('./App.original').default;
    console.log('Loading real app...');
    
    return (
      <ErrorBoundary>
        <RealApp />
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Failed to load app:', error);
    
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 24, color: 'red' }}>Loading Error!</Text>
        <Text style={{ fontSize: 14, marginTop: 10 }}>{String(error)}</Text>
        <Text style={{ fontSize: 12, marginTop: 20 }}>
          Check browser console for details (F12)
        </Text>
      </View>
    );
  }
}