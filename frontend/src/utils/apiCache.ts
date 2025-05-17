/**
 * API Cache Utility
 * 
 * This utility provides advanced caching strategies for API responses:
 * 1. Memory cache for fast access during the session
 * 2. IndexedDB cache for persistent storage between sessions
 * 3. Cache invalidation based on TTL (Time To Live)
 * 4. Stale-while-revalidate strategy for improved performance
 */

import { openDatabase, OFFLINE_STORES } from './offlineStorage';

// Cache configuration
interface CacheConfig {
  // Time to live in milliseconds (default: 5 minutes)
  ttl: number;
  // Maximum number of items in memory cache (default: 100)
  maxItems: number;
  // Whether to use IndexedDB for persistent cache (default: true)
  persistent: boolean;
  // Whether to use stale-while-revalidate strategy (default: true)
  staleWhileRevalidate: boolean;
}

// Default cache configuration
const defaultConfig: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxItems: 100,
  persistent: true,
  staleWhileRevalidate: true,
};

// Cache item interface
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expires: number;
}

// Memory cache
const memoryCache = new Map<string, CacheItem<any>>();

// Cache keys in order of insertion (for LRU eviction)
const cacheKeys: string[] = [];

/**
 * Generates a cache key from the URL and params
 * @param url - API URL
 * @param params - Request parameters
 * @returns Cache key
 */
export const generateCacheKey = (url: string, params?: any): string => {
  if (!params) {
    return url;
  }
  
  // Sort params to ensure consistent keys regardless of param order
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result: Record<string, any>, key: string) => {
      result[key] = params[key];
      return result;
    }, {});
  
  return `${url}:${JSON.stringify(sortedParams)}`;
};

/**
 * Sets an item in the cache
 * @param key - Cache key
 * @param data - Data to cache
 * @param config - Cache configuration
 */
export const setCacheItem = async <T>(
  key: string,
  data: T,
  config: Partial<CacheConfig> = {}
): Promise<void> => {
  const { ttl, maxItems, persistent } = { ...defaultConfig, ...config };
  
  // Create cache item
  const cacheItem: CacheItem<T> = {
    data,
    timestamp: Date.now(),
    expires: Date.now() + ttl,
  };
  
  // Update memory cache
  memoryCache.set(key, cacheItem);
  
  // Update cache keys for LRU
  const keyIndex = cacheKeys.indexOf(key);
  if (keyIndex !== -1) {
    cacheKeys.splice(keyIndex, 1);
  }
  cacheKeys.push(key);
  
  // Evict oldest items if cache is full
  while (cacheKeys.length > maxItems) {
    const oldestKey = cacheKeys.shift();
    if (oldestKey) {
      memoryCache.delete(oldestKey);
    }
  }
  
  // Update persistent cache if enabled
  if (persistent) {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(OFFLINE_STORES.CACHE, 'readwrite');
      const store = transaction.objectStore(OFFLINE_STORES.CACHE);
      await store.put({ key, ...cacheItem });
    } catch (error) {
      console.error('Failed to update persistent cache:', error);
    }
  }
};

/**
 * Gets an item from the cache
 * @param key - Cache key
 * @param config - Cache configuration
 * @returns Cached data or null if not found or expired
 */
