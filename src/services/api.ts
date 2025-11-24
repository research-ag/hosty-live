// Base API configuration
import { AssetManager } from "@dfinity/assets";
import { Principal } from "@icp-sdk/core/principal";
import { getAgent } from "../hooks/useInternetIdentity.ts";
import { getBackendActor } from "../api/backend";
import { isValidDomain } from "../utils/domains.ts";

const API_BASE = `${import.meta.env.VITE_HOSTY_API_BASE || 'https://mrresearch.xyz/hosty-live-api'}`

// Token storage keys
const ACCESS_TOKEN_KEY = 'hosty_access_token'
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

export function setAccessToken(accessToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
}

export function getStoredPrincipal(): string | null {
  return localStorage.getItem(PRINCIPAL_KEY)
}

export function setStoredPrincipal(principal: string) {
  localStorage.setItem(PRINCIPAL_KEY, principal)
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
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

      const response = await fetch(`${API_BASE}/auth/login`, {
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
        return { success: false, error: (error && error.message) || `HTTP ${response.status}` }
      }

      const data = await response.json()
      console.log('✅ [authApi.authWithII] Success response:', data)

      // Expect AuthResponseDto { principal, accessToken }
      if (data && data.accessToken) {
        setAccessToken(data.accessToken)
        return {
          success: true,
          principal: data.principal || principal,
          accessToken: data.accessToken
        }
      }

      return { success: false, error: 'Invalid auth response' }
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
  // Helper: Verify ic-domains file is accessible via boundary node with retry logic
  async verifyIcDomainsFile(canisterId: string, expectedDomain: string, maxRetries = 10, initialDelay = 500): Promise<boolean> {
    let delay = initialDelay;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Add cache busting with timestamp
        const timestamp = Date.now();
        const response = await fetch(
          `https://${canisterId}.icp0.io/.well-known/ic-domains?t=${timestamp}`,
          {
            method: "GET",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache",
            },
          }
        );

        if (response.ok) {
          const content = await response.text();
          const retrievedDomain = content.trim();
          
          if (retrievedDomain === expectedDomain) {
            console.log(`✅ ic-domains file verified after ${attempt + 1} attempt(s)`);
            return true;
          } else {
            console.warn(`⚠️ ic-domains file found but contains wrong domain: "${retrievedDomain}" (expected: "${expectedDomain}")`);
          }
        }
      } catch (error) {
        console.warn(`Attempt ${attempt + 1}/${maxRetries} failed:`, error instanceof Error ? error.message : 'Unknown error');
      }

      // Wait before next attempt with exponential backoff
      if (attempt < maxRetries - 1) {
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, 5000); // Cap at 5 seconds
      }
    }

    return false;
  },

  // Add custom domain to canister (new API)
  async addDomain(canisterId: string, domain: string) {
    if (!isValidDomain(domain)) {
      return {
        success: false,
        error: "Invalid domain format",
      }
    }
    try {
      // STEP 1: Upload .well-known/ic-domains file
      console.log('📤 Uploading ic-domains file to canister...');
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
      console.log('✅ ic-domains file uploaded to canister');

      // STEP 2: Verify file is accessible via boundary node (with retries)
      console.log('🔍 Verifying ic-domains file is accessible via boundary node...');
      const isVerified = await this.verifyIcDomainsFile(canisterId, domain);
      
      if (!isVerified) {
        return {
          success: false,
          error: `Failed to verify ic-domains file accessibility. The file was uploaded to the canister but is not yet propagated to the boundary nodes. Please wait a few moments and try again.`
        };
      }
      console.log('✅ ic-domains file verified and accessible');

      // STEP 3: Register domain with IC gateways using new API
      console.log('📝 Registering domain with IC gateway...');
      const response = await fetch(`https://icp0.io/custom-domains/v1/${domain}`, {
        method: "POST",
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ errors: 'Unknown error' }));
        return {
          success: false,
          error: `Domain registration failed: ${errorData.errors || errorData.message}`
        }
      }
      
      const result = await response.json();
      console.log('✅ Domain registered with IC gateway');
      
      // STEP 4: Update backend database with domain association
      console.log('💾 Updating backend database...');
      const backend = await getBackendActor();
      await backend.updateCanister(Principal.fromText(canisterId), {
        alias: [],
        description: [],
        frontendUrl: [domain]
      });
      console.log('✅ Backend database updated');
      
      return {
        success: true,
        domain: result.data?.domain,
        registrationStatus: result.data?.registration_status,
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

  // Check domain registration status using new API
  async checkRegistrationStatus(domain: string) {
    try {
      const response = await fetch(`https://icp0.io/custom-domains/v1/${domain}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ errors: 'Registration not found' }));
        return { 
          success: false, 
          error: errorData.errors || errorData.message || 'Registration not found' 
        }
      }

      const data = await response.json()
      return { 
        success: true, 
        data: {
          domain: data.data?.domain,
          canisterId: data.data?.canister_id,
          status: data.data?.registration_status,
          message: data.message,
        }
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to check status'
      }
    }
  },

  // Validate domain before registration using new API
  async validateDomain(domain: string) {
    try {
      const response = await fetch(`https://icp0.io/custom-domains/v1/${domain}/validate`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ errors: 'Validation failed' }));
        return { 
          success: false, 
          error: errorData.errors || errorData.message || 'Validation failed' 
        }
      }

      const data = await response.json()
      return { 
        success: true, 
        data: {
          domain: data.data?.domain,
          canisterId: data.data?.canister_id,
          validationStatus: data.data?.validation_status,
          message: data.message,
        }
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to validate domain'
      }
    }
  },

  // Remove domain registration using new API
  async removeDomain(domain: string) {
    try {
      const response = await fetch(`https://icp0.io/custom-domains/v1/${domain}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ errors: 'Failed to remove domain' }));
        return { 
          success: false, 
          error: errorData.errors || errorData.message || 'Failed to remove domain' 
        }
      }

      const data = await response.json()
      return { 
        success: true,
        message: data.message,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to remove domain'
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

      const response = await fetch(`${API_BASE}/deployments?${params}`, {
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
      return { success: true, deployments: data.deployments || [], pagination: data.pagination }
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

      const url = `${API_BASE}/deployments/${encodeURIComponent(deploymentId)}`
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
      console.log('✅ [deploymentsApi.getDeployment] Success response (raw):', data)

      // data is DeploymentResponseDto
      return { success: true, deployment: data }
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
    envVars?: Record<string, string>;
    isDryRun?: boolean;
    pureAssets?: boolean;
  }) {
    try {
      const accessToken = getStoredAccessToken()

      if (!accessToken) {
        throw new Error('No active session')
      }

      const formData = new FormData()
      formData.append('canisterId', data.canisterId)
      formData.append('zip', data.zipFile)
      
      // Only include build-related fields if not pure assets
      if (!data.pureAssets) {
        if (data.buildCommand) {
          formData.append('buildCommand', data.buildCommand)
        }
        if (data.envVars) {
          formData.append('envVars', JSON.stringify(data.envVars))
        }
      }
      
      if (data.outputDir) {
        formData.append('outputDir', data.outputDir)
      }
      if (data.isDryRun !== undefined) {
        formData.append('isDryRun', data.isDryRun.toString())
      }
      if (data.pureAssets !== undefined) {
        formData.append('pureAssets', data.pureAssets.toString())
      }

      const response = await fetch(`${API_BASE}/deployments/deploy-zip`, {
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
      // result is DeploymentResponseDto
      return { success: true, deploymentId: result.id, deployment: result }
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
    envVars?: Record<string, string>;
    isDryRun?: boolean;
    pureAssets?: boolean;
  }) {
    try {
      const accessToken = getStoredAccessToken()

      if (!accessToken) {
        throw new Error('No active session')
      }

      // Build payload, omitting build-related fields for pure assets
      const payload: any = {
        canisterId: data.canisterId,
        gitRepoUrl: data.gitRepoUrl,
        branch: data.branch,
        outputDir: data.outputDir,
        isDryRun: data.isDryRun,
        pureAssets: data.pureAssets,
      }
      
      // Only include build-related fields if not pure assets
      if (!data.pureAssets) {
        if (data.buildCommand) payload.buildCommand = data.buildCommand
        if (data.envVars) payload.envVars = data.envVars
      }

      const response = await fetch(`${API_BASE}/deployments/deploy-git`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      checkUnauthorized(response)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        return { success: false, error: error.error || `HTTP ${response.status}` }
      }

      const result = await response.json()
      // result is DeploymentResponseDto
      return { success: true, deploymentId: result.id, deployment: result }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to upload deployment from Git'
      }
    }
  },

  // Upload deployment from URL (zip)
  async uploadDeploymentFromUrl(data: {
    canisterId: string;
    zipUrl: string;
    buildCommand?: string;
    outputDir?: string;
    envVars?: Record<string, string>;
    isDryRun?: boolean;
    pureAssets?: boolean;
  }) {
    try {
      const headers = await getAuthHeaders()
      
      // Build payload, omitting build-related fields for pure assets
      const payload: any = {
        canisterId: data.canisterId,
        zipUrl: data.zipUrl,
        outputDir: data.outputDir,
        isDryRun: data.isDryRun,
        pureAssets: data.pureAssets,
      }
      
      // Only include build-related fields if not pure assets
      if (!data.pureAssets) {
        if (data.buildCommand) payload.buildCommand = data.buildCommand
        if (data.envVars) payload.envVars = data.envVars
      }
      
      const response = await fetch(`${API_BASE}/deployments/deploy-url`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      checkUnauthorized(response)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }))
        return { success: false, error: error.error || `HTTP ${response.status}` }
      }

      const result = await response.json()
      // result is DeploymentResponseDto
      return { success: true, deploymentId: result.id, deployment: result }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to upload deployment from URL'
      }
    }
  }
}