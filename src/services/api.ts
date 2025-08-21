import { supabase } from '../lib/supabase'

// Base API configuration
const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

// Helper function to get auth headers
async function getAuthHeaders() {
  console.log('🔐 [getAuthHeaders] Getting session...')
  const { data: { session } } = await supabase.auth.getSession()
  
  console.log('🔐 [getAuthHeaders] Session check:', {
    hasSession: !!session,
    hasAccessToken: !!session?.access_token,
    tokenPreview: session?.access_token ? `${session.access_token.substring(0, 20)}...` : 'none',
    user: session?.user ? {
      id: session.user.id,
      email: session.user.email
    } : 'none'
  })
  
  if (!session?.access_token) {
    console.error('❌ [getAuthHeaders] No active session')
    throw new Error('No active session')
  }

  const headers = {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
  
  console.log('✅ [getAuthHeaders] Headers prepared')
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

// Cycles API
export const cyclesApi = {
  // Get cycles information
  async getCyclesInfo() {
    const headers = await getAuthHeaders()
    
    const response = await fetch(`${API_BASE}/cycles`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }
}

// Faucet API
export const faucetApi = {
  // Get faucet status
  async getFaucetStatus() {
    const headers = await getAuthHeaders()
    
    const response = await fetch(`${API_BASE}/faucet`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  },

  // Claim cycles from faucet
  async claimCycles() {
    const headers = await getAuthHeaders()
    
    const response = await fetch(`${API_BASE}/faucet`, {
      method: 'POST',
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }))
      
      // Handle cooldown error specifically
      if (response.status === 429) {
        throw {
          isCooldown: true,
          ...error
        }
      }
      
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }
}

// Canisters API
export const canistersApi = {
  // List all canisters
  async listCanisters() {
    try {
      console.log('🔍 [canistersApi.listCanisters] Starting API call...')
      
      const headers = await getAuthHeaders()
      console.log('🔑 [canistersApi.listCanisters] Headers:', {
        ...headers,
        Authorization: headers.Authorization ? `Bearer ${headers.Authorization.substring(7, 20)}...` : 'missing'
      })
      
      const url = `${API_BASE}/canisters-list`
      console.log('🌐 [canistersApi.listCanisters] URL:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      })

      console.log('📡 [canistersApi.listCanisters] Response status:', response.status, response.statusText)
      console.log('📡 [canistersApi.listCanisters] Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        console.error('❌ [canistersApi.listCanisters] Error response:', error)
        return { success: false, error: error.error || `HTTP ${response.status}` }
      }

      const data = await response.json()
      console.log('✅ [canistersApi.listCanisters] Success response:', {
        success: data.success,
        dataType: typeof data.data,
        canistersCount: data.data?.canisters?.length,
        totalCount: data.data?.totalCount,
        fullResponse: data
      })
      
      return data // Return the edge function response directly (already has success/data structure)
    } catch (err) {
      console.error('💥 [canistersApi.listCanisters] Exception:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to fetch canisters'
      }
    }
  },

  // Create a new canister
  async createCanister() {
    try {
      const headers = await getAuthHeaders()
      
      const response = await fetch(`${API_BASE}/canister-create`, {
        method: 'POST',
        headers,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        return { success: false, error: error.error || `HTTP ${response.status}` }
      }

      const data = await response.json()
      return data // Return the edge function response directly
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create canister'
      }
    }
  },

  // Get a single canister
  async getCanister(icCanisterId: string) {
    try {
      console.log('🔍 [canistersApi.getCanister] Starting API call for IC canister:', icCanisterId)
      
      const headers = await getAuthHeaders()
      
      const response = await fetch(`${API_BASE}/canister-get?canisterId=${encodeURIComponent(icCanisterId)}`, {
        method: 'GET',
        headers,
      })

      console.log('📡 [canistersApi.getCanister] Response status:', response.status)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        console.error('❌ [canistersApi.getCanister] Error response:', error)
        return { success: false, error: error.error || `HTTP ${response.status}` }
      }

      const data = await response.json()
      console.log('✅ [canistersApi.getCanister] Success response:', data)
      return data // Return the edge function response directly
    } catch (err) {
      console.error('💥 [canistersApi.getCanister] Exception:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to get canister'
      }
    }
  },

  // Delete a canister
  async deleteCanister(canisterId: string) {
    try {
      const headers = await getAuthHeaders()
      
      const response = await fetch(`${API_BASE}/canister-delete`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ canisterId }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        return { success: false, error: error.error || `HTTP ${response.status}` }
      }

      const data = await response.json()
      return data // Return the edge function response directly
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete canister'
      }
    }
  },

  // Add controller to canister
  async addController(canisterId: string, userPrincipal: string) {
    try {
      const headers = await getAuthHeaders()
      
      const response = await fetch(`${API_BASE}/canister-add-controller`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ canisterId, userPrincipal }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        return { success: false, error: error.error || `HTTP ${response.status}` }
      }

      const data = await response.json()
      return data // Return the edge function response directly
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to add controller'
      }
    }
  }
}

// Custom domain API
export const customDomainApi = {
  // Add custom domain to canister
  async addDomain(canisterId: string, domain: string, skipUpload: boolean) {
    try {
      const headers = await getAuthHeaders()
      
      const response = await fetch(`${API_BASE}/canister-add-domain`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ canisterId, domain, skipUpload }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        return { success: false, error: error.error || `HTTP ${response.status}` }
      }

      const data = await response.json()
      return data // Return the edge function response directly
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

      const text = await response.text()
      return text.trim() || null
    } catch (err) {
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
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
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
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

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
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No active session')
      }

      const response = await fetch(`${API_BASE}/upload-deployment-git`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
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