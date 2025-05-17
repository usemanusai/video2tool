import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthContext } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';

// Mock user data
const mockUser = {
  id: '123',
  email: 'test@example.com',
  full_name: 'Test User',
  created_at: '2023-01-01T00:00:00Z',
};

// Mock auth context value
const mockAuthContextValue = {
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  error: null,
};

// Mock auth context provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthContext.Provider value={mockAuthContextValue}>
    {children}
  </AuthContext.Provider>
);

describe('useAuth hook', () => {
  it('should return auth context values', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
  
  it('should call login function when login is called', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'password' });
    });
    
    expect(mockAuthContextValue.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });
  
  it('should call register function when register is called', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.register({
        email: 'test@example.com',
        password: 'password',
        full_name: 'Test User',
      });
    });
    
    expect(mockAuthContextValue.register).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
      full_name: 'Test User',
    });
  });
  
  it('should call logout function when logout is called', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    act(() => {
      result.current.logout();
    });
    
    expect(mockAuthContextValue.logout).toHaveBeenCalled();
  });
  
  it('should throw error when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
    
    // Restore console.error
    console.error = originalError;
  });
});
