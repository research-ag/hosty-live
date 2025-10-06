import { useQuery } from '@tanstack/react-query'
import { Principal } from '@dfinity/principal'
import { createActor, canisterId as generatedCanisterId } from '../api/tcycles-ledger'

export type TCyclesBalance = {
  balance: string
}

function getLedgerCanisterId(): string {
  const fromEnv = import.meta.env.VITE_TCYCLES_LEDGER_CANISTER_ID as string | undefined
  const cid = fromEnv || generatedCanisterId
  if (!cid) {
    throw new Error('Cycles ledger canister ID is not configured. Set VITE_TCYCLES_LEDGER_CANISTER_ID in your env.')
  }
  return cid
}

async function fetchBalance(principalText: string): Promise<TCyclesBalance> {
  const cid = getLedgerCanisterId()
  const actor = createActor(cid)
  const account = { owner: Principal.fromText(principalText), subaccount: [] as [] }
  const balance = (await actor.icrc1_balance_of(account)) as bigint
  return { balance: balance.toString() }
}

export function useTCycles(principal?: string) {
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<TCyclesBalance>({
    queryKey: ['tcycles', 'balance', principal ?? 'anonymous'],
    queryFn: () => fetchBalance(principal!),
    enabled: !!principal,
    staleTime: 30 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
  })

  const formatTC = (raw: string | number | bigint) => {
    const n = typeof raw === 'bigint' ? raw : BigInt(raw.toString())
    const DECIMALS = 12n
    const denom = 10n ** DECIMALS
    const whole = n / denom
    const frac = n % denom
    const fracStr = (Number(frac) / Number(denom)).toFixed(4).split('.')[1]
    return `${whole.toString()}.${fracStr}`
  }

  const balanceTC = data?.balance ? formatTC(data.balance) : undefined

  return {
    balanceRaw: data?.balance,
    balanceTC,
    isLoading,
    isFetching,
    error: error instanceof Error ? error.message : undefined,
    refresh: refetch,
    formatTC,
  }
}
