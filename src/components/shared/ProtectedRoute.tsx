import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LoadingPage } from './LoadingPage'

interface ProtectedRouteProps {
  children: ReactNode
  requireAuth?: boolean
}

export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Show loading while checking authentication status
  if (isLoading) {
    return <LoadingPage />
  }

  // AUTH WALL: Redirect to sign-in if authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    console.log('🔒 Auth wall activated - redirecting to sign-in')
    return (
      <Navigate 
        to="/panel/sign-in" 
        state={{ from: location }} 
        replace 
      />
    )
  }

  // Redirect authenticated users away from auth pages
  if (!requireAuth && isAuthenticated && location.pathname === '/panel/sign-in') {
    console.log('✅ User already authenticated - redirecting to panel')
    return <Navigate to="/panel/canisters" replace />
  }

  return <>{children}</>
}