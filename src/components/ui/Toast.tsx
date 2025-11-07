import * as React from "react"
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./Button"

export interface ToastProps {
  id: string
  title?: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onClose?: () => void
}

const toastVariants = {
  success: {
    icon: CheckCircle,
    className: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-50"
  },
  error: {
    icon: AlertCircle,
    className: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-50"
  },
  warning: {
    icon: AlertTriangle,
    className: "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-50"
  },
  info: {
    icon: Info,
    className: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-50"
  }
}

export function Toast({ title, description, type = 'info', onClose }: ToastProps) {
  const { icon: Icon, className } = toastVariants[type]

  return (
    <div
      className={cn(
        "relative flex w-full max-w-sm items-center space-x-3 rounded-lg border p-4 shadow-lg",
        "animate-in slide-in-from-top-2 duration-300",
        className
      )}
      role="alert"
    >
      <Icon className="h-5 w-5 shrink-0"/>
      <div className="flex-1 space-y-1">
        {title && (
          <div className="text-sm font-semibold">{title}</div>
        )}
        {description && (
          <div className="text-sm opacity-90">{description}</div>
        )}
      </div>
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 opacity-70 hover:opacity-100"
          onClick={onClose}
        >
          <X className="h-4 w-4"/>
        </Button>
      )}
    </div>
  )
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full">
      {children}
    </div>
  )
}