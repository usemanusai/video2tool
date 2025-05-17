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
    const formData = new FormData();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    return apiRequest<AuthResponse>({
      method: 'POST',
      url: '/auth/token',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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
