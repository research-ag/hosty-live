import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Canister, mapCanister, mapProfile, Response } from '../types'
import { createCanisterOnLedger } from "./useTCycles.ts";
import { getManagementActor } from "../api/management";
import { Principal } from "@dfinity/principal";
import { getAssetStorageActor } from "../api/asset-storage";
import { getAuthClient } from "./useInternetIdentity.ts";
import { backendCanisterId, getBackendActor } from "../api/backend";
import { init as assetStorageInit } from "../api/asset-storage/asset_storage.did";
import { IDL } from "@dfinity/candid";
import defaultPage from "../constants/default-page.ts";
import { canister_status_result } from "../api/management/management.did";

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
      const [canisters, profile] = await Promise.all([backend.listCanisters(), backend.getProfile()])
      let transformedCanisters = canisters.map(c => mapCanister(c));
      const transformedProfile = profile.length ? mapProfile(profile[0]) : null;
      if (transformedProfile?.rentedCanister) {
        transformedCanisters = [transformedProfile.rentedCanister, ...transformedCanisters];
      }
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
    userPrincipals: Principal[],
    buildSystemPrincipal: Principal,
    reinstall: boolean = false,
  ) => {
    // install asset canister
    await management.install_code.withOptions({
      effectiveCanisterId: Principal.fromText(canisterId),
    })({
      arg: new Uint8Array(IDL.encode(assetStorageInit({ IDL }), [[]])),
      wasm_module: [...wasmBinary],
      mode: reinstall ? { reinstall: null } : { install: null },
      canister_id: Principal.fromText(canisterId),
      sender_canister_version: [],
    });
    const assetCanister = await getAssetStorageActor(canisterId);
    await Promise.all([
      ...userPrincipals.map(p => assetCanister.grant_permission({
        permission: { Prepare: null },
        to_principal: p,
      })),
      ...userPrincipals.map(p => assetCanister.grant_permission({
        permission: { Commit: null },
        to_principal: p,
      })),
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
      try {
        await performInitialCanisterSetup(canisterId, management, wasmBinary, [myPrincipal], buildSystemPrincipal);
      } catch (err) {
        // TODO implement a way to setup canister again later. We need to register it anyway
        console.error(err);
      }
      // Step 3: register
      setCreationMessage('Registering your canister...')
      const backend = await getBackendActor();
      const registered = await backend.registerCanister(Principal.fromText(canisterId));

      return mapCanister(registered)
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

  const rentCanisterMutation = useMutation({
    mutationFn: async () => {
      const backend = await getBackendActor()
      const result = await backend.rentCanister()
      if ("ok" in result) {
        return mapCanister(result['ok']);
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
      setCreationMessage(err instanceof Error ? err.message : 'Failed to rent a canister')
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
      await backend.deleteCanister(Principal.fromText(canister.id));
      return { canisterDbId }
    },
    onSuccess: ({ canisterDbId }) => {
      // Optimistically remove from cache
      queryClient.setQueryData(['canisters'], (oldData: Canister[]) => {
        if (!oldData) return oldData
        return oldData.filter((c) => c.id !== canisterDbId)
      })
      // Also invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: ['canisters'] })
    },
  })

  // Get single canister with caching
  const getCanister = async (icCanisterId: string, skipCache?: boolean): Promise<Response<Canister>> => {
    try {
      console.log('🔍 [useCanisters.getCanister] Getting canister by IC ID:', icCanisterId)

      // Try to get from cache first
      const cachedCanister = canisters?.find(c => c.id === icCanisterId)
      if (!skipCache && cachedCanister) {
        console.log('💾 [useCanisters.getCanister] Found in cache:', cachedCanister)
        return { success: true, data: cachedCanister }
      }

      // If not in cache, fetch from backend canister
      const backend = await getBackendActor();
      const b = await backend.getCanister(Principal.fromText(icCanisterId));

      const transformedCanister = mapCanister(b)
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
  const createCanister = async (): Promise<{ success: boolean; error?: string; data?: Canister }> => {
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
  const rentCanister = async (): Promise<{ success: boolean; error?: string; data?: Canister }> => {
    try {
      const result = await rentCanisterMutation.mutateAsync()
      return { success: true, data: result }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to rent a canister'
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
          effectiveCanisterId: Principal.fromText(canister.id)
        })({
          canister_id: Principal.fromText(canister.id),
        });
      if (status.settings.controllers.find(p => p.toText() === userPrincipal)) {
        return { success: true };
      }

      // Update canister settings
      await managementCanister.update_settings.withOptions({
        effectiveCanisterId: Principal.fromText(canister.id)
      })({
        canister_id: Principal.fromText(canister.id),
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
        const assetCanister = await getAssetStorageActor(canister.id);
        await Promise.all([
          assetCanister.grant_permission({
            permission: { Prepare: null },
            to_principal: Principal.fromText(userPrincipal),
          }),
          assetCanister.grant_permission({
            permission: { ManagePermissions: null },
            to_principal: Principal.fromText(userPrincipal),
          }),
          assetCanister.grant_permission({
            permission: { Commit: null },
            to_principal: Principal.fromText(userPrincipal),
          })
        ]);
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

  // Remove controller from canister
  const removeController = async (
    canisterDbId: string,
    userPrincipal: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Find the IC canister ID from the database ID
      const canister = canisters.find((c) => c.id === canisterDbId);
      if (!canister) {
        throw new Error('Canister not found');
      }

      // Resolve current authenticated principal to prevent self-removal
      const auth = await getAuthClient();
      const myPrincipal = auth
        .getIdentity()
        ?.getPrincipal?.()
        ?.toText?.();

      // Do not allow removing our own controller or the status-proxy canister
      // Import dynamically to avoid circular deps
      const { statusProxyCanisterId } = await import('../api/status-proxy/index.js');
      if (userPrincipal === myPrincipal) {
        return { success: false, error: "You can't remove yourself from controllers." };
      }
      if (userPrincipal === statusProxyCanisterId) {
        return {
          success: false,
          error: "You can't remove the status-proxy canister from controllers.",
        };
      }

      const managementCanister = await getManagementActor();

      // Get current canister status
      const status = await managementCanister.canister_status
        .withOptions({
          effectiveCanisterId: Principal.fromText(canister.id),
        })({
          canister_id: Principal.fromText(canister.id),
        });

      const currentControllers: Principal[] = status.settings.controllers;
      const toRemove = Principal.fromText(userPrincipal);
      const exists = currentControllers.find((p) => p.toText() === userPrincipal);
      if (!exists) {
        // Already removed
        return { success: true };
      }

      const newControllers = currentControllers.filter(
        (p) => p.toText() !== userPrincipal
      );

      // Update canister settings
      await managementCanister.update_settings.withOptions({
        effectiveCanisterId: Principal.fromText(canister.id),
      })({
        canister_id: Principal.fromText(canister.id),
        settings: {
          freezing_threshold: [],
          controllers: [newControllers],
          reserved_cycles_limit: [],
          log_visibility: [],
          wasm_memory_limit: [],
          memory_allocation: [],
          compute_allocation: [],
          wasm_memory_threshold: [],
        },
        sender_canister_version: [],
      });

      // If asset canister, revoke permissions: Prepare, ManagePermissions, Commit
      try {
        const assetCanister = await getAssetStorageActor(canister.id);
        await Promise.all([
          assetCanister.revoke_permission({
            permission: { Prepare: null },
            of_principal: toRemove,
          }),
          assetCanister.revoke_permission({
            permission: { ManagePermissions: null },
            of_principal: toRemove,
          }),
          assetCanister.revoke_permission({
            permission: { Commit: null },
            of_principal: toRemove,
          }),
        ]);
      } catch {
        // not an asset canister, pass
      }

      // Invalidate all canister-related cache after removing controller
      queryClient.invalidateQueries({ queryKey: ['canisters'] });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error ? err.message : 'Failed to remove controller',
      };
    }
  };

  const resetCanister = async (
    canisterId: string,
    canisterOwners: Principal[],
    options: {
      skipCheck?: boolean;
    } = {},
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!options.skipCheck && !canisters.find((c) => c.id === canisterId)) {
        throw new Error('Canister not found');
      }

      const response = await fetch("/assetstorage.wasm.gz");
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      const wasmBinary = new Uint8Array(await response.arrayBuffer())
      const managementCanister = await getManagementActor();
      const { statusProxyCanisterId } = await import('../api/status-proxy/index.js');
      const buildSystemPrincipal = Principal.fromText(import.meta.env.VITE_BACKEND_PRINCIPAL);

      // 1) Reset controllers to defaults: current user + status-proxy canister
      await managementCanister.update_settings.withOptions({
        effectiveCanisterId: Principal.fromText(canisterId),
      })({
        canister_id: Principal.fromText(canisterId),
        settings: {
          freezing_threshold: [BigInt(365 * 24 * 60 * 60)],
          controllers: [[...canisterOwners, Principal.fromText(statusProxyCanisterId)]],
          reserved_cycles_limit: [],
          log_visibility: [],
          wasm_memory_limit: [],
          memory_allocation: [],
          compute_allocation: [],
          wasm_memory_threshold: [],
        },
        sender_canister_version: [],
      });
      await performInitialCanisterSetup(canisterId, managementCanister, wasmBinary, canisterOwners, buildSystemPrincipal, true);
      return { success: true };
    } catch (err) {
      console.error(err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to reset canister',
      };
    } finally {
      queryClient.invalidateQueries({ queryKey: ['canisters'] });
      queryClient.invalidateQueries({ queryKey: ['canister', canisterId] });
      await queryClient.invalidateQueries({ queryKey: ['canister', 'status', canisterId] });
    }
  };

  const donateCanister = async (
    canisterId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const addControllerRes = await addController(canisterId, backendCanisterId);
      if (!addControllerRes.success) {
        return addControllerRes;
      }
      const backend = await getBackendActor();
      const res = await backend.donateCanister(Principal.fromText(canisterId));
      if (res && 'ok' in res) {
        return { success: true };
      }
      const errMsg = res && 'err' in res ? (res.err as any) : 'Donation failed';
      return { success: false, error: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg) };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to donate canister',
      };
    } finally {
      // After donating, this canister should disappear from the owner list
      await queryClient.invalidateQueries({ queryKey: ['canisters'] });
    }
  };

  const importCanister = async (
    canisterId: string,
    opts: { reset: boolean }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (canisters.find((c) => c.id === canisterId)) {
        return { success: false, error: 'Already registered' };
      }
      const management = await getManagementActor();
      // Validate controller
      let canisterStatus: canister_status_result;
      try {
        canisterStatus = await management.canister_status.withOptions({
          effectiveCanisterId: Principal.fromText(canisterId),
        })({
          canister_id: Principal.fromText(canisterId),
        });
      } catch (_) {
        return {
          success: false,
          error: 'Canister does not exist or you are not a controller of this canister. Please add yourself as a controller first.'
        };
      }
      // the fact that management canister returned data means that user is a controller

      // const controllers: Principal[] = status.settings.controllers;
      // const isController = controllers.some((p) => p.toText() === myPrincipal.toText());
      // if (!isController) {
      //   return { success: false, error: 'You are not a controller of this canister. Please add yourself as a controller first.' };
      // }

      // Register in backend
      const backend = await getBackendActor();
      const canisterInfo = await backend.registerCanister(Principal.fromText(canisterId));

      if (opts.reset) {
        await resetCanister(canisterId, canisterInfo.userIds, { skipCheck: true });
      } else {
        // ensure that the status proxy canister is a controller and the build system has ability to commit assets
        const { statusProxyCanisterId } = await import('../api/status-proxy/index.js');
        const controllers = canisterStatus.settings.controllers;
        if (!controllers.some((p) => p.toText() === statusProxyCanisterId)) {
          await management.update_settings.withOptions({
            effectiveCanisterId: Principal.fromText(canisterId),
          })({
            canister_id: Principal.fromText(canisterId),
            settings: {
              freezing_threshold: [],
              controllers: [[...controllers, Principal.fromText(statusProxyCanisterId)]],
              reserved_cycles_limit: [],
              log_visibility: [],
              wasm_memory_limit: [],
              memory_allocation: [],
              compute_allocation: [],
              wasm_memory_threshold: [],
            },
            sender_canister_version: [],
          });
        }
        try {
          const assetCanister = await getAssetStorageActor(canisterId);
          await assetCanister.grant_permission({
            permission: { Commit: null },
            to_principal: Principal.fromText(import.meta.env.VITE_BACKEND_PRINCIPAL),
          });
        } catch (_) {
          // pass
        }
      }

      // Refresh lists and specific caches
      queryClient.invalidateQueries({ queryKey: ['canisters'] });
      queryClient.invalidateQueries({ queryKey: ['canister', canisterId] });
      queryClient.invalidateQueries({ queryKey: ['canister', 'status', canisterId] });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to import canister',
      };
    }
  };

  return {
    canisters,
    isLoading,
    error,
    createCanister,
    rentCanister,
    deleteCanister,
    addController,
    removeController,
    getCanister,
    refreshCanisters,
    creationMessage,
    resetCreationStatus: () => {
      setCreationMessage('')
    },
    resetCanister,
    importCanister,
    donateCanister,
  }
}