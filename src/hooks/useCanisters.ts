import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { canistersApi, CreateCanisterResponse } from '../services/api'
import { ApiCanister, Response } from '../types'
import { createCanisterOnLedger } from "./useTCycles.ts";
import { getManagementActor } from "../api/management";
import { Principal } from "@dfinity/principal";
import { getAssetStorageActor } from "../api/asset-storage";
import { getAgent, getAuthClientSync } from "./useInternetIdentity.ts";

export type CanisterInfo = {
  id: string;
  icCanisterId: string;
  name: string;
  cycles: number;
  lastDeployment: string;
  status: 'active' | 'inactive';
  frontendUrl: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  deletedAt: string | undefined;
  userId: string;
  cyclesBalance: string | undefined;
  cyclesBalanceRaw: string | undefined;
  wasmBinarySize: string | undefined;
  moduleHash: string | undefined;
  controllers: string[] | undefined;
  isAssetCanister: boolean | undefined;
  isSystemController: boolean | undefined;
  isUserController: boolean | undefined;
  _apiData: ApiCanister;
}

// Transform API canister to frontend format
function transformApiCanisterToFrontend(apiCanister: ApiCanister): CanisterInfo {
  return {
    id: apiCanister.id, // Use database ID as the main ID for frontend
    icCanisterId: apiCanister.icCanisterId,
    name: `Canister ${apiCanister.icCanisterId.slice(0, 5)}`,
    cycles: apiCanister.cyclesBalanceRaw ? Number(apiCanister.cyclesBalanceRaw) / 1_000_000_000_000 : 0,
    lastDeployment: apiCanister.updatedAt,
    status: apiCanister.deleted ? 'inactive' : 'active' as const,
    frontendUrl: apiCanister.frontendUrl,
    createdAt: apiCanister.createdAt,
    updatedAt: apiCanister.updatedAt,
    deleted: apiCanister.deleted,
    deletedAt: apiCanister.deletedAt,
    userId: apiCanister.userId,
    cyclesBalance: apiCanister.cyclesBalance,
    cyclesBalanceRaw: apiCanister.cyclesBalanceRaw,
    wasmBinarySize: apiCanister.wasmBinarySize,
    moduleHash: apiCanister.moduleHash,
    controllers: apiCanister.controllers,
    isAssetCanister: apiCanister.isAssetCanister,
    isSystemController: apiCanister.isSystemController,
    isUserController: apiCanister.controllers?.includes(getAuthClientSync()?.getIdentity().getPrincipal().toText()),
    // Store additional API data
    _apiData: apiCanister
  }
}

// Legacy transform function for list endpoint compatibility
function transformCanister(apiCanister: ApiCanister) {
  return transformApiCanisterToFrontend(apiCanister)
}

