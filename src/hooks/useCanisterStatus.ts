import { useQuery } from "@tanstack/react-query";
import { Principal } from "@icp-sdk/core/principal";
import { getStatusProxyActor } from "../api/status-proxy";
import type { CanisterStatus } from "../api/status-proxy/status_proxy.did";
import { getManagementActor } from "../api/management";
import { isAssetCanister } from "../constants/knownHashes.ts";
import { arrayBufferToHex } from "../utils/bufffer-utils.ts";
import { canistersApi } from "../services/api";
import type { CanisterNetwork } from "../types";

export type CanisterStatusResult = {
  timestampSec: bigint;
  status: CanisterStatus;
};

export async function fetchCanisterStatus(
  targetCanisterIdText: string
): Promise<CanisterStatusResult> {
  const actor = await getStatusProxyActor();
  const target = Principal.fromText(targetCanisterIdText);
  const maybe = await actor.queryState(target);
  if (Array.isArray(maybe) && maybe.length === 1) {
    const [tuple] = maybe;
    if (Array.isArray(tuple) && tuple.length === 2) {
      const [ts, stat] = tuple as [bigint, CanisterStatus];
      const nowSec = BigInt(Math.floor(Date.now() / 1000));
      const age = nowSec - ts;
      const CACHE_TTL_SEC = 60n; // 6n * 60n * 60n
      if (age >= 0n && age <= CACHE_TTL_SEC) {
        return { timestampSec: ts, status: stat };
      }
    }
  }
  const [ts, stat] = await actor.loadState(target);
  return { timestampSec: ts, status: stat };
}

function formatBytes(bytesBigint: bigint): string {
  const formatNumber = (num: number): string => {
    const intPart = num.toFixed(0);
    if (intPart.length >= 3) return intPart;
    if (intPart === '0') return num.toFixed(3);
    return num.toFixed(3 - intPart.length);
  };

  const bytes = Number(bytesBigint);
  const kb = 1024;
  const mb = kb * 1024;

  if (bytes >= mb) {
    return `${formatNumber(bytes / mb)} MB`;
  }
  return `${formatNumber(bytes / kb)} KB`;
}

/**
 * `canister_status` of a testnet canister through the hosty.live API (its key is the only
 * controller; the status proxy cannot read engine canisters), in the management canister's
 * shape so the derived values below work unchanged.
 */
async function fetchTestnetStatus(canisterId: string): Promise<CanisterStatus> {
  const s = await canistersApi.status(canisterId);
  const moduleHash = s.moduleHash
    ? new Uint8Array((s.moduleHash.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16)))
    : undefined;
  return {
    status: { [s.status]: null } as CanisterStatus["status"],
    cycles: BigInt(s.cycles),
    idle_cycles_burned_per_day: BigInt(s.idleCyclesBurnedPerDay),
    memory_size: BigInt(s.memorySize),
    module_hash: moduleHash ? [moduleHash] : [],
    reserved_cycles: 0n,
    memory_metrics: {
      wasm_binary_size: BigInt(s.wasmBinarySize ?? "0"),
      wasm_memory_size: BigInt(s.wasmMemorySize ?? "0"),
      wasm_chunk_store_size: 0n,
      stable_memory_size: 0n,
      global_memory_size: 0n,
      custom_sections_size: 0n,
      canister_history_size: 0n,
      snapshots_size: 0n,
    } as CanisterStatus["memory_metrics"],
    query_stats: {
      num_calls_total: 0n,
      num_instructions_total: 0n,
      request_payload_bytes_total: 0n,
      response_payload_bytes_total: 0n,
    },
    settings: {
      controllers: s.controllers.map((c) => Principal.fromText(c)),
      freezing_threshold: BigInt(s.freezingThresholdSeconds),
      wasm_memory_limit: BigInt(s.wasmMemoryLimit),
      reserved_cycles_limit: 0n,
      memory_allocation: 0n,
      compute_allocation: 0n,
      log_visibility: { controllers: null },
    } as CanisterStatus["settings"],
  } as CanisterStatus;
}

