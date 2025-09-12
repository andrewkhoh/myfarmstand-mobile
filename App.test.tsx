import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24 }}>App is Loading!</Text>
      <Text style={{ fontSize: 16, marginTop: 10 }}>If you see this, React Native Web is working.</Text>
    </View>
  );
}