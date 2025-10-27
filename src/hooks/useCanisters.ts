import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiCanister, Response } from '../types'
import { createCanisterOnLedger } from "./useTCycles.ts";
import { getManagementActor } from "../api/management";
import { Principal } from "@dfinity/principal";
import { getAssetStorageActor } from "../api/asset-storage";
import { getAgent } from "./useInternetIdentity.ts";
import { getBackendActor } from "../api/backend";
import type { CanisterInfo as BackendCanisterInfo } from "../api/backend/backend.did";

export type CanisterInfo = {
  id: string;
  icCanisterId: string;
  name: string;
  cycles: number;
  lastDeployment: string;
  status: 'active' | 'inactive';
  frontendUrl: string;
  createdAt: string;
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
  _apiData?: ApiCanister;
}

// Transform Backend canister to frontend format
function transformBackendCanisterToFrontend(b: BackendCanisterInfo): CanisterInfo {
  const icId = b.canisterId.toText();
  const createdAt = new Date(Number(b.createdAt / 1_000_000n)).toISOString();
  const deletedAt = b.deletedAt.length
    ? new Date(Number(b.deletedAt[0] / 1_000_000n)).toISOString()
    : undefined;
  return {
    id: icId, // No DB id from backend; use canister id
    icCanisterId: icId,
    name: `Canister ${icId.slice(0, 5)}`,
    cycles: 0,
    lastDeployment: createdAt,
    status: 'active',
    frontendUrl: b.frontendUrl,
    createdAt: createdAt,
    deleted: !!deletedAt,
    deletedAt,
    userId: b.userId.toText(),
    cyclesBalance: undefined,
    cyclesBalanceRaw: undefined,
    wasmBinarySize: undefined,
    moduleHash: undefined,
    controllers: undefined,
    isAssetCanister: undefined,
    isSystemController: undefined,
    _apiData: undefined,
  }
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
      console.log('🚀 [useCanisters.queryFn] Starting fetch via backend canister...')
      const backend = await getBackendActor();
      const list = await backend.listCanisters();
      const transformedCanisters = list.map(transformBackendCanisterToFrontend);
      console.log('✅ [useCanisters.queryFn] Transformed canisters:', transformedCanisters.length)
      return transformedCanisters
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
      const backend = await getBackendActor();
      const registered = await backend.registerCanister(Principal.fromText(canisterId));
      const transformed = transformBackendCanisterToFrontend(registered);
      return [canisterId, transformed] as [string, CanisterInfo]
    },
    onSuccess: (response) => {
      setCreationStatus('success')
      setCreationMessage('Your canister is ready!')
      // Invalidate and refetch canisters list
      queryClient.invalidateQueries({ queryKey: ['canisters'] })
      // Also invalidate cycles data as creating a canister consumes cycles
      queryClient.invalidateQueries({ queryKey: ['cycles'] })
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

      const backend = await getBackendActor();
      await backend.deleteCanister(Principal.fromText(canister.icCanisterId));
      return { canisterDbId }
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

      // If not in cache, fetch from backend canister
      const backend = await getBackendActor();
      const b = await backend.getCanister(Principal.fromText(icCanisterId));

      const transformedCanister = transformBackendCanisterToFrontend(b)
      console.log('✅ [useCanisters.getCanister] Transformed canister:', transformedCanister)

      // Update cache with the new data
      queryClient.setQueryData(['canister', icCanisterId], transformedCanister)
      await queryClient.invalidateQueries({ queryKey: ["canister", "status", icCanisterId] });

      return { success: true, data: transformedCanister }
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
      return { success: true, data: result }
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