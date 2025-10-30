import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiCanister, Response } from '../types'
import { createCanisterOnLedger } from "./useTCycles.ts";
import { getManagementActor } from "../api/management";
import { Principal } from "@dfinity/principal";
import { getAssetStorageActor } from "../api/asset-storage";
import { getAgent, getAuthClient } from "./useInternetIdentity.ts";
import { getBackendActor } from "../api/backend";
import type { CanisterInfo as BackendCanisterInfo } from "../api/backend/backend.did";
import { init as assetStorageInit } from "../api/asset-storage/asset_storage.did";
import { IDL } from "@dfinity/candid";
import defaultPage from "../constants/default-page.ts";

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
  _apiData?: ApiCanister;
}

// Transform Backend canister to frontend format
function transformBackendCanisterToFrontend(b: BackendCanisterInfo): CanisterInfo {
  const icId = b.canisterId.toText();
  const createdAt = new Date(Number(b.createdAt / 1_000_000n)).toISOString();
  const updatedAt = new Date(Number(b.updatedAt / 1_000_000n)).toISOString();
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
    updatedAt: updatedAt,
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

  const performInitialCanisterSetup = async (
    canisterId: string,
    management: Awaited<ReturnType<typeof getManagementActor>>,
    wasmBinary: Uint8Array,
    myPrincipal: Principal,
    buildSystemPrincipal: Principal
  ) => {
    // install asset canister
    await management.install_code.withOptions({
      effectiveCanisterId: Principal.fromText(canisterId),
    })({
      arg: new Uint8Array(IDL.encode(assetStorageInit({ IDL }), [[]])),
      wasm_module: [...wasmBinary],
      mode: { reinstall: null },
      canister_id: Principal.fromText(canisterId),
      sender_canister_version: [],
    });
    const assetCanister = await getAssetStorageActor(canisterId);
    await Promise.all([
      assetCanister.grant_permission({
        permission: { Prepare: null },
        to_principal: myPrincipal,
      }),
      assetCanister.grant_permission({
        permission: { Commit: null },
        to_principal: myPrincipal,
      }),
      assetCanister.grant_permission({
        permission: { Commit: null },
        to_principal: buildSystemPrincipal,
      })
    ])
    // upload default page
    await assetCanister.store({
      key: "/index.html",
      content: new TextEncoder().encode(defaultPage(canisterId)),
      sha256: [],
      content_type: "text/html",
      content_encoding: "identity",
    });
  }

  // Mutation for creating canisters
  const createCanisterMutation = useMutation({
    mutationFn: async () => {
      // Step 0: prepare asset canister binary
      setCreationMessage('Preparing...')
      const response = await fetch("/assetstorage.wasm.gz");
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      const wasmBinary = new Uint8Array(await response.arrayBuffer())
      const management = await getManagementActor()
      const myPrincipal = (await getAuthClient()).getIdentity().getPrincipal()
      const buildSystemPrincipal = Principal.fromText(import.meta.env.VITE_BACKEND_PRINCIPAL)
      // Step 1: creating on ledger
      setCreationMessage('Creating your canister...')
      const { canisterId } = await createCanisterOnLedger()
      // Step 2: preparing via backend
      setCreationMessage('Preparing your canister...')
      await performInitialCanisterSetup(canisterId, management, wasmBinary, myPrincipal, buildSystemPrincipal);
      // Step 3: register
      setCreationMessage('Registering your canister...')
      const backend = await getBackendActor();
      const registered = await backend.registerCanister(Principal.fromText(canisterId));

      return transformBackendCanisterToFrontend(registered)
    },
    onSuccess: (_) => {
      setCreationMessage('Your canister is ready!')
      // Invalidate and refetch canisters list
      queryClient.invalidateQueries({ queryKey: ['canisters'] })
      // Also invalidate cycles data as creating a canister consumes cycles
      queryClient.invalidateQueries({ queryKey: ['cycles'] })
    },
    onError: (err) => {
      setCreationMessage(err instanceof Error ? err.message : 'Failed to create canister')
    },
    onSettled: () => {
      // Leave the last message for UI; caller can reset explicitly
    }
  })

  // Mutation for claiming free canister
  const claimFreeCanisterMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/assetstorage.wasm.gz");
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      const wasmBinary = new Uint8Array(await response.arrayBuffer())
      const management = await getManagementActor()
      const myPrincipal = (await getAuthClient()).getIdentity().getPrincipal()
      const buildSystemPrincipal = Principal.fromText(import.meta.env.VITE_BACKEND_PRINCIPAL)

      const backend = await getBackendActor()
      const result = await backend.claimFreeCanister()
      if ("ok" in result) {
        const canisterInfo = result['ok'];
        await performInitialCanisterSetup(canisterInfo.canisterId.toText(), management, wasmBinary, myPrincipal, buildSystemPrincipal);
        return transformBackendCanisterToFrontend(canisterInfo);
      } else {
        throw new Error(result['err']);
      }
    },
    onSuccess: (_) => {
      // Invalidate and refetch canisters list
      queryClient.invalidateQueries({ queryKey: ['canisters'] })
      // Also invalidate cycles data as creating a canister consumes cycles
      queryClient.invalidateQueries({ queryKey: ['cycles'] })
    },
    onError: (err) => {
      setCreationMessage(err instanceof Error ? err.message : 'Failed to claim free canister canister')
    },
    onSettled: () => {
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
  const createCanister = async (): Promise<{ success: boolean; error?: string; data?: CanisterInfo }> => {
    try {
      const result = await createCanisterMutation.mutateAsync()
      return { success: true, data: result }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create canister'
      }
    }
  }

  // Wrapper functions to maintain the same interface
  const claimFreeCanister = async (): Promise<{ success: boolean; error?: string; data?: CanisterInfo }> => {
    try {
      const result = await claimFreeCanisterMutation.mutateAsync()
      return { success: true, data: result }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to claim free canister'
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
    claimFreeCanister,
    deleteCanister,
    addController,
    getCanister,
    refreshCanisters,
    creationMessage,
    resetCreationStatus: () => {
      setCreationMessage('')
    }
  }
}