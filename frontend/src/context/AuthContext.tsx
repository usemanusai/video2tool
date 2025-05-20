import React, { createContext, useState, useEffect, useMemo } from 'react';
import { User, LoginCredentials, UserCreate } from '@/types/api';
import { authService } from '@/api/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (userData: UserCreate) => Promise<User>;
  logout: () => void;
  error: string | null;
  checkAuthState: () => { token: string | null; user: User | null; isAuthenticated: boolean; isLoading: boolean };
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => { throw new Error('Not implemented'); },
  register: async () => { throw new Error('Not implemented'); },
  logout: () => {},
  error: null,
  checkAuthState: () => ({ token: null, user: null, isAuthenticated: false, isLoading: true }),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      console.log('AuthContext: Checking authentication state');
      const token = localStorage.getItem('token');

      if (!token) {
        console.log('AuthContext: No token found in localStorage');
        setIsLoading(false);
        return;
      }

      console.log('AuthContext: Token found, validating with server');

      try {
        const userData = await authService.getCurrentUser();
        console.log('AuthContext: User authenticated successfully:', userData);
        setUser(userData);
      } catch (err) {
        console.error('AuthContext: Authentication error:', err);
        console.log('AuthContext: Clearing invalid token');
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Add a function to manually check auth state (useful for debugging)
  const checkAuthState = () => {
    const token = localStorage.getItem('token');
    console.log('Current auth state:');
    console.log('- Token in localStorage:', token ? 'Present' : 'Missing');
    console.log('- User state:', user);
    console.log('- isAuthenticated:', !!user);
    console.log('- isLoading:', isLoading);
    return { token, user, isAuthenticated: !!user, isLoading };
  };

  // Login function
  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('AuthContext: Attempting login for:', credentials.email);

      const response = await authService.login(credentials);

      if (!response || !response.access_token || !response.user) {
        console.error('AuthContext: Invalid response from server:', response);
        throw new Error('Invalid response from server');
      }

      console.log('AuthContext: Login successful, setting token and user state');

      // Double-check token is stored (the interceptor should have done this already)
      if (!localStorage.getItem('token')) {
        console.log('AuthContext: Token not found in localStorage, setting it now');
        localStorage.setItem('token', response.access_token);
      }

      // Set user state
      setUser(response.user);

      // Log successful login
      console.log('AuthContext: Login successful for:', response.user.email);
      console.log('AuthContext: User state set to:', response.user);

      // Log the current state
      const token = localStorage.getItem('token');
      console.log('AuthContext: Token in localStorage after login:', token ? 'Present' : 'Missing');
      console.log('AuthContext: User state after login:', response.user);

      return response.user;
    } catch (err: any) {
      console.error('AuthContext: Login error:', err);

      // Extract the error message from the response if available
      let errorMessage = 'Login failed';

      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }

      // Handle specific error cases
      if (errorMessage.includes('Invalid email or password') ||
          errorMessage.includes('Invalid credentials') ||
          errorMessage.includes('invalid login')) {
        errorMessage = 'Invalid email or password';
      } else if (errorMessage.includes('not found')) {
        errorMessage = 'Account not found';
      } else if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
        errorMessage = 'Too many login attempts. Please try again later.';
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: UserCreate) => {
    setIsLoading(true);
    setError(null);

    try {
      // Register the user
      const user = await authService.register(userData);

      console.log('Registration successful:', user.email);

      // After registration, log the user in
      try {
        await login({ email: userData.email, password: userData.password });
      } catch (loginErr: any) {
        console.warn('Auto-login after registration failed:', loginErr);
        // Don't throw an error here, as registration was successful
        // Just navigate to login page
        return user;
      }

      return user;
    } catch (err: any) {
      console.error('Registration error:', err);

      // Extract the error message from the response if available
      let errorMessage = 'Registration failed';

      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }

      // Handle specific error cases
      if (errorMessage.includes('already exists')) {
        errorMessage = 'A user with this email already exists';
      } else if (errorMessage.includes('invalid email')) {
        errorMessage = 'Please provide a valid email address';
      } else if (errorMessage.includes('password')) {
        errorMessage = 'Password must be at least 6 characters long';
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    authService.logout();
    setUser(null);
  };

  // Memoize the context value
  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      error,
      checkAuthState, // Add the debug function
    }),
    // Note: login, register, logout, and checkAuthState functions are stable and don't need to be in the dependency array
    [user, isLoading, error]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
