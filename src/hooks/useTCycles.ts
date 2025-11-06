import { useQuery } from '@tanstack/react-query'
import { Principal } from '@dfinity/principal'
import { getTCyclesLedgerActor } from '../api/tcycles-ledger'
import { getAuthClient } from "./useInternetIdentity.ts";
import { bigIntReplacer } from "../utils/json_bigints.ts";
import { statusProxyCanisterId } from "../api/status-proxy";

export type TCyclesBalance = {
  balance: string
}

async function fetchBalance(principalText: string): Promise<TCyclesBalance> {
  const actor = await getTCyclesLedgerActor()
  const account = { owner: Principal.fromText(principalText), subaccount: [] as [] }
  const balance = (await actor.icrc1_balance_of(account)) as bigint
  return { balance: balance.toString() }
}

export async function createCanisterOnLedger() {
  const myPrincipal = (await getAuthClient()).getIdentity().getPrincipal();
  if (!statusProxyCanisterId) {
    throw new Error('Status proxy canister ID is not configured. Set VITE_STATUS_PROXY_CANISTER_ID in your env.');
  }

  const actor = await getTCyclesLedgerActor()
  const res = await actor.create_canister({
    from_subaccount: [],
    created_at_time: [],
    amount: 840_000_000_000n,
    creation_args: [
      {
        subnet_selection: [],
        settings: [
          {
            controllers: [[
              Principal.fromText(statusProxyCanisterId),
              myPrincipal
            ]],
            compute_allocation: [],
            memory_allocation: [],
            freezing_threshold: [],
            reserved_cycles_limit: [],
          },
        ],
      },
    ],
  })

  if ('Err' in res) {
    if ('InsufficientFunds' in res.Err) {
      throw new Error('Insufficient balance. Please top up your cycles account.')
    } else {
      throw new Error(JSON.stringify(res.Err, bigIntReplacer))
    }
  }
  return { canisterId: res.Ok.canister_id.toText(), blockId: res.Ok.block_id }
}

export function useTCycles(principal: string | null = null) {
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

  const parseTCToRaw = (tc: string | number): bigint => {
    const DECIMALS = 12n
    const parts = tc.toString().trim()
    if (!/^\d*(?:\.\d{0,12})?$/.test(parts)) {
      throw new Error('Invalid amount format. Use up to 12 decimal places.')
    }
    const [wholeStr, fracStr = ''] = parts.split('.')
    const whole = BigInt(wholeStr || '0')
    const fracPadded = (fracStr + '0'.repeat(12)).slice(0, 12)
    const frac = BigInt(fracPadded)
    return whole * 10n ** DECIMALS + frac
  }

  const balanceTC = data?.balance ? formatTC(data.balance) : undefined

  const withdrawToCanister = async (canisterIdText: string, amountTC: string | number) => {
    const actor = await getTCyclesLedgerActor()
    const toPrincipal = Principal.fromText(canisterIdText)
    const amount = parseTCToRaw(amountTC)
    const res = await actor.withdraw({ to: toPrincipal, amount, created_at_time: [], from_subaccount: [] })
    if ('Err' in res) {
      const err = res.Err as any
      throw new Error(
        err?.GenericError?.message ||
        (err?.InvalidReceiver ? `Invalid receiver: ${canisterIdText}` :
          err?.InsufficientFunds ? 'Insufficient funds' :
            'Failed to withdraw')
      )
    }
    return res.Ok as bigint
  }

  return {
    balanceRaw: data?.balance,
    balanceTC,
    isLoading,
    isFetching,
    error: error instanceof Error ? error.message : undefined,
    refresh: refetch,
    formatTC,
    withdrawToCanister,
  }
}