export const getCacheItem = async <T>(
  key: string,
  config: Partial<CacheConfig> = {}
): Promise<{ data: T | null; isStale: boolean }> => {
  const { persistent, staleWhileRevalidate } = { ...defaultConfig, ...config };
  
  // Check memory cache first
  const memoryItem = memoryCache.get(key) as CacheItem<T> | undefined;
  
  if (memoryItem) {
    const now = Date.now();
    const isStale = now > memoryItem.expires;
    
    // If not stale or using stale-while-revalidate, return the data
    if (!isStale || staleWhileRevalidate) {
      // Move key to end of LRU list
      const keyIndex = cacheKeys.indexOf(key);
      if (keyIndex !== -1) {
        cacheKeys.splice(keyIndex, 1);
        cacheKeys.push(key);
      }
      
      return { data: memoryItem.data, isStale };
    }
    
    // If stale and not using stale-while-revalidate, remove from cache
    memoryCache.delete(key);
    const keyIndex = cacheKeys.indexOf(key);
    if (keyIndex !== -1) {
      cacheKeys.splice(keyIndex, 1);
    }
  }
  
  // If not in memory cache or stale, check persistent cache if enabled
  if (persistent) {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(OFFLINE_STORES.CACHE, 'readonly');
      const store = transaction.objectStore(OFFLINE_STORES.CACHE);
      const persistentItem = await store.get(key) as CacheItem<T> | undefined;
      
      if (persistentItem) {
        const now = Date.now();
        const isStale = now > persistentItem.expires;
        
        // If not stale or using stale-while-revalidate, add to memory cache and return
        if (!isStale || staleWhileRevalidate) {
          memoryCache.set(key, persistentItem);
          cacheKeys.push(key);
          
          return { data: persistentItem.data, isStale };
        }
        
        // If stale and not using stale-while-revalidate, remove from persistent cache
        const deleteTransaction = db.transaction(OFFLINE_STORES.CACHE, 'readwrite');
        const deleteStore = deleteTransaction.objectStore(OFFLINE_STORES.CACHE);
        await deleteStore.delete(key);
      }
    } catch (error) {
      console.error('Failed to get item from persistent cache:', error);
    }
  }
  
  return { data: null, isStale: false };
};

/**
 * Removes an item from the cache
 * @param key - Cache key
 * @param config - Cache configuration
 */
export const removeCacheItem = async (
  key: string,
  config: Partial<CacheConfig> = {}
): Promise<void> => {
  const { persistent } = { ...defaultConfig, ...config };
  
  // Remove from memory cache
  memoryCache.delete(key);
  const keyIndex = cacheKeys.indexOf(key);
  if (keyIndex !== -1) {
    cacheKeys.splice(keyIndex, 1);
  }
  
  // Remove from persistent cache if enabled
  if (persistent) {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(OFFLINE_STORES.CACHE, 'readwrite');
      const store = transaction.objectStore(OFFLINE_STORES.CACHE);
      await store.delete(key);
    } catch (error) {
      console.error('Failed to remove item from persistent cache:', error);
    }
  }
};

/**
 * Clears the entire cache
 * @param config - Cache configuration
 */
export const clearCache = async (
  config: Partial<CacheConfig> = {}
): Promise<void> => {
  const { persistent } = { ...defaultConfig, ...config };
  
  // Clear memory cache
  memoryCache.clear();
  cacheKeys.length = 0;
  
  // Clear persistent cache if enabled
  if (persistent) {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(OFFLINE_STORES.CACHE, 'readwrite');
      const store = transaction.objectStore(OFFLINE_STORES.CACHE);
      await store.clear();
    } catch (error) {
      console.error('Failed to clear persistent cache:', error);
    }
  }
};

/**
 * Invalidates cache items by prefix
 * @param prefix - URL prefix to invalidate
 * @param config - Cache configuration
 */
export const invalidateCacheByPrefix = async (
  prefix: string,
  config: Partial<CacheConfig> = {}
): Promise<void> => {
  const { persistent } = { ...defaultConfig, ...config };
  
  // Find keys to invalidate in memory cache
  const keysToInvalidate = Array.from(memoryCache.keys()).filter(key => 
    key.startsWith(prefix)
  );
  
  // Remove from memory cache
  keysToInvalidate.forEach(key => {
    memoryCache.delete(key);
    const keyIndex = cacheKeys.indexOf(key);
    if (keyIndex !== -1) {
      cacheKeys.splice(keyIndex, 1);
    }
  });
  
  // Remove from persistent cache if enabled
  if (persistent && keysToInvalidate.length > 0) {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(OFFLINE_STORES.CACHE, 'readwrite');
      const store = transaction.objectStore(OFFLINE_STORES.CACHE);
      
      // IndexedDB doesn't support prefix queries, so we need to get all keys
      const allKeys = await store.getAllKeys();
      const keysToDelete = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(prefix)
      );
      
      // Delete each key
      await Promise.all(
        keysToDelete.map(key => store.delete(key))
      );
    } catch (error) {
      console.error('Failed to invalidate cache by prefix:', error);
    }
  }
};
