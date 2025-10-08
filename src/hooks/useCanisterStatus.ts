import { useQuery } from '@tanstack/react-query'
import { Principal } from '@dfinity/principal'
import { ActorSubclass, HttpAgent } from '@dfinity/agent'
import { canisterId as statusProxyCanisterId, createActor } from '../api/status-proxy'
import type { _SERVICE, CanisterStatus } from '../api/status-proxy/status_proxy.did'
import { getClient } from "./useInternetIdentity.ts";

export type CanisterStatusResult = {
  timestampSec: bigint
  status: CanisterStatus
}

function getStatusProxyCanisterId(): string {
  const fromEnv = import.meta.env.VITE_STATUS_PROXY_CANISTER_ID as string | undefined
  const cid = fromEnv || statusProxyCanisterId
  if (!cid) throw new Error('Status proxy canister ID is not configured. Set VITE_STATUS_PROXY_CANISTER_ID in your env.')
  return cid
}

async function getStatusProxyActor(): Promise<ActorSubclass<_SERVICE>> {
  const cid = getStatusProxyCanisterId()
  const authClient = await getClient();
  const identity = authClient.getIdentity();
  const agent = new HttpAgent({ identity, host: 'https://ic0.app' })
  return createActor(cid, { agent })
}

export async function fetchCanisterStatus(targetCanisterIdText: string): Promise<CanisterStatusResult> {
  const actor = await getStatusProxyActor()
  const target = Principal.fromText(targetCanisterIdText)
  const maybe = await actor.queryState(target)
  if (Array.isArray(maybe) && maybe.length === 1) {
    const [tuple] = maybe
    if (Array.isArray(tuple) && tuple.length === 2) {
      const [ts, stat] = tuple as [bigint, CanisterStatus]
      const nowSec = BigInt(Math.floor(Date.now() / 1000))
      const age = nowSec - ts
      const CACHE_TTL_SEC = 60n // 6n * 60n * 60n
      if (age >= 0n && age <= CACHE_TTL_SEC) {
        return { timestampSec: ts, status: stat }
      }
    }
  }
  const [ts, stat] = await actor.loadState(target)
  return { timestampSec: ts, status: stat }
}

export function useCanisterStatus(canisterId?: string) {
  const query = useQuery<CanisterStatusResult, Error>({
    queryKey: ['canister', 'status', canisterId ?? 'unknown'],
    queryFn: () => fetchCanisterStatus(canisterId!),
    enabled: !!canisterId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
  })

  const cycles = (() => {
    const stat = query.data?.status
    if (!stat) return undefined
    try {
      return (stat.cycles as unknown as bigint).toString()
    } catch {
      try {
        return String(stat.cycles)
      } catch {
        return undefined
      }
    }
  })()

  return {
    ...query,
    cyclesRaw: cycles,
  }
}
