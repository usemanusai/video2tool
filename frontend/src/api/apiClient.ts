import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  generateCacheKey,
  getCacheItem,
  setCacheItem,
  removeCacheItem,
  invalidateCacheByPrefix,
} from '@/utils/apiCache';

// API client configuration
const apiConfig = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Cache configuration
export interface ApiCacheConfig {
  // Whether to enable caching for this request
  enableCache?: boolean;
  // Time to live in milliseconds (default: 5 minutes)
  ttl?: number;
  // Whether to use stale-while-revalidate strategy (default: true)
  staleWhileRevalidate?: boolean;
  // Whether to invalidate cache after request (default: false for GET, true for others)
  invalidateCache?: boolean;
  // Prefix to invalidate after request (default: request URL)
  invalidatePrefix?: string;
}

// Default cache configuration
const defaultCacheConfig: Required<ApiCacheConfig> = {
  enableCache: true,
  ttl: 5 * 60 * 1000, // 5 minutes
  staleWhileRevalidate: true,
  invalidateCache: false,
  invalidatePrefix: '',
};

// Create axios instance
const axiosInstance: AxiosInstance = axios.create(apiConfig);

// Add token to requests if available
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Extended axios instance with caching
class ApiClient {
  private instance: AxiosInstance;
  
  constructor(instance: AxiosInstance) {
    this.instance = instance;
  }
  
  /**
   * Make a GET request with caching
   * @param url - Request URL
   * @param config - Axios request config
   * @param cacheConfig - Cache configuration
   * @returns Promise with response data
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    cacheConfig?: ApiCacheConfig
  ): Promise<T> {
    // Merge cache configs
    const mergedCacheConfig = {
      ...defaultCacheConfig,
      invalidateCache: false, // Default for GET is false
      ...cacheConfig,
    };
    
    // If caching is disabled, make a regular request
    if (!mergedCacheConfig.enableCache) {
      const response = await this.instance.get<T>(url, config);
      return response.data;
    }
    
    // Generate cache key
    const cacheKey = generateCacheKey(url, config?.params);
    
    // Check cache
    const { data: cachedData, isStale } = await getCacheItem<T>(cacheKey);
    
    // If we have cached data and it's not stale, return it
    if (cachedData && !isStale) {
      return cachedData;
    }
    
    // If we have stale data and staleWhileRevalidate is enabled, return stale data and fetch in background
    if (cachedData && isStale && mergedCacheConfig.staleWhileRevalidate) {
      // Fetch fresh data in background
      this.instance.get<T>(url, config).then((response) => {
        setCacheItem<T>(cacheKey, response.data, {
          ttl: mergedCacheConfig.ttl,
        });
      }).catch(console.error);
      
      // Return stale data immediately
      return cachedData;
    }
    
    // Fetch fresh data
    const response = await this.instance.get<T>(url, config);
    
    // Cache the response
    await setCacheItem<T>(cacheKey, response.data, {
      ttl: mergedCacheConfig.ttl,
    });
    
    // Invalidate cache if requested
    if (mergedCacheConfig.invalidateCache) {
      const prefix = mergedCacheConfig.invalidatePrefix || url;
      await invalidateCacheByPrefix(prefix);
    }
    
    return response.data;
  }
  
  /**
   * Make a POST request
   * @param url - Request URL
   * @param data - Request data
   * @param config - Axios request config
   * @param cacheConfig - Cache configuration
   * @returns Promise with response data
   */
  async post<T = any, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig,
    cacheConfig?: ApiCacheConfig
  ): Promise<T> {
    // Merge cache configs
    const mergedCacheConfig = {
      ...defaultCacheConfig,
      invalidateCache: true, // Default for POST is true
      ...cacheConfig,
    };
    
    // Make the request
    const response = await this.instance.post<T>(url, data, config);
    
    // Invalidate cache if requested
    if (mergedCacheConfig.invalidateCache) {
      const prefix = mergedCacheConfig.invalidatePrefix || url;
      await invalidateCacheByPrefix(prefix);
    }
    
    return response.data;
  }
  
  /**
   * Make a PUT request
   * @param url - Request URL
   * @param data - Request data
   * @param config - Axios request config
   * @param cacheConfig - Cache configuration
   * @returns Promise with response data
   */
  async put<T = any, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig,
    cacheConfig?: ApiCacheConfig
  ): Promise<T> {
    // Merge cache configs
    const mergedCacheConfig = {
      ...defaultCacheConfig,
      invalidateCache: true, // Default for PUT is true
      ...cacheConfig,
    };
    
    // Make the request
    const response = await this.instance.put<T>(url, data, config);
    
    // Invalidate cache if requested
    if (mergedCacheConfig.invalidateCache) {
      const prefix = mergedCacheConfig.invalidatePrefix || url;
      await invalidateCacheByPrefix(prefix);
    }
    
    return response.data;
  }
  
  /**
   * Make a DELETE request
   * @param url - Request URL
   * @param config - Axios request config
   * @param cacheConfig - Cache configuration
   * @returns Promise with response data
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    cacheConfig?: ApiCacheConfig
  ): Promise<T> {
    // Merge cache configs
    const mergedCacheConfig = {
      ...defaultCacheConfig,
      invalidateCache: true, // Default for DELETE is true
      ...cacheConfig,
    };
    
    // Make the request
    const response = await this.instance.delete<T>(url, config);
    
    // Invalidate cache if requested
    if (mergedCacheConfig.invalidateCache) {
      const prefix = mergedCacheConfig.invalidatePrefix || url;
      await invalidateCacheByPrefix(prefix);
    }
    
    return response.data;
  }
  
  /**
   * Invalidate cache by prefix
   * @param prefix - URL prefix to invalidate
   */
  async invalidateCache(prefix: string): Promise<void> {
    await invalidateCacheByPrefix(prefix);
  }
  
  /**
   * Clear entire cache
   */
  async clearCache(): Promise<void> {
    await removeCacheItem('*');
  }
}

// Create and export API client instance
const apiClient = new ApiClient(axiosInstance);
export default apiClient;