export function useCanisters() {
  const queryClient = useQueryClient()
  // State for creation progress UI
  const [creationStatus, setCreationStatus] = useState<'idle' | 'creating' | 'preparing' | 'success' | 'error'>('idle')
  const [creationMessage, setCreationMessage] = useState<string>('')

  // Query for fetching canisters list
  const {
    data: canistersData,
    isLoading,
    error: queryError,
    refetch: refreshCanisters
  } = useQuery({
    queryKey: ['canisters'],
    queryFn: async () => {
      console.log('🚀 [useCanisters.queryFn] Starting fetch...')
      const response = await canistersApi.listCanisters()

      console.log('📦 [useCanisters.queryFn] API response:', {
        success: response.success,
        error: response.error,
        dataStructure: response.data ? {
          hasData: !!response.data,
          hasCanisters: !!response.data.canisters,
          canistersIsArray: Array.isArray(response.data.canisters),
          canistersLength: response.data.canisters?.length,
        } : 'no data'
      })

      if (response.success && response.data?.canisters && Array.isArray(response.data.canisters)) {
        console.log('✅ [useCanisters.queryFn] Transforming canisters...')
        const transformedCanisters = response.data.canisters.map(transformCanister)
        console.log('✅ [useCanisters.queryFn] Transformed canisters:', transformedCanisters.length)
        return transformedCanisters
      } else {
        throw new Error(response.error || 'Failed to fetch canisters')
      }
    },
    staleTime: 30 * 1000, // Data considered fresh for 30 seconds
    refetchOnWindowFocus: false,
    retry: 2
  })

  // Mutation for creating canisters
  const createCanisterMutation = useMutation({
    mutationFn: async () => {
      // Step 1: creating on ledger
      setCreationStatus('creating')
      setCreationMessage('Creating your canister...')
      const { canisterId } = await createCanisterOnLedger()
      // Step 2: preparing via backend
      setCreationStatus('preparing')
      setCreationMessage('Preparing your canister...')
      const registrationResult = await canistersApi.registerCanister(canisterId)
      return [canisterId, registrationResult] as [string, CreateCanisterResponse]
    },
    onSuccess: (response) => {
      if (response[1].success) {
        setCreationStatus('success')
        setCreationMessage('Your canister is ready!')
        // Invalidate and refetch canisters list
        queryClient.invalidateQueries({ queryKey: ['canisters'] })
        // Also invalidate cycles data as creating a canister consumes cycles
        queryClient.invalidateQueries({ queryKey: ['cycles'] })
      } else {
        setCreationStatus('error')
        setCreationMessage(response[1].error || 'Failed to create canister')
      }
    },
    onError: (err) => {
      setCreationStatus('error')
      setCreationMessage(err instanceof Error ? err.message : 'Failed to create canister')
    },
    onSettled: () => {
      // Leave last message for UI; caller can reset explicitly
    }
  })

  // Mutation for deleting canisters
  const deleteCanisterMutation = useMutation({
    mutationFn: async (canisterDbId: string) => {
      // Find the IC canister ID from the database ID
      const canister = canisters.find(c => c.id === canisterDbId)
      if (!canister) {
        throw new Error('Canister not found')
      }

      const response = await canistersApi.deleteCanister(canister.icCanisterId)
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete canister')
      }

      return { canisterDbId, response }
    },
    onSuccess: ({ canisterDbId }) => {
      // Optimistically remove from cache
      queryClient.setQueryData(['canisters'], (oldData) => {
        if (!oldData) return oldData
        return oldData.filter((c) => c.id !== canisterDbId)
      })
      // Also invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ['canisters'] })
    },
  })

  // Get single canister with caching
  const getCanister = async (icCanisterId: string, skipCache?: boolean): Promise<Response<CanisterInfo>> => {
    try {
      console.log('🔍 [useCanisters.getCanister] Getting canister by IC ID:', icCanisterId)

      // Try to get from cache first
      const cachedCanister = canisters?.find(c => c.icCanisterId === icCanisterId)
      if (!skipCache && cachedCanister) {
        console.log('💾 [useCanisters.getCanister] Found in cache:', cachedCanister)
        return { success: true, data: cachedCanister }
      }

      // If not in cache, fetch from API
      const response = await canistersApi.getCanister(icCanisterId)

      console.log('📦 [useCanisters.getCanister] API response:', response)

      if (response.success && response.data) {
        // Transform the single canister data
        const transformedCanister = transformApiCanisterToFrontend(response.data)
        console.log('✅ [useCanisters.getCanister] Transformed canister:', transformedCanister)

        // Update cache with the new data
        queryClient.setQueryData(['canister', icCanisterId], transformedCanister)

        return { success: true, data: transformedCanister }
      } else {
        return { success: false, error: response.error || 'Canister not found' }
      }
    } catch (err) {
      console.error('Failed to get canister:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to get canister'
      }
    }
  }

  // Wrapper functions to maintain the same interface
  const createCanister = async (): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
      const [canisterId, result] = await createCanisterMutation.mutateAsync()
      return { success: result.success, error: result.error, data: result.success ? result.data : { canisterId } }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create canister'
      }
    }
  }

  const deleteCanister = async (canisterDbId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await deleteCanisterMutation.mutateAsync(canisterDbId)
      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete canister'
      }
    }
  }

  // Add controller to canister
  const addController = async (canisterDbId: string, userPrincipal: string): Promise<{
    success: boolean;
    error?: string
  }> => {
    try {
      // Find the IC canister ID from the database ID
      const canister = canisters.find(c => c.id === canisterDbId)
      if (!canister) {
        throw new Error('Canister not found')
      }

      const managementCanister = await getManagementActor();

      // Get current canister status
      const status = await managementCanister.canister_status
        .withOptions({
          effectiveCanisterId: Principal.fromText(canister.icCanisterId)
        })({
          canister_id: Principal.fromText(canister.icCanisterId),
        });
      if (status.settings.controllers.find(p => p.toText() === userPrincipal)) {
        return { success: true };
      }

      // Update canister settings
      await managementCanister.update_settings.withOptions({
        effectiveCanisterId: Principal.fromText(canister.icCanisterId),
        agent: getAgent()
      })({
        canister_id: Principal.fromText(canister.icCanisterId),
        settings: {
          freezing_threshold: [],
          controllers: [[...status.settings.controllers, Principal.fromText(userPrincipal)]],
          reserved_cycles_limit: [],
          log_visibility: [],
          wasm_memory_limit: [],
          memory_allocation: [],
          compute_allocation: [],
          wasm_memory_threshold: [],
        },
        sender_canister_version: [],
      });

      // If asset canister, grant all permissions: Prepare, ManagePermissions, Commit
      try {
        const assetCanister = await getAssetStorageActor(canister.icCanisterId);
        await assetCanister.grant_permission({
          permission: { Prepare: null },
          to_principal: Principal.fromText(userPrincipal),
        });
        await assetCanister.grant_permission({
          permission: { ManagePermissions: null },
          to_principal: Principal.fromText(userPrincipal),
        });
        await assetCanister.grant_permission({
          permission: { Commit: null },
          to_principal: Principal.fromText(userPrincipal),
        });
      } catch {
        // not an asset canister, pass
      }

      // Invalidate all canister-related cache after adding controller
      queryClient.invalidateQueries({ queryKey: ['canisters'] })

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to add controller'
      }
    }
  }

  // Convert canisters data and error to match original interface
  const canisters = canistersData || []
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to fetch canisters') : ''

  return {
    canisters,
    isLoading,
    error,
    createCanister,
    deleteCanister,
    addController,
    getCanister,
    refreshCanisters,
    creationStatus,
    creationMessage,
    resetCreationStatus: () => {
      setCreationStatus('idle')
      setCreationMessage('')
    }
  }
}