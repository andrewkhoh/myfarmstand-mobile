/**
 * Simplified Broadcast Mock
 * 
 * Standalone real-time broadcast mock for testing WebSocket-like functionality.
 * Manages channels, presence, and broadcasts without complex chaining.
 */

import { jest } from '@jest/globals';

interface PresenceState {
  [key: string]: any;
}

interface BroadcastMessage {
  event: string;
  payload: any;
  type?: string;
}

interface ChannelState {
  name: string;
  isSubscribed: boolean;
  presence: Map<string, PresenceState>;
  listeners: Map<string, Set<Function>>;
  broadcastQueue: BroadcastMessage[];
}

interface BroadcastOptions {
  simulateLatency?: number;
  autoAcknowledge?: boolean;
  maxRetries?: number;
}

export class SimplifiedBroadcastMock {
  private channels: Map<string, ChannelState> = new Map();
  private options: BroadcastOptions;
  private globalListeners: Set<(channel: string, message: BroadcastMessage) => void> = new Set();
  
  constructor(options: BroadcastOptions = {}) {
    this.options = {
      simulateLatency: 0,
      autoAcknowledge: true,
      maxRetries: 3,
      ...options
    };
  }
  
  /**
   * Create the mock broadcast/channel client
   */
  createClient() {
    const self = this;
    
    return {
      /**
       * Create or get a channel
       */
      channel: jest.fn((channelName: string, options?: any) => {
        if (!self.channels.has(channelName)) {
          self.channels.set(channelName, {
            name: channelName,
            isSubscribed: false,
            presence: new Map(),
            listeners: new Map(),
            broadcastQueue: []
          });
        }
        
        const channelState = self.channels.get(channelName)!;
        
        return {
          /**
           * Subscribe to channel events
           */
          on: jest.fn().mockImplementation((
            eventType: string,
            filter: any,
            callback?: Function
          ) => {
            // Handle both (event, callback) and (event, filter, callback) signatures
            const handler = typeof filter === 'function' ? filter : callback;
            
            if (!handler) return this;
            
            if (!channelState.listeners.has(eventType)) {
              channelState.listeners.set(eventType, new Set());
            }
            
            channelState.listeners.get(eventType)!.add(handler);
            
            // Return channel for chaining
            return this;
          }),
          
          /**
           * Subscribe to the channel
           */
          subscribe: jest.fn().mockImplementation(async (callback?: Function) => {
            // Simulate latency
            if (self.options.simulateLatency) {
              await new Promise(resolve => 
                setTimeout(resolve, self.options.simulateLatency)
              );
            }
            
            channelState.isSubscribed = true;
            
            // Process any queued broadcasts
            while (channelState.broadcastQueue.length > 0) {
              const message = channelState.broadcastQueue.shift()!;
              self.deliverMessage(channelName, message);
            }
            
            if (callback) {
              callback('SUBSCRIBED', null);
            }
            
            return { status: 'SUBSCRIBED' };
          }),
          
          /**
           * Unsubscribe from the channel
           */
          unsubscribe: jest.fn().mockImplementation(async () => {
            // Simulate latency
            if (self.options.simulateLatency) {
              await new Promise(resolve => 
                setTimeout(resolve, self.options.simulateLatency)
              );
            }
            
            channelState.isSubscribed = false;
            channelState.presence.clear();
            channelState.listeners.clear();
            
            return { status: 'UNSUBSCRIBED' };
          }),
          
          /**
           * Send a broadcast message
           */
          send: jest.fn().mockImplementation(async (message: {
            type: string;
            event: string;
            payload: any;
          }) => {
            // Simulate latency
            if (self.options.simulateLatency) {
              await new Promise(resolve => 
                setTimeout(resolve, self.options.simulateLatency)
              );
            }
            
            if (!channelState.isSubscribed) {
              return {
                status: 'ERROR',
                error: 'Channel not subscribed'
              };
            }
            
            const broadcastMessage: BroadcastMessage = {
              event: message.event,
              payload: message.payload,
              type: message.type || 'broadcast'
            };
            
            // Deliver to all listeners
            self.deliverMessage(channelName, broadcastMessage);
            
            return { status: 'OK' };
          }),
          
          /**
           * Track presence
           */
          track: jest.fn().mockImplementation(async (state: PresenceState) => {
            // Simulate latency
            if (self.options.simulateLatency) {
              await new Promise(resolve => 
                setTimeout(resolve, self.options.simulateLatency)
              );
            }
            
            if (!channelState.isSubscribed) {
              return {
                status: 'ERROR',
                error: 'Channel not subscribed'
              };
            }
            
            // Generate a unique presence key (in real implementation, this would be the user's ID)
            const presenceKey = `user-${Date.now()}`;
            channelState.presence.set(presenceKey, state);
            
            // Notify presence listeners
            const presenceListeners = channelState.listeners.get('presence') || new Set();
            const presenceState = Array.from(channelState.presence.entries()).map(([key, state]) => ({
              presence_ref: key,
              ...state
            }));
            
            for (const listener of presenceListeners) {
              listener({
                event: 'sync',
                payload: presenceState
              });
            }
            
            return { status: 'OK' };
          }),
          
          /**
           * Untrack presence
           */
          untrack: jest.fn().mockImplementation(async () => {
            // Simulate latency
            if (self.options.simulateLatency) {
              await new Promise(resolve => 
                setTimeout(resolve, self.options.simulateLatency)
              );
            }
            
            // Clear user's presence (in real implementation, would use user's ID)
            const presenceKey = Array.from(channelState.presence.keys())[0];
            if (presenceKey) {
              channelState.presence.delete(presenceKey);
              
              // Notify presence listeners
              const presenceListeners = channelState.listeners.get('presence') || new Set();
              const presenceState = Array.from(channelState.presence.entries()).map(([key, state]) => ({
                presence_ref: key,
                ...state
              }));
              
              for (const listener of presenceListeners) {
                listener({
                  event: 'sync',
                  payload: presenceState
                });
              }
            }
            
            return { status: 'OK' };
          }),
          
          /**
           * Get current presence state
           */
          presenceState: jest.fn().mockImplementation(() => {
            return Array.from(channelState.presence.entries()).map(([key, state]) => ({
              presence_ref: key,
              ...state
            }));
          }),
          
          // Test helper: Trigger an event manually
          _trigger: (event: string, payload: any) => {
            self.deliverMessage(channelName, {
              event,
              payload,
              type: 'broadcast'
            });
          },
          
          // Test helper: Get channel state
          _getState: () => channelState
        };
      }),
      
      /**
       * Remove a channel
       */
      removeChannel: jest.fn().mockImplementation(async (channelName: string) => {
        const channel = self.channels.get(channelName);
        if (channel) {
          channel.isSubscribed = false;
          channel.listeners.clear();
          channel.presence.clear();
          self.channels.delete(channelName);
        }
        return { status: 'OK' };
      }),
      
      /**
       * Get all channels
       */
      getChannels: jest.fn().mockImplementation(() => {
        return Array.from(self.channels.keys());
      })
    };
  }
  
