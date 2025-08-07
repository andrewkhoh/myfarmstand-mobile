import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { supabase } from '../../config/supabase';

/**
 * Simple Broadcast Test - Direct Supabase Channel Test
 * Tests broadcast functionality with a single, dedicated channel
 */
export const SimpleBroadcastTest: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('Not Connected');
  const [testChannel, setTestChannel] = useState<any>(null);

  useEffect(() => {
    console.log('🧪 Setting up simple broadcast test...');
    
    // Create a completely fresh test channel with unique name
    const channel = supabase
      .channel('fresh-broadcast-test-2025')
      .on(
        'broadcast',
        { event: 'test-event' },
        (payload) => {
          console.log('🎯 RECEIVED TEST EVENT:', payload);
          setEvents(prev => [...prev, {
            ...payload,
            receivedAt: new Date().toISOString()
          }]);
        }
      )
      .subscribe((status) => {
        console.log(`🔗 Test channel status: ${status}`);
        setStatus(status);
      });

    // Store the channel instance for sending events
    setTestChannel(channel);

    return () => {
      console.log('🧹 Cleaning up simple test channel...');
      channel.unsubscribe();
    };
  }, []);

  const sendTestEvent = async () => {
    if (!testChannel) {
      console.error('❌ No test channel available');
      return;
    }

    try {
      console.log('📤 Sending test event through stored channel...');
      
      // Use the SAME channel instance that has the event listeners
      await testChannel.send({
        type: 'broadcast',
        event: 'test-event',
        payload: {
          message: 'Hello from simple test!',
          timestamp: new Date().toISOString(),
          random: Math.random()
        }
      });
      
      console.log('✅ Test event sent through stored channel');
    } catch (error) {
      console.error('❌ Failed to send test event:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Simple Broadcast Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text style={[styles.status, { color: status === 'SUBSCRIBED' ? 'green' : 'red' }]}>
          {status}
        </Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.button} onPress={sendTestEvent}>
          <Text style={styles.buttonText}>Send Test Event</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Received Events ({events.length})</Text>
        {events.length === 0 ? (
          <Text style={styles.noEvents}>No events received</Text>
        ) : (
          events.map((event, index) => (
            <View key={index} style={styles.eventItem}>
              <Text style={styles.eventIndex}>Event #{index + 1}</Text>
              <Text style={styles.eventData}>{JSON.stringify(event, null, 2)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.instruction}>1. Wait for status to show "SUBSCRIBED"</Text>
        <Text style={styles.instruction}>2. Tap "Send Test Event"</Text>
        <Text style={styles.instruction}>3. Check if event appears above</Text>
        <Text style={styles.instruction}>4. Check console logs for details</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noEvents: {
    fontStyle: 'italic',
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  eventItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginBottom: 8,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  eventIndex: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  eventData: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  instruction: {
    fontSize: 14,
    marginBottom: 4,
  },
});
