export interface RealtimeEvent {
  type: string;
  entity: string;
  id: string;
  data: unknown;
  timestamp: number;
}

export interface Subscription {
  unsubscribe: () => void;
}

export interface RealtimeSubscription {
  channel: string;
  callback: (event: RealtimeEvent) => void;
  unsubscribe: () => void;
}

export interface ConnectionOptions {
  url?: string;
  reconnect?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export class RealtimeManager {
  private subscriptions: Map<string, Set<RealtimeSubscription>> = new Map();
  private eventQueue: RealtimeEvent[] = [];
  private isConnected: boolean = false;
  private connectionRetries: number = 0;
  private maxRetries: number = 5;
  private retryDelay: number = 1000;
  private optimisticUpdates: Map<string, any> = new Map();
  private conflictResolver: (local: unknown, remote: unknown) => any;

  constructor(options: ConnectionOptions = {}) {
    this.maxRetries = options.maxRetries || 5;
    this.retryDelay = options.retryDelay || 1000;
    this.conflictResolver = this.defaultConflictResolver;
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      this.isConnected = true;
      this.connectionRetries = 0;
      this.processQueuedEvents();
      console.log('Realtime connection established');
    } catch (error) {
      console.error('Connection error in realtime service:', error);
      this.handleConnectionError(error);
    }
  }

  private handleConnectionError(error: unknown): void {
    console.error('Realtime connection failed:', error);
    this.isConnected = false;

    if (this.connectionRetries < this.maxRetries) {
      this.connectionRetries++;
      const delay = this.retryDelay * Math.pow(2, this.connectionRetries - 1);
      setTimeout(() => this.connect(), delay);
    }
  }

  subscribe(channel: string, callback: (event: RealtimeEvent) => void): Subscription {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }

    const subscription: RealtimeSubscription = {
      channel,
      callback,
      unsubscribe: () => {
        const subs = this.subscriptions.get(channel);
        if (subs) {
          subs.delete(subscription);
          if (subs.size === 0) {
            this.subscriptions.delete(channel);
          }
        }
      }
    };

    this.subscriptions.get(channel)!.add(subscription);
    return { unsubscribe: subscription.unsubscribe };
  }

  emit(event: RealtimeEvent): void {
    if (this.isConnected) {
      this.broadcast(event);
    } else {
      this.eventQueue.push(event);
    }
  }

  private broadcast(event: RealtimeEvent): void {
    const channelSubs = this.subscriptions.get(event.entity);
    if (channelSubs) {
      channelSubs.forEach(sub => {
        try {
          sub.callback(event);
        } catch (error) {
          console.error('Subscription callback error:', error);
        }
      });
    }

    const allSubs = this.subscriptions.get('*');
    if (allSubs) {
      allSubs.forEach(sub => {
        try {
          sub.callback(event);
        } catch (error) {
          console.error('Subscription callback error:', error);
        }
      });
    }
  }

  private processQueuedEvents(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.broadcast(event);
      }
    }
  }

  applyOptimisticUpdate(entity: string, id: string, update: unknown): void {
    const key = `${entity}-${id}`;
    const current = this.optimisticUpdates.get(key) || {};
    this.optimisticUpdates.set(key, { ...current, ...(update as Record<string, any>) });

    this.emit({
      type: 'optimistic_update',
      entity,
      id,
      data: update,
      timestamp: Date.now()
    });
  }

  resolveOptimisticUpdate(entity: string, id: string, serverData: unknown): void {
    const key = `${entity}-${id}`;
    const optimistic = this.optimisticUpdates.get(key);

    if (optimistic) {
      const resolved = this.conflictResolver(optimistic, serverData);
      this.optimisticUpdates.delete(key);

      this.emit({
        type: 'update_resolved',
        entity,
        id,
        data: resolved,
        timestamp: Date.now()
      });
    }
  }

  private defaultConflictResolver(local: unknown, remote: unknown): unknown {
    if (!remote) return local;
    if (!local) return remote;

    const localObj = local as Record<string, unknown>;
    const remoteObj = remote as Record<string, unknown>;
    const localTime = localObj.updatedAt || 0;
    const remoteTime = remoteObj.updatedAt || 0;

    return localTime > remoteTime ? local : remote;
  }

  setConflictResolver(resolver: (local: unknown, remote: unknown) => any): void {
    this.conflictResolver = resolver;
  }

  disconnect(): void {
    this.isConnected = false;
    this.subscriptions.clear();
    this.eventQueue = [];
    this.optimisticUpdates.clear();
    console.log('Realtime connection closed');
  }

  isConnectionActive(): boolean {
    return this.isConnected;
  }

  getQueuedEventCount(): number {
    return this.eventQueue.length;
  }

  clearEventQueue(): void {
    this.eventQueue = [];
  }
}

export class RealtimeSynchronizer {
  private manager: RealtimeManager;
  private entityStates: Map<string, Map<string, any>> = new Map();
  private syncCallbacks: Map<string, (state: unknown) => void> = new Map();

  constructor(manager: RealtimeManager) {
    this.manager = manager;
    this.setupGlobalSubscription();
  }

  private setupGlobalSubscription(): void {
    this.manager.subscribe('*', (event) => {
      this.handleRealtimeEvent(event);
    });
  }

  private handleRealtimeEvent(event: RealtimeEvent): void {
    const entityMap = this.entityStates.get(event.entity) || new Map();
    entityMap.set(event.id, event.data);
    this.entityStates.set(event.entity, entityMap);

    const callback = this.syncCallbacks.get(`${event.entity}-${event.id}`);
    if (callback) {
      callback(event.data);
    }
  }

  syncEntity(entity: string, id: string, callback: (state: unknown) => void): () => void {
    const key = `${entity}-${id}`;
    this.syncCallbacks.set(key, callback);

    const entityMap = this.entityStates.get(entity);
    if (entityMap && entityMap.has(id)) {
      callback(entityMap.get(id));
    }

    return () => {
      this.syncCallbacks.delete(key);
    };
  }

  getEntityState(entity: string, id: string): unknown {
    const entityMap = this.entityStates.get(entity);
    return entityMap ? entityMap.get(id) : null;
  }

  updateEntityState(entity: string, id: string, update: unknown): void {
    this.manager.applyOptimisticUpdate(entity, id, update);
  }

  clearEntityCache(entity?: string): void {
    if (entity) {
      this.entityStates.delete(entity);
    } else {
      this.entityStates.clear();
    }
  }
}