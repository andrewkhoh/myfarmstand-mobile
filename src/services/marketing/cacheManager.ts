export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl?: number;
  tags?: string[];
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
  evictionPolicy?: 'lru' | 'lfu' | 'fifo';
}

export class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private accessCount: Map<string, number> = new Map();
  private accessOrder: string[] = [];
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private readonly evictionPolicy: 'lru' | 'lfu' | 'fifo';
  private tagIndex: Map<string, Set<string>> = new Map();

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.ttl || 300000; // 5 minutes
    this.evictionPolicy = options.evictionPolicy || 'lru';
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.delete(key);
      return null;
    }

    this.updateAccessTracking(key);
    return entry.value as T;
  }

  async set<T>(key: string, value: T, options: { ttl?: number; tags?: string[] } = {}): Promise<void> {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: options.ttl || this.defaultTTL,
      tags: options.tags
    };

    this.cache.set(key, entry);
    this.updateAccessTracking(key);

    if (options.tags) {
      this.updateTagIndex(key, options.tags);
    }
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry && entry.tags) {
      this.removeFromTagIndex(key, entry.tags);
    }

    this.accessCount.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessCount.clear();
    this.accessOrder = [];
    this.tagIndex.clear();
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    const keysToInvalidate = new Set<string>();

    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.forEach(key => keysToInvalidate.add(key));
      }
    }

    let invalidatedCount = 0;
    for (const key of keysToInvalidate) {
      if (await this.delete(key)) {
        invalidatedCount++;
      }
    }

    return invalidatedCount;
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private updateAccessTracking(key: string): void {
    switch (this.evictionPolicy) {
      case 'lru':
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        this.accessOrder.push(key);
        break;
      case 'lfu':
        this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
        break;
      case 'fifo':
        if (!this.accessOrder.includes(key)) {
          this.accessOrder.push(key);
        }
        break;
    }
  }

  private evict(): void {
    let keyToEvict: string | undefined;

    switch (this.evictionPolicy) {
      case 'lru':
        keyToEvict = this.accessOrder.shift();
        break;
      case 'lfu':
        let minCount = Infinity;
        for (const [key, count] of this.accessCount) {
          if (count < minCount) {
            minCount = count;
            keyToEvict = key;
          }
        }
        break;
      case 'fifo':
        keyToEvict = this.accessOrder.shift();
        break;
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
    }
  }

  private updateTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  private removeFromTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  getSize(): number {
    return this.cache.size;
  }

  getStats(): { size: number; hits: number; misses: number; evictions: number } {
    return {
      size: this.cache.size,
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }
}

export class MultiLayerCache {
  private layers: Map<string, CacheManager> = new Map();

  constructor() {
    this.layers.set('memory', new CacheManager({ maxSize: 100, ttl: 60000 }));
    this.layers.set('session', new CacheManager({ maxSize: 500, ttl: 300000 }));
    this.layers.set('persistent', new CacheManager({ maxSize: 10000, ttl: 86400000 }));
  }

  async get<T>(key: string): Promise<T | null> {
    for (const [name, cache] of this.layers) {
      const value = await cache.get<T>(key);
      if (value !== null) {
        await this.promote(key, value, name);
        return value;
      }
    }
    return null;
  }

  async set<T>(key: string, value: T, options: { layer?: string; ttl?: number; tags?: string[] } = {}): Promise<void> {
    const layer = options.layer || 'memory';
    const cache = this.layers.get(layer);
    
    if (cache) {
      await cache.set(key, value, options);
    }
  }

  private async promote<T>(key: string, value: T, fromLayer: string): Promise<void> {
    const layerOrder = ['memory', 'session', 'persistent'];
    const fromIndex = layerOrder.indexOf(fromLayer);

    for (let i = 0; i < fromIndex; i++) {
      const layer = this.layers.get(layerOrder[i]);
      if (layer) {
        await layer.set(key, value);
      }
    }
  }

  async invalidate(key: string): Promise<void> {
    for (const cache of this.layers.values()) {
      await cache.delete(key);
    }
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0;
    for (const cache of this.layers.values()) {
      totalInvalidated += await cache.invalidateByTags(tags);
    }
    return totalInvalidated;
  }

  async clear(): Promise<void> {
    for (const cache of this.layers.values()) {
      await cache.clear();
    }
  }
}

export class CacheCoordinator {
  private cache: MultiLayerCache;
  private relatedKeys: Map<string, Set<string>> = new Map();

  constructor() {
    this.cache = new MultiLayerCache();
  }

  async invalidateRelatedCaches(entity: string, id: string): Promise<void> {
    const key = `${entity}:${id}`;
    const related = this.getRelatedKeys(entity, id);

    for (const relatedKey of related) {
      try {

        await this.cache.invalidate(relatedKey);

      } catch (error) {

        console.error('Cache operation failed:', error);

        // Continue without cache

      }
    }

    try {


      await this.cache.invalidate(key);


    } catch (error) {


      console.error('Cache operation failed:', error);


      // Continue without cache


    }
  }

  private getRelatedKeys(entity: string, id: string): Set<string> {
    const keys = new Set<string>();

    switch (entity) {
      case 'content':
        keys.add(`campaign:*:content:${id}`);
        keys.add(`bundle:*:content:${id}`);
        break;
      case 'campaign':
        keys.add(`content:*:campaign:${id}`);
        keys.add(`analytics:campaign:${id}`);
        break;
      case 'bundle':
        keys.add(`product:*:bundle:${id}`);
        keys.add(`pricing:bundle:${id}`);
        break;
    }

    const specific = this.relatedKeys.get(`${entity}:${id}`);
    if (specific) {
      specific.forEach(key => keys.add(key));
    }

    return keys;
  }

  registerRelation(fromEntity: string, fromId: string, toEntity: string, toId: string): void {
    const fromKey = `${fromEntity}:${fromId}`;
    const toKey = `${toEntity}:${toId}`;

    if (!this.relatedKeys.has(fromKey)) {
      this.relatedKeys.set(fromKey, new Set());
    }
    this.relatedKeys.get(fromKey)!.add(toKey);

    if (!this.relatedKeys.has(toKey)) {
      this.relatedKeys.set(toKey, new Set());
    }
    this.relatedKeys.get(toKey)!.add(fromKey);
  }

  async warmCache(entity: string, ids: string[]): Promise<void> {
    console.log(`Warming cache for ${entity} with ${ids.length} items`);
    
    for (const id of ids) {
      const data = await this.fetchData(entity, id);
      try {

        await this.cache.set(`${entity}:${id}`, data, {
        tags: [entity, `${entity}:${id}`]
      });

      } catch (error) {

        console.error('Cache operation failed:', error);

        // Continue without cache

      }
    }
  }

  private async fetchData(entity: string, id: string): Promise<unknown> {
    return { entity, id, data: 'mock data' };
  }
}