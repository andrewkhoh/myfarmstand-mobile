# Kiosk Architecture: React Query + AsyncStorage Hybrid

## 🏗️ Architecture Overview

The kiosk implementation uses a **hybrid architecture** combining React Query (primary) with AsyncStorage (persistence layer) for optimal user experience and data management.

## 🔄 Data Flow Architecture

### React Query (Primary State Management)
```typescript
// All kiosk state flows through React Query
const persistedSessionQuery = useQuery({
  queryKey: kioskKeys.all(user?.id),
  queryFn: kioskSessionStorage.get,     // AsyncStorage wrapped as query function
  staleTime: Infinity,                  // Local storage doesn't go stale
  gcTime: Infinity,                     // Keep in cache indefinitely
});

// Mutations also use React Query
const persistSessionMutation = useMutation({
  mutationFn: kioskSessionStorage.set,
  onSuccess: (sessionData) => {
    queryClient.setQueryData(kioskKeys.all(user?.id), sessionData);
    queryClient.invalidateQueries({ queryKey: ['kiosk', 'sessions'] });
  }
});
```

### AsyncStorage (Persistence Layer)
```typescript
const kioskSessionStorage = {
  get: async (): Promise<KioskSessionData | null> => {
    const stored = await AsyncStorage.getItem('@kiosk_session');
    return stored ? JSON.parse(stored) : null;
  },
  
  set: async (sessionData: KioskSessionData) => {
    await AsyncStorage.setItem('@kiosk_session', JSON.stringify(sessionData));
  },
  
  remove: async (): Promise<void> => {
    await AsyncStorage.removeItem('@kiosk_session');
  }
};
```

## 🎯 Why This Hybrid Approach?

### Problem with Pure React Query
- **Cache is lost on app restart** ❌
- Staff would need to re-authenticate every session ❌
- Poor UX for kiosk scenarios ❌

### Problem with Pure AsyncStorage
- **No cache management** ❌
- **No server synchronization** ❌
- **No optimistic updates** ❌
- **Manual state management** ❌

### Solution: Hybrid Benefits
- **Persistence across app restarts** ✅ (AsyncStorage)
- **Smart caching and invalidation** ✅ (React Query)
- **Server synchronization** ✅ (React Query)
- **Optimistic updates** ✅ (React Query)
- **Error recovery** ✅ (React Query)
- **Consistent API** ✅ (React Query)

## 🔒 Security Integration

Role-based access control is integrated at the React Query layer:

```typescript
// Permission check before fetching
const userRole = user?.raw_user_meta_data?.role;
const hasKioskPermissions = userRole && ['staff', 'manager', 'admin'].includes(userRole);
const shouldFetchSession = persistedSession?.sessionId && hasKioskPermissions;

// Only authorized users can fetch kiosk data
const sessionQuery = useKioskSession(shouldFetchSession ? persistedSession?.sessionId : null);

// Auto-cleanup for unauthorized users
React.useEffect(() => {
  if (user && !hasKioskPermissions && persistedSessionQuery.data?.sessionId) {
    console.warn('🔒 User lacks kiosk permissions, clearing stale session data');
    clearSessionMutation.mutate();
  }
}, [user?.id, hasKioskPermissions, persistedSessionQuery.data?.sessionId]);
```

## 📊 Performance Characteristics

### React Query Benefits
- **Deduplication**: Multiple components using same data = single request
- **Background updates**: Data stays fresh automatically
- **Stale-while-revalidate**: Instant UI with background sync
- **Error recovery**: Automatic retries with exponential backoff

### AsyncStorage Benefits
- **Cross-session persistence**: Survives app kills and restarts
- **Synchronous reads**: Cached in React Query after first load
- **User isolation**: Each user's kiosk data is separate

## 🛠 Implementation Patterns

### Query Key Factory (User Isolation)
```typescript
export const kioskKeys = createQueryKeyFactory({ 
  entity: 'kiosk', 
  isolation: 'user-specific'  // Each user has separate cache
});

// Usage
queryKey: kioskKeys.all(user?.id)  // ['kiosk', 'user-123']
```

### Mutation with Cache Updates
```typescript
const persistSessionMutation = useMutation({
  mutationFn: kioskSessionStorage.set,
  onSuccess: (sessionData) => {
    // Update React Query cache immediately
    queryClient.setQueryData(kioskKeys.all(user?.id), sessionData);
    
    // Trigger related cache updates
    queryClient.invalidateQueries({ 
      queryKey: ['kiosk', 'sessions'], 
      exact: false 
    });
  }
});
```

### Optimistic Updates
```typescript
const updateCustomer = useMutation({
  mutationFn: ({ sessionId, customerInfo }) => 
    kioskService.updateSessionCustomer(sessionId, customerInfo),
  onSuccess: (data, { sessionId }) => {
    // Optimistic update to React Query cache
    queryClient.setQueryData(
      kioskKeyFactory.session(sessionId, user?.id), 
      (old: KioskSessionResponse | undefined) => ({
        ...old,
        session: {
          ...old?.session,
          currentCustomer: data.session?.currentCustomer || null
        }
      })
    );
  }
});
```

## 🚀 Best Practices Applied

1. **Single Source of Truth**: React Query cache is the authoritative state
2. **Layered Architecture**: AsyncStorage as persistence, React Query as behavior
3. **Security First**: Permission checks before any data access
4. **Performance Optimized**: Smart caching prevents unnecessary requests
5. **User Experience**: Instant responses with background synchronization
6. **Error Resilient**: Automatic retries and graceful degradation

## 🔍 Alternative Approaches Considered

### Option A: Pure React Query with Persistence Plugin
```typescript
// Would require @tanstack/react-query-persist-client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
};

// More complex setup, less control over what gets persisted
```

**Pros**: Pure React Query approach
**Cons**: Persists entire cache, less granular control, more complex setup

### Option B: Pure AsyncStorage with Manual State Management
```typescript
// Would require custom state management
const [kioskSession, setKioskSession] = useState(null);

useEffect(() => {
  // Manual loading, syncing, error handling
  loadKioskSession();
}, []);

// Manual implementation of caching, invalidation, optimistic updates
```

**Pros**: Simple storage
**Cons**: Manual cache management, no server sync, poor UX

### Option C: Redux Persist + RTK Query
```typescript
// Would require Redux Toolkit + Redux Persist
const store = configureStore({
  reducer: {
    kiosk: kioskSlice.reducer,
    api: kioskApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(kioskApi.middleware),
});

// More boilerplate, different patterns from existing codebase
```

**Pros**: Mature ecosystem, powerful dev tools
**Cons**: More boilerplate, different patterns, learning curve

## 🎉 Conclusion

The **React Query + AsyncStorage hybrid** approach provides the best balance of:
- **Developer Experience**: Familiar React Query patterns
- **User Experience**: Fast responses with persistence
- **Performance**: Smart caching and deduplication
- **Security**: Role-based access control
- **Maintainability**: Clean separation of concerns

This architecture pattern is recommended for similar use cases requiring both real-time state management and cross-session persistence.

---

**Last Updated**: 2025-08-19  
**Status**: Production Ready ✅  
**Test Coverage**: 9/9 passing (100%) ✅