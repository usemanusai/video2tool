import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Enable debugging
const DEBUG = true;

// Create a custom axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Increase timeout for development
  timeout: 30000,
});

// Request interceptor for adding the auth token and logging
apiClient.interceptors.request.use(
  (config) => {
    // Skip token for login and register endpoints
    const isAuthEndpoint =
      (config.url?.includes('/auth/login') ||
       config.url?.includes('/auth/token') ||
       config.url?.includes('/auth/register'));

    const token = localStorage.getItem('token');

    // Add token to all requests except auth endpoints
    if (token && config.headers && !isAuthEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Added auth token to request:', config.url);
    }

    // Log request details in development
    if (DEBUG) {
      console.log(`🚀 Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
        headers: {
          ...config.headers,
          Authorization: config.headers?.Authorization ? '[REDACTED]' : undefined,
        },
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    if (DEBUG) {
      console.error('❌ Request Error:', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors and logging
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (DEBUG) {
      console.log(`✅ Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });
    }

    // Check if this is an authentication response with a token
    if (response.data && response.data.access_token) {
      console.log('Received authentication token in response');
      // Store the token immediately
      localStorage.setItem('token', response.data.access_token);
    }

    return response;
  },
  (error) => {
    // Log error details
    if (DEBUG) {
      console.error('❌ Response Error:', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        } : 'No response',
        request: error.request ? 'Request sent but no response received' : 'Request setup error',
        config: error.config,
      });
    }

    // Skip auth redirect for login/register endpoints
    const isAuthEndpoint =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/token') ||
      error.config?.url?.includes('/auth/register');

    // Handle 401 Unauthorized errors (except during login/register)
    if (error.response && error.response.status === 401 && !isAuthEndpoint) {
      console.warn('Unauthorized access detected, clearing token');
      // Clear token but don't redirect - let the component handle redirection
      localStorage.removeItem('token');
    }

    return Promise.reject(error);
  }
);

// Generic API request function with improved error handling
const apiRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  try {
    console.log(`Making ${config.method} request to ${config.url}`);
    const response: AxiosResponse<T> = await apiClient(config);
    console.log(`Received response from ${config.url}:`, response.data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;
      let errorMessage = 'An error occurred';

      console.error(`Error response from ${config.url}:`, {
        status,
        data: error.response.data
      });

      // Try to extract error message from different response formats
      if (error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.error_description) {
          errorMessage = error.response.data.error_description;
        }
      }

      // Create an error object with the response data for more context
      const enhancedError = new Error(`API Error (${status}): ${errorMessage}`);
      (enhancedError as any).response = error.response;
      (enhancedError as any).status = status;
      (enhancedError as any).originalError = error;

      throw enhancedError;
    } else if (error.request) {
      // The request was made but no response was received
      console.error(`No response received for request to ${config.url}`);
      throw new Error('No response from server. Please check your network connection or try again later.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error(`Request setup error for ${config.url}:`, error.message);
      throw new Error(`Request failed: ${error.message || 'Unknown error'}`);
    }
  }
};

export default apiRequest;
