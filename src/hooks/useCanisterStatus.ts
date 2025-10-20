import { useQuery } from '@tanstack/react-query'
import { Principal } from '@dfinity/principal'
import { getStatusProxyActor } from '../api/status-proxy'
import type { CanisterStatus } from '../api/status-proxy/status_proxy.did'

export type CanisterStatusResult = {
  timestampSec: bigint
  status: CanisterStatus
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

  const idleBurnPerDayRaw = (() => {
    try {
      return String(query.data?.status.idle_cycles_burned_per_day) || undefined
    } catch {
      return undefined
    }
  })()

  const burnTcPerYear = (() => {
    if (!idleBurnPerDayRaw) return undefined
    try {
      const perDay = Number(BigInt(idleBurnPerDayRaw))
      const perYearCycles = perDay * 365
      const tc = perYearCycles / 1_000_000_000_000
      return tc
    } catch {
      return undefined
    }
  })()

  const yearsLeft = (() => {
    try {
      return Number(cycles) / (1_000_000_000_000 * burnTcPerYear!)
    } catch {
      return undefined
    }
  })()

  return {
    ...query,
    cyclesRaw: cycles,
    idleBurnPerDayRaw,
    burnTcPerYear,
    yearsLeft,
  }
}
