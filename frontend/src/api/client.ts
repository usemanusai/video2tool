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
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request details in development
    if (DEBUG) {
      console.log(`🚀 Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
        headers: config.headers,
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

    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// Generic API request function with improved error handling
const apiRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await apiClient(config);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const errorMessage = error.response.data.detail || error.response.data.message || 'An error occurred';
      throw new Error(`API Error (${error.response.status}): ${errorMessage}`);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response from server. Please check your network connection or try again later.');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(`Request failed: ${error.message || 'Unknown error'}`);
    }
  }
};

export default apiRequest;
