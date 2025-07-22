import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  session: Session | null
}

export function useAuth() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    session: null
  })

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          session: null
        })
        return
      }

      setAuthState({
        isAuthenticated: !!session,
        isLoading: false,
        user: session?.user || null,
        session
      })
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        setAuthState({
          isAuthenticated: !!session,
          isLoading: false,
          user: session?.user || null,
          session
        })
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setAuthState(prev => ({ ...prev, isLoading: false }))
        return { success: false, error: error.message }
      }

      // State will be updated by the auth listener
      return { success: true, data }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }))
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      }
    }
  }

  const signup = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }))
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setAuthState(prev => ({ ...prev, isLoading: false }))
        return { success: false, error: error.message }
      }

      // State will be updated by the auth listener
      return { success: true, data }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }))
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Signup failed' 
      }
    }
  }

  const logout = async () => {
    try {
      // Clear all TanStack Query cache to prevent data leakage between users
      queryClient.clear()
      
      await supabase.auth.signOut()
      // State will be updated by the auth listener
      navigate('/panel/sign-in', { replace: true })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return {
    ...authState,
    login,
    logout,
    signup
  }
}