export function useCanisterStatus(
  canisterId?: string,
  options: { network?: CanisterNetwork; enabled?: boolean } = {},
) {
  const network = options.network ?? "mainnet";
  const query = useQuery<CanisterStatus, Error>({
    queryKey: ["canister", "status", canisterId ?? "unknown", network],
    queryFn: async () => {
      if (network === "testnet") return fetchTestnetStatus(canisterId!);
      try {
        const managementCanister = await getManagementActor();
        const status = await managementCanister.canister_status.withOptions({
          effectiveCanisterId: Principal.fromText(canisterId!),
        })({
          canister_id: Principal.fromText(canisterId!),
        });
        return status;
      } catch (error) {
        const notControllerError = String(error).includes(
          "Reject text: Only controllers of canister"
        );

        if (!notControllerError) throw error;

        try {
          const res = await fetchCanisterStatus(canisterId!);
          return res.status;
        } catch (e) {
          console.error("fetchCanisterStatus error", e);
          throw e;
        }
      }
    },
    enabled: !!canisterId && (options.enabled ?? true),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const status = query.data;

  const cycles = (() => {
    if (!status) return undefined;
    try {
      return (status.cycles as unknown as bigint).toString();
    } catch {
      try {
        return String(status.cycles);
      } catch {
        return undefined;
      }
    }
  })();

  const freezingThreshold = (() => {
    if (!status) return undefined;
    try {
      return (status.settings.freezing_threshold as unknown as bigint).toString();
    } catch {
      try {
        return String(status.settings.freezing_threshold);
      } catch {
        return undefined;
      }
    }
  })();

  const idleBurnPerDayRaw = (() => {
    try {
      return String(status?.idle_cycles_burned_per_day) || undefined;
    } catch {
      return undefined;
    }
  })();

  const burnTcPerYear = (() => {
    if (!idleBurnPerDayRaw) return undefined;
    try {
      const perDay = Number(BigInt(idleBurnPerDayRaw));
      const perYearCycles = perDay * 365;
      const tc = perYearCycles / 1_000_000_000_000;
      return tc;
    } catch {
      return undefined;
    }
  })();

  const deletionYearsLeft = (() => {
    try {
      return Number(cycles) / (1_000_000_000_000 * burnTcPerYear!);
    } catch {
      return undefined;
    }
  })();

  const uploadBytesLeft = (() => {
    if (!status) return undefined;
    return formatBytes(status.cycles / 2400n);
  })();

  const uptimeYearsLeft = (() => {
    try {
      return Number(deletionYearsLeft) - Number(freezingThreshold) / (365 * 24 * 60 * 60);
    } catch {
      return undefined;
    }
  })();

  const wasmBinarySize = (() => {
    try {
      const size = status?.memory_metrics.wasm_binary_size;
      if (!size) return undefined;
      return formatBytes(size);
    } catch {
      return undefined;
    }
  })();

  const wasmMemorySize = (() => {
    try {
      const size = status?.memory_metrics.wasm_memory_size;
      if (!size) return undefined;
      return formatBytes(size);
    } catch {
      return undefined;
    }
  })();

  const moduleHash = (() => {
    try {
      if ((status?.module_hash?.length || 0) === 0) return undefined;
      const [module_hash] = status?.module_hash as [
          Uint8Array<ArrayBufferLike> | number[]
      ];
      return arrayBufferToHex(module_hash);
    } catch {
      return undefined;
    }
  })();

  const controllers = (() => {
    try {
      return status?.settings.controllers.map((p: Principal) => p.toText());
    } catch {
      return undefined;
    }
  })();

  const isSystemController = (controllers ?? []).includes(
    import.meta.env.VITE_BACKEND_PRINCIPAL
  );

  return {
    isCanisterStatusLoading: query.isLoading,
    canisterStatusError: query.error,
    cyclesRaw: cycles,
    idleBurnPerDayRaw,
    burnTcPerYear,
    uptimeYearsLeft,
    deletionYearsLeft,
    uploadBytesLeft,
    wasmBinarySize,
    wasmMemorySize,
    controllers,
    isSystemController,
    moduleHash,
    pageViews: moduleHash && isAssetCanister(moduleHash) ? status?.query_stats.num_calls_total.toString() : undefined,
  };
}
