import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { getAuthClient, getAuthClientSync, useInternetIdentity } from './useInternetIdentity'
import { authApi, clearAuthTokens, getStoredAccessToken, getStoredPrincipal, setStoredPrincipal } from '../services/api'
import { getAuthCanisterActor } from '../api/auth-canister/index.js'
import { Response } from "../types";

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  isBuildSystemAuthenticated: boolean
  principal: string | null
}

let buildSystemLoginPromise: Promise<void> | null = null

export function useAuth() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { login: loginII, logout: logoutII, isSessionExpires: isIISessionExpires } = useInternetIdentity()

  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    isBuildSystemAuthenticated: false,
    principal: null
  })

  useEffect(() => {
    // Check if we have stored tokens on mount
    const checkStoredAuth = async () => {
      const accessToken = getStoredAccessToken()
      const principal = getStoredPrincipal()
      console.log('🔍 [useAuth] Checking stored auth:', { hasToken: !!accessToken, principal })
      const isAuthenticated = !!principal && await (await getAuthClient()).isAuthenticated() && !isIISessionExpires()

      setAuthState({
        isAuthenticated,
        isLoading: false,
        isBuildSystemAuthenticated: isAuthenticated && !!accessToken,
        principal
      })
      if (isAuthenticated && !accessToken) {
        buildSystemLogin(principal).then();
      }
    }
    checkStoredAuth().then()
  }, [])

  const buildSystemLoginInternal = async (principal: string) => {
    // 1. Generate random secret (keep in memory only!)
    const secret = crypto.randomUUID() + crypto.randomUUID()
    // 2. Compute SHA-256 digest
    const secretBytes = new TextEncoder().encode(secret)
    const digestBuffer = await crypto.subtle.digest('SHA-256', secretBytes)
    const digest = new Uint8Array(digestBuffer)
    // 3. Submit digest to auth canister (requires II signature)
    const authCanister = await getAuthCanisterActor()
    await authCanister.submitChallenge(Array.from(digest))
    // 4. Authenticate with backend using principal and secret
    const result = await authApi.authWithII(principal, secret)
    setAuthState(prev => ({ ...prev, isBuildSystemAuthenticated: result.success }))
  }

  const buildSystemLogin = async (principal: string) => {
    if (buildSystemLoginPromise) {
      return buildSystemLoginPromise
    }
    buildSystemLoginPromise = buildSystemLoginInternal(principal)
    const res = await buildSystemLoginPromise
    buildSystemLoginPromise = null
    return res
  }

  const login = async (): Promise<Response<string>> => {
    setAuthState(prev => ({ ...prev, isLoading: true }))
    try {
      // First, login with Internet Identity
      await loginII()
      // Get the principal directly from the auth client (after successful login)
      const client = getAuthClientSync()
      const identity = client.getIdentity()
      const principal = identity?.getPrincipal?.().toText?.()
      if (!principal) {
        throw new Error('No principal received from Internet Identity')
      }
      setStoredPrincipal(principal)
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        isBuildSystemAuthenticated: false,
        principal
      })
      buildSystemLogin(principal).then();
      return { success: true, data: principal }
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        isBuildSystemAuthenticated: false,
        principal: null,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      }
    }
  }

  const logout = async () => {
    try {
      // Clear all TanStack Query cache to prevent data leakage between users
      queryClient.clear()

      // Clear stored tokens
      clearAuthTokens()

      // Logout from Internet Identity
      await logoutII()

      // Update state
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        isBuildSystemAuthenticated: false,
        principal: null
      })

      // Navigate to sign-in page
      navigate('/panel/sign-in', { replace: true })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  useEffect(() => {
    if (!authState.isAuthenticated) return;
    const id = setInterval(() => {
      if (isIISessionExpires()) {
        console.log('II session about to expire, logging out...');
        logout().then();
      }
    }, 30000);
    return () => clearInterval(id);
  }, [authState.isAuthenticated, isIISessionExpires]);

  return {
    ...authState,
    login,
    logout,
  }
}