  /**
   * Deliver a message to channel listeners
   */
  private deliverMessage(channelName: string, message: BroadcastMessage) {
    const channel = this.channels.get(channelName);
    if (!channel || !channel.isSubscribed) {
      // Queue message if channel exists but not subscribed
      if (channel) {
        channel.broadcastQueue.push(message);
      }
      return;
    }
    
    // Deliver to channel-specific listeners
    const listeners = channel.listeners.get(message.event) || new Set();
    for (const listener of listeners) {
      // Wrap in setTimeout to simulate async delivery
      setTimeout(() => listener(message), 0);
    }
    
    // Deliver to wildcard listeners
    const wildcardListeners = channel.listeners.get('*') || new Set();
    for (const listener of wildcardListeners) {
      setTimeout(() => listener(message), 0);
    }
    
    // Deliver to global listeners (for testing)
    for (const listener of this.globalListeners) {
      setTimeout(() => listener(channelName, message), 0);
    }
  }
  
  /**
   * Test helper: Broadcast to all channels
   */
  broadcastToAll(event: string, payload: any) {
    for (const [channelName, channel] of this.channels) {
      if (channel.isSubscribed) {
        this.deliverMessage(channelName, {
          event,
          payload,
          type: 'broadcast'
        });
      }
    }
  }
  
