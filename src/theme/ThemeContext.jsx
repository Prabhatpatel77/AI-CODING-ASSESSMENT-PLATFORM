import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme } from './theme.js';
import { tokens } from './tokens.js';

const ThemeContext = createContext({
  mode: 'dark',
  toggleMode: () => {},
  tokens: tokens.dark,
});

export function AppThemeProvider({ children }) {
  // Developer console defaults to dark mode
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem('devassess_theme_mode');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('devassess_theme_mode', next);
      } catch {}
      return next;
    });
  };

  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const currentTokens = useMemo(() => tokens[mode] || tokens.dark, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, tokens: currentTokens }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within an AppThemeProvider');
  }
  return context;
}
