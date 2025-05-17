import React, { createContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, Theme, PaletteMode } from '@mui/material';

type ThemeContextType = {
  mode: PaletteMode;
  toggleColorMode: () => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<PaletteMode>('light');

  // Load theme preference from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode') as PaletteMode | null;
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  // Toggle theme mode
  const toggleColorMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode);
      return newMode;
    });
  };

  // Create theme
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#3f51b5',
          },
          secondary: {
            main: '#f50057',
          },
          background: {
            default: mode === 'light' ? '#f5f5f5' : '#121212',
            paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
          },
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontSize: '2.5rem',
            fontWeight: 500,
          },
          h2: {
            fontSize: '2rem',
            fontWeight: 500,
          },
          h3: {
            fontSize: '1.75rem',
            fontWeight: 500,
          },
          h4: {
            fontSize: '1.5rem',
            fontWeight: 500,
          },
          h5: {
            fontSize: '1.25rem',
            fontWeight: 500,
          },
          h6: {
            fontSize: '1rem',
            fontWeight: 500,
          },
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 8,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                boxShadow: mode === 'light' 
                  ? '0px 2px 4px rgba(0, 0, 0, 0.05), 0px 4px 6px rgba(0, 0, 0, 0.05)' 
                  : '0px 2px 4px rgba(0, 0, 0, 0.2), 0px 4px 6px rgba(0, 0, 0, 0.2)',
              },
            },
          },
        },
      }),
    [mode]
  );

  const contextValue = useMemo(
    () => ({
      mode,
      toggleColorMode,
    }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
