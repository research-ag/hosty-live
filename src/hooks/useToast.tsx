import React, { createContext, useContext, useState, useCallback } from 'react'
import { Toast, ToastContainer, ToastProps } from '../components/ui/Toast'

interface ToastContextType {
  addToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

interface ToastProviderProps {
  children: React.ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const addToast = useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const duration = toast.duration ?? 5000

    const newToast: ToastProps = {
      ...toast,
      id,
      onClose: () => removeToast(id)
    }

    setToasts(prev => [...prev, newToast])

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer>
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  const { addToast, removeToast, clearToasts } = context

  // Convenience methods
  const toast = {
    success: (title: string, description?: string, duration?: number) =>
      addToast({ type: 'success', title, description, duration }),
    
    error: (title: string, description?: string, duration?: number) =>
      addToast({ type: 'error', title, description, duration }),
    
    warning: (title: string, description?: string, duration?: number) =>
      addToast({ type: 'warning', title, description, duration }),
    
    info: (title: string, description?: string, duration?: number) =>
      addToast({ type: 'info', title, description, duration }),
    
    custom: (toast: Omit<ToastProps, 'id' | 'onClose'>) =>
      addToast(toast)
  }

  return {
    toast,
    removeToast,
    clearToasts
  }
}