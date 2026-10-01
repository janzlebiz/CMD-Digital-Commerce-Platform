/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark';
export type FontSize = 'normal' | 'large' | 'xlarge' | 'huge';

interface ThemeContextType {
  theme: ThemeMode;
  fontSize: FontSize;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default theme is light mode per requirements
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('hci_cmd_theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const saved = localStorage.getItem('hci_cmd_font_size');
    return (saved === 'normal' || saved === 'large' || saved === 'xlarge' || saved === 'huge') ? saved : 'normal';
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      if (body) {
        body.classList.add('dark');
        body.classList.remove('light');
      }
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
      if (body) {
        body.classList.add('light');
        body.classList.remove('dark');
      }
    }
    localStorage.setItem('hci_cmd_theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-font-size', fontSize);
    localStorage.setItem('hci_cmd_font_size', fontSize);
  }, [fontSize]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
  };

  const increaseFontSize = () => {
    setFontSizeState((prev) => {
      if (prev === 'normal') return 'large';
      if (prev === 'large') return 'xlarge';
      if (prev === 'xlarge') return 'huge';
      return 'huge';
    });
  };

  const decreaseFontSize = () => {
    setFontSizeState((prev) => {
      if (prev === 'huge') return 'xlarge';
      if (prev === 'xlarge') return 'large';
      if (prev === 'large') return 'normal';
      return 'normal';
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        fontSize,
        toggleTheme,
        setTheme,
        setFontSize,
        increaseFontSize,
        decreaseFontSize,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
