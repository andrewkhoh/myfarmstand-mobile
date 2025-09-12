import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';

// Progressive loader - uncomment sections one by one to find the issue
export default function App() {
  const [stage, setStage] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const loadStage = (stageNum: number) => {
    try {
      setStage(stageNum);
      setError(null);
    } catch (e) {
      setError(`Stage ${stageNum} failed: ${e}`);
    }
  };

  const renderStage = () => {
    try {
      switch (stage) {
        case 0:
          return <Text style={styles.info}>Click buttons to test each component</Text>;
        
        case 1:
          // Test basic imports
          const StatusBar = require('expo-status-bar').StatusBar;
          return (
            <>
              <Text style={styles.success}>✅ expo-status-bar works</Text>
              <StatusBar style="auto" />
            </>
          );
        
        case 2:
          // Test React Query
          const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
          const queryClient = new QueryClient();
          return (
            <QueryClientProvider client={queryClient}>
              <Text style={styles.success}>✅ React Query works</Text>
            </QueryClientProvider>
          );
        
        case 3:
          // Test Navigation
          const { NavigationContainer } = require('@react-navigation/native');
          return (
            <NavigationContainer>
              <Text style={styles.success}>✅ React Navigation works</Text>
            </NavigationContainer>
          );
        
        case 4:
          // Test Auth Hook
          const { useCurrentUser } = require('./src/hooks/useAuth');
          const UserTest = () => {
            const { data, isLoading } = useCurrentUser();
            return <Text style={styles.success}>✅ useAuth works (loading: {String(isLoading)})</Text>;
          };
          return <UserTest />;
        
        case 5:
          // Test full App
          const FullApp = require('./App.original').default;
          return <FullApp />;
        
        default:
          return <Text>Unknown stage</Text>;
      }
    } catch (e) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>❌ Stage {stage} Error:</Text>
          <Text style={styles.errorText}>{String(e)}</Text>
          <Text style={styles.errorStack}>{e.stack?.split('\n')[0]}</Text>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Progressive App Loader</Text>
        <Text style={styles.subtitle}>Test components one by one</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={() => loadStage(1)}>
            <Text style={styles.buttonText}>1. Status Bar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={() => loadStage(2)}>
            <Text style={styles.buttonText}>2. React Query</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={() => loadStage(3)}>
            <Text style={styles.buttonText}>3. Navigation</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={() => loadStage(4)}>
            <Text style={styles.buttonText}>4. Auth Hook</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.fullAppButton]} onPress={() => loadStage(5)}>
            <Text style={styles.buttonText}>5. Full App</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.resetButton]} onPress={() => loadStage(0)}>
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.resultBox}>
          {renderStage()}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
  },
  fullAppButton: {
    backgroundColor: '#2196F3',
  },
  resetButton: {
    backgroundColor: '#757575',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  resultBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
    minHeight: 100,
  },
  success: {
    color: 'green',
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  errorTitle: {
    color: '#c62828',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  errorStack: {
    color: '#666',
    fontSize: 11,
    marginTop: 5,
    fontFamily: 'monospace',
  },
});