import { useQuery } from "@tanstack/react-query";
import { Principal } from "@dfinity/principal";
import { getStatusProxyActor } from "../api/status-proxy";
import type { CanisterStatus } from "../api/status-proxy/status_proxy.did";
import { getManagementActor } from "../api/management";
import { isAssetCanister } from "../constants/knownHashes";

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

function arrayBufferToHex(buffer: Uint8Array | number[]): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function formatBytes(bytes: bigint): string {
  const kb = 1024n;
  const mb = kb * 1024n;

  if (bytes >= mb) {
    return `${(bytes / mb).toString()} MB`;
  }
  if (bytes >= kb) {
    return `${(bytes / kb).toString()} KB`;
  }
  return `${bytes.toString()} bytes`;
}

export function useCanisterStatus(canisterId?: string) {
  const query = useQuery<CanisterStatus, Error>({
    queryKey: ["canister", "status", canisterId ?? "unknown"],
    queryFn: async () => {
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
    enabled: !!canisterId,
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

  const isAssetCanisterResult = isAssetCanister(moduleHash || "");

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
    wasmBinarySize,
    controllers,
    isAssetCanister: isAssetCanisterResult,
    isSystemController,
    pageViews: isAssetCanisterResult ? status?.query_stats.num_calls_total.toString() : undefined,
  };
}
