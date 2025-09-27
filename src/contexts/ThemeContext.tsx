'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<Theme>('light')
  const [isLoaded, setIsLoaded] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('messenger-theme') as Theme
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setThemeState(savedTheme)
    } else {
      // Check system preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      setThemeState(systemTheme)
    }
    setIsLoaded(true)
  }, [])

  // Apply theme to document and save to localStorage
  useEffect(() => {
    if (!isLoaded) return

    const root = document.documentElement
    
    // Remove previous theme classes
    root.classList.remove('light', 'dark')
    
    // Add new theme class
    root.classList.add(theme)
    
    // Save to localStorage
    localStorage.setItem('messenger-theme', theme)
  }, [theme, isLoaded])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light')
  }

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
  }

  // Don't render children until theme is loaded to prevent flash
  if (!isLoaded) {
    return null
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}