import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ThemeContext } from '@/context/ThemeContext';
import { useTheme } from '@/hooks/useTheme';
import { PaletteMode } from '@mui/material';

// Mock theme context value
const mockThemeContextValue = {
  mode: 'light' as PaletteMode,
  toggleColorMode: jest.fn(),
};

// Mock theme context provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeContext.Provider value={mockThemeContextValue}>
    {children}
  </ThemeContext.Provider>
);

describe('useTheme hook', () => {
  it('should return theme context values', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    expect(result.current.mode).toBe('light');
    expect(typeof result.current.toggleColorMode).toBe('function');
  });
  
  it('should call toggleColorMode function when toggleColorMode is called', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    act(() => {
      result.current.toggleColorMode();
    });
    
    expect(mockThemeContextValue.toggleColorMode).toHaveBeenCalled();
  });
  
  it('should throw error when used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');
    
    // Restore console.error
    console.error = originalError;
  });
});
