import { Moon, Sun } from 'lucide-react'
import { Button } from '../ui/Button'
import { useThemeStore } from '../../stores/themeStore'

interface ThemeToggleProps {
  variant?: 'icon' | 'full'
}

export function ThemeToggle({ variant = 'full' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore()

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="w-10 h-10 rounded-full hover:bg-accent"
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {theme === 'light' ? (
          <Moon className="h-[1.2rem] w-[1.2rem]" />
        ) : (
          <Sun className="h-[1.2rem] w-[1.2rem]" />
        )}
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 h-auto text-sm hover:bg-accent transition-all duration-200 w-full justify-start"
    >
      {theme === 'light' ? (
        <Moon className="h-4 w-4 text-muted-foreground" />
      ) : (
        <Sun className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="font-medium transition-colors duration-200">
        {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
      </span>
    </Button>
  )
}