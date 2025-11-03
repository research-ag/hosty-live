// Base API configuration
import { AssetManager } from "@dfinity/assets";
import { Principal } from "@dfinity/principal";
import { getAgent } from "../hooks/useInternetIdentity.ts";
import { getBackendActor } from "../api/backend";
import { isValidDomain } from "../utils/domains.ts";

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

// Token storage keys
const ACCESS_TOKEN_KEY = 'hosty_access_token'
const REFRESH_TOKEN_KEY = 'hosty_refresh_token'
const PRINCIPAL_KEY = 'hosty_principal'

// Handle 401 errors globally
function handle401Error() {
  console.warn('🔒 [API] 401 Unauthorized - Redirecting to sign-in')
  clearAuthTokens()
  // Use window.location for immediate redirect, bypassing React Router
  window.location.href = '/panel/sign-in'
}

// Token management
export function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getStoredPrincipal(): string | null {
  return localStorage.getItem(PRINCIPAL_KEY)
}

export function setAuthTokens(accessToken: string, refreshToken: string, principal: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  localStorage.setItem(PRINCIPAL_KEY, principal)
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(PRINCIPAL_KEY)
}

// Helper function to get auth headers
async function getAuthHeaders() {
  console.log('🔐 [getAuthHeaders] Getting access token...')
  const accessToken = getStoredAccessToken()

  console.log('🔐 [getAuthHeaders] Token check:', {
    hasAccessToken: !!accessToken,
    tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'none',
  })

  if (!accessToken) {
    console.error('❌ [getAuthHeaders] No access token')
    throw new Error('No active session')
  }

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  console.log('✅ [getAuthHeaders] Headers prepared')
  return headers
}

// Helper function to check response for 401 errors
function checkUnauthorized(response: Response) {
  if (response.status === 401) {
    handle401Error()
    throw new Error('Unauthorized - redirecting to login')
  }
}

// Auth API
export const authApi = {
  // Authenticate with Internet Identity
  async authWithII(principal: string, secret: string) {
    try {
      console.log('🔐 [authApi.authWithII] Authenticating with principal:', principal)

      const response = await fetch(`${API_BASE}/auth-ii`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ principal, secret }),
      })

      console.log('📡 [authApi.authWithII] Response status:', response.status)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        console.error('❌ [authApi.authWithII] Error response:', error)
        return { success: false, error: error.error || `HTTP ${response.status}` }
      }

      const data = await response.json()
      console.log('✅ [authApi.authWithII] Success response:', data)

      // Store tokens
      if (data.success && data.accessToken && data.refreshToken) {
        setAuthTokens(data.accessToken, data.refreshToken, principal)
      }

      return data
    } catch (err) {
      console.error('💥 [authApi.authWithII] Exception:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Authentication failed'
      }
    }
  }
}


// Custom domain API
export const customDomainApi = {
  // Add custom domain to canister
  async addDomain(canisterId: string, domain: string, skipUpload: boolean) {
    if (!isValidDomain(domain)) {
      return {
        success: false,
        error: "Invalid domain format",
      }
    }
    try {
      // Upload .well-known/ic-domains file (unless skipped)
      if (!skipUpload) {
        const assetManager = new AssetManager({
          canisterId: Principal.fromText(canisterId),
          agent: getAgent(),
        });
        await assetManager.delete("/.well-known/ic-domains");
        await assetManager.store(new TextEncoder().encode(domain), {
          fileName: ".well-known/ic-domains",
          contentType: "text/plain",
          contentEncoding: "identity",
        });
      }

      // Register domain with IC gateways
      const response = await fetch("https://icp0.io/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: domain }),
      });
      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Domain registration failed: ${error}`
        }
      }
      const result = await response.json();
      const backend = await getBackendActor();
      await backend.updateCanisterFrontendUrl(Principal.fromText(canisterId), domain);
      return {
        success: true,
        requestId: result.id,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to add domain'
      }
    }
  },

  // Get current domain from canister
  async getCurrentDomain(canisterId: string) {
    try {
      const response = await fetch(`https://${canisterId}.icp0.io/.well-known/ic-domains`)

      if (!response.ok) {
        return null
      }

      const text = (await response.text()).trim()
      if (text?.startsWith('<!DOCTYPE html>')) {
        return null
      }
      return text
    } catch (_err) {
      return null
    }
  },

  // Check domain registration status
  async checkRegistrationStatus(requestId: string) {
    try {
      const response = await fetch(`https://icp0.io/registrations/${requestId}`)

      if (!response.ok) {
        return { success: false, error: 'Registration not found' }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to check status'
      }
    }
  }
}

