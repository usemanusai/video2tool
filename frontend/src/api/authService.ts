import apiRequest from './client';
import { AuthResponse, LoginCredentials, User, UserCreate } from '@/types/api';

export const authService = {
  // Register a new user
  register: async (userData: UserCreate): Promise<User> => {
    return apiRequest<User>({
      method: 'POST',
      url: '/auth/register',
      data: userData,
    });
  },

  // Login a user
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    console.log('Attempting login with credentials:', credentials.email);

    // Try both methods in sequence
    // First try with regular JSON
    try {
      console.log('Trying login with JSON format');
      const jsonResponse = await apiRequest<AuthResponse>({
        method: 'POST',
        url: '/auth/login',
        data: credentials,
      });

      console.log('Login successful with JSON format:', jsonResponse);
      return jsonResponse;
    } catch (jsonError) {
      console.warn('JSON login failed, trying form data:', jsonError);

      // Fall back to form data
      const formData = new FormData();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);

      try {
        console.log('Trying login with form data');
        const formResponse = await apiRequest<AuthResponse>({
          method: 'POST',
          url: '/auth/token',
          data: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log('Login successful with form data:', formResponse);
        return formResponse;
      } catch (formError) {
        console.error('Form data login failed:', formError);

        // For debugging purposes, log the exact error
        if ((formError as any).response) {
          console.error('Response data:', (formError as any).response.data);
          console.error('Status:', (formError as any).response.status);
        }

        throw formError;
      }
    }
  },

  // Get the current user
  getCurrentUser: async (): Promise<User> => {
    return apiRequest<User>({
      method: 'GET',
      url: '/auth/me',
    });
  },

  // Logout (client-side only)
  logout: (): void => {
    localStorage.removeItem('token');
  },
};
