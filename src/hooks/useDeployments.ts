import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { deploymentsApi } from '../services/api'
import type { ApiDeployment } from '../types'

// Transform API deployment to frontend format
function transformApiDeployment(apiDeployment: ApiDeployment) {
  // Normalize status to UI values
  const rawStatus = (apiDeployment.status || '').toString().toUpperCase()
  const status = (
    rawStatus === 'SUCCESS' ? 'deployed' :
    rawStatus === 'BUILDING' || rawStatus === 'DEPLOYING' ? 'building' :
    rawStatus === 'FAILED' || rawStatus === 'CANCELLED' ? 'failed' :
    'pending'
  ) as 'pending' | 'building' | 'deployed' | 'failed'

  // Map source type to legacy union
  const rawSource = (apiDeployment.sourceType || '').toString().toUpperCase()
  const sourceType = (
    rawSource === 'GIT' ? 'git' :
    rawSource === 'ZIP' ? 'zip' :
    undefined
  ) as 'zip' | 'git' | undefined

  return {
    id: apiDeployment.id,
    canisterId: apiDeployment.canisterId,
    status,
    statusReason: apiDeployment.statusReason,
    userId: apiDeployment.principal,
    buildCommand: apiDeployment.buildCommand || '',
    outputDirectory: apiDeployment.outputDir || '',
    duration: apiDeployment.durationMs,
    createdAt: apiDeployment.createdAt,
    updatedAt: apiDeployment.updatedAt,
    buildServiceJobId: apiDeployment.buildServiceJobId,
    deployedAt: apiDeployment.deployedAt,
    buildLogs: apiDeployment.buildLogs,
    sourceGitRepo: apiDeployment.sourceGitRepo,
    sourceType,
    gitBranch: apiDeployment.gitBranch,
    // Store additional API data
    _apiData: apiDeployment
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
        console.log('✅ [useDeployments.queryFn] Transforming deployments...')
        const transformedDeployments = response.deployments.map(transformApiDeployment)
        console.log('✅ [useDeployments.queryFn] Transformed deployments:', transformedDeployments.length)
        return transformedDeployments
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

  // Deploy to canister function
  const deployToCanister = async (data: {
    canisterId: string;
    file: File;
    buildCommand: string;
    outputDir: string;
  }): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
      const result = await uploadDeploymentMutation.mutateAsync({
        canisterId: data.canisterId,
        zipFile: data.file,
        buildCommand: data.buildCommand,
        outputDir: data.outputDir
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
  }): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
      const result = await uploadDeploymentGitMutation.mutateAsync({
        canisterId: data.canisterId,
        gitRepoUrl: data.gitRepoUrl,
        branch: data.branch,
        buildCommand: data.buildCommand,
        outputDir: data.outputDir
      })
      return { success: result.success, error: result.error, data: result.deploymentId ? { id: result.deploymentId } : null }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to deploy from Git'
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
        console.log('✅ [useDeployment.queryFn] Transforming deployment...')
        const transformedDeployment = transformApiDeployment(response.deployment)
        console.log('✅ [useDeployment.queryFn] Transformed deployment:', transformedDeployment)
        return transformedDeployment
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