// Deployments API
export const deploymentsApi = {
  // List deployments
  async listDeployments(limit = 50, offset = 0) {
    try {
      console.log('🔍 [deploymentsApi.listDeployments] Starting API call...')

      const headers = await getAuthHeaders()

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      })

      const response = await fetch(`${API_BASE}/deployments-list?${params}`, {
        method: 'GET',
        headers,
      })

      console.log('📡 [deploymentsApi.listDeployments] Response status:', response.status)

      checkUnauthorized(response)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        console.error('❌ [deploymentsApi.listDeployments] Error response:', error)
        return { success: false, error: error.error || `HTTP ${response.status}` }
      }

      const data = await response.json()
      console.log('✅ [deploymentsApi.listDeployments] Success response:', data)
      return data // Return the edge function response directly
    } catch (err) {
      console.error('💥 [deploymentsApi.listDeployments] Exception:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch deployments'
      }
    }
  },

  // Get a single deployment
  async getDeployment(deploymentId: string) {
    try {
      console.log('🚀 [deploymentsApi.getDeployment] Starting API call for deployment:', deploymentId)

      const headers = await getAuthHeaders()
      console.log('🔑 [deploymentsApi.getDeployment] Headers prepared')

      const url = `${API_BASE}/deployment-get?id=${encodeURIComponent(deploymentId)}`
      console.log('🌐 [deploymentsApi.getDeployment] URL:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers,
      })

      console.log('📡 [deploymentsApi.getDeployment] Response status:', response.status, response.statusText)
      console.log('📡 [deploymentsApi.getDeployment] Response headers:', Object.fromEntries(response.headers.entries()))

      checkUnauthorized(response)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        console.error('❌ [deploymentsApi.getDeployment] Error response:', error)
        return { success: false, error: error.error || `HTTP ${response.status}` }
      }

      const data = await response.json()
      console.log('✅ [deploymentsApi.getDeployment] Success response:', {
        success: data.success,
        hasData: !!data.data,
        hasDeployment: !!data.data?.deployment,
        deploymentId: data.data?.deployment?.id,
        fullResponse: data
      })

      return data // Return the edge function response directly
    } catch (err) {
      console.error('💥 [deploymentsApi.getDeployment] Exception:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get deployment'
      }
    }
  },

  // Upload deployment
  async uploadDeployment(data: {
    canisterId: string;
    zipFile: File;
    buildCommand?: string;
    outputDir?: string;
  }) {
    try {
      const accessToken = getStoredAccessToken()

      if (!accessToken) {
        throw new Error('No active session')
      }

      const formData = new FormData()
      formData.append('canisterId', data.canisterId)
      formData.append('zip', data.zipFile)
      if (data.buildCommand) {
        formData.append('buildCommand', data.buildCommand)
      }
      if (data.outputDir) {
        formData.append('outputDir', data.outputDir)
      }

      const response = await fetch(`${API_BASE}/upload-deployment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      })

      checkUnauthorized(response)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        return { success: false, error: error.error || `HTTP ${response.status}` }
      }

      const result = await response.json()
      return result // Return the edge function response directly
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to upload deployment'
      }
    }
  },

  // Upload deployment from Git repository
  async uploadDeploymentGit(data: {
    canisterId: string;
    gitRepoUrl: string;
    branch: string;
    buildCommand?: string;
    outputDir?: string;
  }) {
    try {
      const accessToken = getStoredAccessToken()

      if (!accessToken) {
        throw new Error('No active session')
      }

      const response = await fetch(`${API_BASE}/upload-deployment-git`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canisterId: data.canisterId,
          gitRepoUrl: data.gitRepoUrl,
          branch: data.branch,
          buildCommand: data.buildCommand,
          outputDir: data.outputDir,
        }),
      })

      checkUnauthorized(response)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        return { success: false, error: error.error || `HTTP ${response.status}` }
      }

      const result = await response.json()
      return result // Return the edge function response directly
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to upload deployment from Git'
      }
    }
  }
}