  /**
   * Test helper: Simulate a user joining
   */
  simulateUserJoin(channelName: string, userId: string, metadata: any = {}) {
    const channel = this.channels.get(channelName);
    if (!channel || !channel.isSubscribed) return;
    
    channel.presence.set(userId, {
      user_id: userId,
      online_at: new Date().toISOString(),
      ...metadata
    });
    
    this.deliverMessage(channelName, {
      event: 'presence',
      payload: {
        event: 'join',
        key: userId,
        currentPresences: Array.from(channel.presence.entries()).map(([key, state]) => ({
          presence_ref: key,
          ...state
        })),
        newPresences: [{
          presence_ref: userId,
          user_id: userId,
          online_at: new Date().toISOString(),
          ...metadata
        }]
      },
      type: 'presence'
    });
  }
  
  /**
   * Test helper: Simulate a user leaving
   */
  simulateUserLeave(channelName: string, userId: string) {
    const channel = this.channels.get(channelName);
    if (!channel || !channel.isSubscribed) return;
    
    const leftPresence = channel.presence.get(userId);
    if (!leftPresence) return;
    
    channel.presence.delete(userId);
    
    this.deliverMessage(channelName, {
      event: 'presence',
      payload: {
        event: 'leave',
        key: userId,
        currentPresences: Array.from(channel.presence.entries()).map(([key, state]) => ({
          presence_ref: key,
          ...state
        })),
        leftPresences: [{
          presence_ref: userId,
          ...leftPresence
        }]
      },
      type: 'presence'
    });
  }
  
  /**
   * Test helper: Add global listener for all broadcasts
   */
  onBroadcast(callback: (channel: string, message: BroadcastMessage) => void) {
    this.globalListeners.add(callback);
    return () => this.globalListeners.delete(callback);
  }
  
  /**
   * Test helper: Clear all channels
   */
  clearAll() {
    for (const channel of this.channels.values()) {
      channel.isSubscribed = false;
      channel.listeners.clear();
      channel.presence.clear();
      channel.broadcastQueue = [];
    }
    this.channels.clear();
    this.globalListeners.clear();
  }
  
  /**
   * Test helper: Get channel state
   */
  getChannelState(channelName: string): ChannelState | undefined {
    return this.channels.get(channelName);
  }
}

/**
 * Factory function for quick broadcast mock creation
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const broadcast = createBroadcastMock();
 * 
 * // With options
 * const broadcast = createBroadcastMock({
 *   simulateLatency: 50,
 *   autoAcknowledge: true
 * });
 * 
 * // Subscribe to a channel
 * const channel = broadcast.channel('room:123');
 * channel.on('message', (payload) => {
 *   console.log('Received:', payload);
 * });
 * await channel.subscribe();
 * 
 * // Send a message
 * await channel.send({
 *   type: 'broadcast',
 *   event: 'message',
 *   payload: { text: 'Hello!' }
 * });
 * ```
 */
export const createBroadcastMock = (options?: BroadcastOptions) => {
  const mock = new SimplifiedBroadcastMock(options);
  return mock.createClient();
};

/**
 * Export the class for advanced usage
 */
export { SimplifiedBroadcastMock as BroadcastMock };