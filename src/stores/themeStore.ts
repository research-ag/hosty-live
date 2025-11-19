import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  toggleTheme: () => void
}

const getInitialTheme = (): Theme => {
  // Check localStorage first
  const saved = localStorage.getItem('theme')
  if (saved === 'light' || saved === 'dark') {
    return saved
  }
  
  // Check system preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  }
  
  return 'light'
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light'
    
    // Update DOM
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(newTheme)
    
    // Persist to localStorage
    localStorage.setItem('theme', newTheme)
    
    return { theme: newTheme }
  }),
}))

// Initialize theme on load
const initialTheme = getInitialTheme()
document.documentElement.classList.add(initialTheme)

