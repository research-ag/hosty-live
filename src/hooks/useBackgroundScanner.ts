import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useAuth } from './useAuth'
import { getMyCanisters } from '../services/canisters'
import { getAssetStorageActor } from '../api/asset-storage'
import { Principal } from '@icp-sdk/core/principal'
import { deploymentsApi } from '../services/api'
import { getManagementActor } from "../api/management";

export function useBackgroundScanner() {
  const { isAuthenticated, principal } = useAuth()

  const backendPrincipal = useMemo(() => {
    try {
      const p = import.meta.env.VITE_BACKEND_PRINCIPAL as string | undefined
      return p ? Principal.fromText(p) : null
    } catch (e) {
      console.error('[BG] Invalid VITE_BACKEND_PRINCIPAL env var', e)
      return null
    }
  }, [])

  const inFlight = useRef<Promise<void> | null>(null)

  const runTask = useCallback(async () => {
    if (!isAuthenticated) {
      console.debug('🕒 [BG] Skipping background scan: not authenticated')
      return
    }
    if (inFlight.current) {
      console.debug('⏳ [BG] Previous background scan still running, skipping...')
      return
    }
    inFlight.current = (async () => {
      const startedAt = Date.now()
      console.debug('🚀 [BG] Background scan started', { startedAt, userPrincipal: principal })
      try {
        let canisters = (await getMyCanisters()).map(c => Principal.fromText(c.id));
        const management = await getManagementActor()

        let filtered = [] as Principal[]
        for (const cid of canisters) {
          try {
            await management.canister_status.withOptions({ effectiveCanisterId: cid })({ canister_id: cid })
            filtered.push(cid)
          } catch (_) {
            // pass, not mutable canister
          }
        }
        canisters = filtered
        filtered = []
        console.debug('🧹 [BG] Canisters controlled by user (mutable) count:', canisters.length)

        for (const cid of canisters) {
          try {
            const assets = await getAssetStorageActor(cid.toText())
            const principals = await assets.list_permitted({ permission: { Commit: null } })
            if (principals.find(p => backendPrincipal?.toText() == p.toText())) {
              filtered.push(cid)
            }
          } catch (_) {
            // pass
          }
        }
        canisters = filtered
        filtered = []
        console.debug('🧹 [BG] Canisters with backend commit permission count:', canisters.length)

        for (const cid of canisters) {
          try {
            const resp = await deploymentsApi.isDeploymentRunning(cid.toText())
            if (resp.success) {
              console.debug('🏃 [BG] Running check:', { canisterId: cid, running: resp.running })
              if (!resp.running) filtered.push(cid)
            } else {
              console.warn('⚠️ [BG] Running check failed, treating as running (conservative):', cid, resp.error)
            }
          } catch (_) {
            // pass
          }
        }
        canisters = filtered
        console.debug('🧮 [BG] Canisters matching criteria (no running deployment + commit granted to backend):', canisters.length)

        for (const cid of canisters) {
          try {
            const assets = await getAssetStorageActor(cid.toText())
            await assets.revoke_permission({
              permission: { Commit: null },
              of_principal: backendPrincipal,
            })
            console.debug('🧮 [BG] Revoked backend commit permission on canister ' + cid.toText())
          } catch (err) {
            console.warn('⚠️ [BG] Could not revoke backend commit permissions from canister ' + cid.toText() + ': ' + err)
          }
        }
      } catch (e) {
        console.error('💥 [BG] Background scan failed:', e)
      } finally {
        const durationMs = Date.now() - startedAt
        console.debug('✅ [BG] Background scan finished in ms:', durationMs)
        inFlight.current = null
      }
    })()

    try {
      await inFlight.current
    } catch {
      // pass
    }
  }, [isAuthenticated, principal, backendPrincipal])

  // Run immediately on auth and then every 5 minutes
  useEffect(() => {
    if (!isAuthenticated) return
    runTask().then()
    const id = setInterval(() => {
      runTask().then()
    }, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [isAuthenticated, runTask])

  // Also attempt one run at mount to support the case when user is already logged in on page open
  useEffect(() => {
    if (isAuthenticated) {
      runTask().then()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
