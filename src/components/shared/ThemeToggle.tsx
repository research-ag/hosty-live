import { Moon, Sun } from 'lucide-react'
import { Button } from '../ui/Button'
import { useTheme } from '../../hooks/useTheme'
import { useToast } from '../../hooks/useToast'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()

  const handleToggle = () => {
    toggleTheme()
  }

  return (
    <Button 
      variant="ghost" 
      onClick={handleToggle}
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