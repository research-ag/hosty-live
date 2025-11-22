import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { deploymentsApi } from '../services/api'
import type { ApiDeployment, Deployment, DeploymentStatus, SourceType } from '../types'

// Simple conversion from API response to typed deployment
// No transformation - just type safety
function toDeployment(apiDeployment: ApiDeployment): Deployment {
  return {
    id: apiDeployment.id,
    canisterId: apiDeployment.canisterId,
    principal: apiDeployment.principal,
    status: apiDeployment.status as DeploymentStatus,
    statusReason: apiDeployment.statusReason,
    buildCommand: apiDeployment.buildCommand,
    outputDir: apiDeployment.outputDir,
    envVars: apiDeployment.envVars,
    sourceType: apiDeployment.sourceType as SourceType,
    sourceZipUrl: apiDeployment.sourceZipUrl,
    sourceGitRepo: apiDeployment.sourceGitRepo,
    gitBranch: apiDeployment.gitBranch,
    buildServiceJobId: apiDeployment.buildServiceJobId,
    buildLogs: apiDeployment.buildLogs,
    builtAssetsUrl: apiDeployment.builtAssetsUrl,
    durationMs: apiDeployment.durationMs,
    deployedAt: apiDeployment.deployedAt,
    createdAt: apiDeployment.createdAt,
    updatedAt: apiDeployment.updatedAt,
    isDryRun: apiDeployment.isDryRun,
    pureAssets: apiDeployment.pureAssets,
  }
}

// Hook for listing deployments
export function useDeployments() {
  const queryClient = useQueryClient()

  // Query for fetching deployments list
  const {
    data: deploymentsData,
    isLoading,
    error: queryError,
    refetch: refreshDeployments
  } = useQuery({
    queryKey: ['deployments'],
    queryFn: async () => {
      console.log('🚀 [useDeployments.queryFn] Starting fetch...')
      const response = await deploymentsApi.listDeployments()
      
      console.log('📦 [useDeployments.queryFn] API response:', {
        success: response.success,
        error: response.error,
        dataStructure: response.success ? {
          hasDeployments: !!response.deployments,
          deploymentsIsArray: Array.isArray(response.deployments),
          deploymentsLength: response.deployments?.length,
        } : 'no data'
      })
      
      if (response.success && response.deployments && Array.isArray(response.deployments)) {
        console.log('✅ [useDeployments.queryFn] Converting deployments...')
        const deployments = response.deployments.map(toDeployment)
        console.log('✅ [useDeployments.queryFn] Converted deployments:', deployments.length)
        return deployments
      } else {
        throw new Error(response.error || 'Failed to fetch deployments')
      }
    },
    staleTime: 30 * 1000, // Data considered fresh for 30 seconds
    refetchOnWindowFocus: false,
    retry: 2
  })

  // Mutation for uploading deployments
  const uploadDeploymentMutation = useMutation({
    mutationFn: deploymentsApi.uploadDeployment,
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate and refetch deployments list
        queryClient.invalidateQueries({ queryKey: ['deployments'] })
      }
    },
  })

  // Mutation for uploading deployments from Git
  const uploadDeploymentGitMutation = useMutation({
    mutationFn: deploymentsApi.uploadDeploymentGit,
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate and refetch deployments list
        queryClient.invalidateQueries({ queryKey: ['deployments'] })
      }
    },
  })

  // Mutation for uploading deployments from URL
  const uploadDeploymentUrlMutation = useMutation({
    mutationFn: deploymentsApi.uploadDeploymentFromUrl,
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate and refetch deployments list
        queryClient.invalidateQueries({ queryKey: ['deployments'] })
      }
    },
  })

  // Deploy to canister function
  const deployToCanister = async (data: {
    canisterId: string;
    file: File;
    buildCommand: string;
    outputDir: string;
    envVars?: Record<string, string>;
    isDryRun?: boolean;
    pureAssets?: boolean;
  }): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
      const result = await uploadDeploymentMutation.mutateAsync({
        canisterId: data.canisterId,
        zipFile: data.file,
        buildCommand: data.buildCommand,
        outputDir: data.outputDir,
        envVars: data.envVars,
        isDryRun: data.isDryRun,
        pureAssets: data.pureAssets
      })
      return { success: result.success, error: result.error, data: result.deploymentId ? { id: result.deploymentId } : null }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to deploy'
      }
    }
  }

  // Deploy from Git repository function
  const deployFromGit = async (data: {
    canisterId: string;
    gitRepoUrl: string;
    branch: string;
    buildCommand: string;
    outputDir: string;
    envVars?: Record<string, string>;
    isDryRun?: boolean;
    pureAssets?: boolean;
  }): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
      const result = await uploadDeploymentGitMutation.mutateAsync({
        canisterId: data.canisterId,
        gitRepoUrl: data.gitRepoUrl,
        branch: data.branch,
        buildCommand: data.buildCommand,
        outputDir: data.outputDir,
        envVars: data.envVars,
        isDryRun: data.isDryRun,
        pureAssets: data.pureAssets
      })
      return { success: result.success, error: result.error, data: result.deploymentId ? { id: result.deploymentId } : null }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to deploy from Git'
      }
    }
  }

  // Deploy from URL function
  const deployFromUrl = async (data: {
    canisterId: string;
    archiveUrl: string;
    buildCommand: string;
    outputDir: string;
    envVars?: Record<string, string>;
    isDryRun?: boolean;
    pureAssets?: boolean;
  }): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
      const result = await uploadDeploymentUrlMutation.mutateAsync({
        canisterId: data.canisterId,
        zipUrl: data.archiveUrl,
        buildCommand: data.buildCommand,
        outputDir: data.outputDir,
        envVars: data.envVars,
        isDryRun: data.isDryRun,
        pureAssets: data.pureAssets
      })
      return { success: result.success, error: result.error, data: result.deploymentId ? { id: result.deploymentId } : null }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to deploy from URL'
      }
    }
  }

  // Convert deployments data and error to match original interface
  const deployments = deploymentsData || []
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to fetch deployments') : ''

  return {
    deployments,
    isLoading,
    error,
    deployToCanister,
    deployFromGit,
    deployFromUrl,
    refreshDeployments
  }
}

// Hook for single deployment
export function useDeployment(deploymentId?: string) {
  // Query for fetching single deployment
  const {
    data: deploymentData,
    isLoading,
    error: queryError,
    refetch: refreshDeployment
  } = useQuery({
    queryKey: ['deployment', deploymentId],
    queryFn: async () => {
      if (!deploymentId) throw new Error('Deployment ID is required')
      
      console.log('🔍 [useDeployment.queryFn] Starting fetch for deployment:', deploymentId)
      const response = await deploymentsApi.getDeployment(deploymentId)
      
      console.log('📦 [useDeployment.queryFn] API response:', {
        success: response.success,
        error: response.error,
        hasDeployment: !!response.deployment
      })
      
      if (response.success && response.deployment) {
        console.log('✅ [useDeployment.queryFn] Converting deployment...')
        const deployment = toDeployment(response.deployment)
        console.log('✅ [useDeployment.queryFn] Converted deployment:', deployment)
        return deployment
      } else {
        throw new Error(response.error || 'Failed to fetch deployment')
      }
    },
    enabled: !!deploymentId, // Only run query if deploymentId is provided
    staleTime: 30 * 1000, // Data considered fresh for 30 seconds
    refetchOnWindowFocus: false,
    retry: 2
  })

  // Convert deployment data and error to match original interface
  const deployment = deploymentData || null
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to fetch deployment') : ''

  return {
    deployment,
    isLoading,
    error,
    refreshDeployment
  }
}