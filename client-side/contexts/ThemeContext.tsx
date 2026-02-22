"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { THEMES, ThemeType, ThemeName } from '../constants/themes';

const THEME_STORAGE_KEY = 'app_theme';

interface ThemeContextType {
  theme: ThemeType;
  themeName: ThemeName;
  toggleTheme: () => void;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('hacker');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as string;
    if (saved === 'terminal' || saved === 'hacker') {
      setThemeName(saved as ThemeName);
    } else if (saved === 'red-hacker' || saved === 'deadpool') {
      setThemeName('hacker');
    } else if (saved === 'green-hacker' || saved === 'hacker') {
      setThemeName('terminal');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      const newTheme = themeName === 'hacker' ? 'terminal' : 'hacker';
      setThemeName(newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setIsTransitioning(false);
    }, 300);
  }, [themeName]);

  const theme = THEMES[themeName];

  // Prevent hydration mismatch by rendering nothing or default until mounted
  // mostly important if we care about matching server HTML exactly.
  // For now simple return.
  return (
    <ThemeContext.Provider value={{ theme, themeName, toggleTheme, isTransitioning }}>
      {/* 
        Render children always so they have access to context. 
        We use 'mounted' to optionally hide content to prevent theme flicker, 
        but for now let's just render. 
      */}
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
