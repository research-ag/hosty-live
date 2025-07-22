import { ChevronUp, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from './Button'
import { cn } from '../../lib/utils'

interface SortButtonProps {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
  className?: string
}

export function SortButton({ label, active, direction, onClick, className }: SortButtonProps) {
  // Use a single directional arrow based on sort direction
  const SortIcon = direction === 'asc' ? ArrowUp : ArrowDown
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 transition-all duration-200 hover:shadow-md relative",
        active 
          ? "bg-primary/10 border-primary/30 text-primary shadow-sm scale-105" 
          : "hover:bg-accent/50 hover:border-primary/20",
        className
      )}
    >
      <span className="font-medium">{label}</span>
      <div className="flex items-center justify-center">
        <SortIcon 
          className={cn(
            "h-4 w-4 transition-all duration-200",
            active 
              ? "text-primary opacity-100 scale-110" 
              : "text-muted-foreground/60 opacity-70"
          )} 
        />
      </div>
      
      {/* Subtle active indicator */}
      {active && (
        <div className="absolute inset-0 rounded-md bg-primary/5 -z-10" />
      )}
    </Button>
  )
}