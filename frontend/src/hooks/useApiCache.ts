import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  generateCacheKey,
  getCacheItem,
  setCacheItem,
  removeCacheItem,
  clearCache,
  invalidateCacheByPrefix,
} from '@/utils/apiCache';

// Cache configuration interface
interface CacheConfig {
  // Time to live in milliseconds (default: 5 minutes)
  ttl?: number;
  // Whether to use stale-while-revalidate strategy (default: true)
  staleWhileRevalidate?: boolean;
  // Whether to bypass cache for this request (default: false)
  bypassCache?: boolean;
  // Whether to invalidate cache after request (default: false)
  invalidateCache?: boolean;
  // Prefix to invalidate after request (default: request URL)
  invalidatePrefix?: string;
}

// Hook return type
interface UseApiCacheReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => Promise<void>;
}

/**
 * Hook for making API requests with caching
 * @param url - API URL
 * @param config - Axios request config
 * @param cacheConfig - Cache configuration
 * @returns API response data, loading state, error, and refetch function
 */
export function useApiCache<T = any>(
  url: string,
  config: AxiosRequestConfig = {},
  cacheConfig: CacheConfig = {}
): UseApiCacheReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Generate cache key
  const cacheKey = generateCacheKey(url, config.params);
  
  // Fetch data function
  const fetchData = useCallback(async (bypassCache = false) => {
    setLoading(true);
    setError(null);
    
    try {
      // Check cache if not bypassing
      if (!bypassCache && !cacheConfig.bypassCache) {
        const { data: cachedData, isStale } = await getCacheItem<T>(cacheKey);
        
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          
          // If data is stale and using stale-while-revalidate, fetch fresh data
          if (isStale && cacheConfig.staleWhileRevalidate !== false) {
            // Continue with fetch but don't set loading to true
            setLoading(true);
          } else {
            // If data is not stale or not using stale-while-revalidate, return
            return;
          }
        }
      }
      
      // Fetch fresh data
      const response: AxiosResponse<T> = await axios({
        url,
        ...config,
      });
      
      // Update state with fresh data
      setData(response.data);
      setLoading(false);
      
      // Cache the response
      if (!cacheConfig.bypassCache) {
        await setCacheItem<T>(cacheKey, response.data, {
          ttl: cacheConfig.ttl,
        });
      }
      
      // Invalidate cache if requested
      if (cacheConfig.invalidateCache) {
        const prefix = cacheConfig.invalidatePrefix || url;
        await invalidateCacheByPrefix(prefix);
      }
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [url, cacheKey, config, cacheConfig]);
  
  // Refetch data function
  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);
  
  // Invalidate cache function
  const invalidate = useCallback(async () => {
    await removeCacheItem(cacheKey);
    await fetchData(true);
  }, [cacheKey, fetchData]);
  
  // Fetch data on mount or when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, loading, error, refetch, invalidate };
}

/**
 * Hook for making POST requests with cache invalidation
 * @param url - API URL
 * @param config - Axios request config
 * @param invalidatePrefix - Prefix to invalidate after request
 * @returns Function to make POST request
 */
export function useApiPost<T = any, D = any>(
  url: string,
  config: Omit<AxiosRequestConfig, 'method'> = {},
  invalidatePrefix?: string
): [
  (data: D) => Promise<T>,
  { loading: boolean; error: Error | null }
] {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  const makeRequest = useCallback(
    async (data: D): Promise<T> => {
      setLoading(true);
      setError(null);
      
      try {
        const response: AxiosResponse<T> = await axios({
          url,
          method: 'POST',
          data,
          ...config,
        });
        
        // Invalidate cache with the given prefix
        if (invalidatePrefix) {
          await invalidateCacheByPrefix(invalidatePrefix);
        }
        
        setLoading(false);
        return response.data;
      } catch (err) {
        setError(err as Error);
        setLoading(false);
        throw err;
      }
    },
    [url, config, invalidatePrefix]
  );
  
  return [makeRequest, { loading, error }];
}

/**
 * Hook for making PUT requests with cache invalidation
 * @param url - API URL
 * @param config - Axios request config
 * @param invalidatePrefix - Prefix to invalidate after request
 * @returns Function to make PUT request
 */
export function useApiPut<T = any, D = any>(
  url: string,
  config: Omit<AxiosRequestConfig, 'method'> = {},
  invalidatePrefix?: string
): [
  (data: D) => Promise<T>,
  { loading: boolean; error: Error | null }
] {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  const makeRequest = useCallback(
    async (data: D): Promise<T> => {
      setLoading(true);
      setError(null);
      
      try {
        const response: AxiosResponse<T> = await axios({
          url,
          method: 'PUT',
          data,
          ...config,
        });
        
        // Invalidate cache with the given prefix
        if (invalidatePrefix) {
          await invalidateCacheByPrefix(invalidatePrefix);
        }
        
        setLoading(false);
        return response.data;
      } catch (err) {
        setError(err as Error);
        setLoading(false);
        throw err;
      }
    },
    [url, config, invalidatePrefix]
  );
  
  return [makeRequest, { loading, error }];
}

/**
 * Hook for making DELETE requests with cache invalidation
 * @param url - API URL
 * @param config - Axios request config
 * @param invalidatePrefix - Prefix to invalidate after request
 * @returns Function to make DELETE request
 */
export function useApiDelete<T = any>(
  url: string,
  config: Omit<AxiosRequestConfig, 'method'> = {},
  invalidatePrefix?: string
): [
  () => Promise<T>,
  { loading: boolean; error: Error | null }
] {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  const makeRequest = useCallback(
    async (): Promise<T> => {
      setLoading(true);
      setError(null);
      
      try {
        const response: AxiosResponse<T> = await axios({
          url,
          method: 'DELETE',
          ...config,
        });
        
        // Invalidate cache with the given prefix
        if (invalidatePrefix) {
          await invalidateCacheByPrefix(invalidatePrefix);
        }
        
        setLoading(false);
        return response.data;
      } catch (err) {
        setError(err as Error);
        setLoading(false);
        throw err;
      }
    },
    [url, config, invalidatePrefix]
  );
  
  return [makeRequest, { loading, error }];
}
