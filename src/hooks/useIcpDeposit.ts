import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Principal } from "@icp-sdk/core/principal";
import { getAgent } from "./useInternetIdentity.ts";
import {
  getIcpBalance,
  getTCPerIcp,
  ICP_FEE_E8S,
  notifyMintCycles,
  sendIcpToCmc,
  type MintResult,
} from "../api/icp";

/**
 * A transfer to the CMC that was not notified yet (tab closed, network error) is kept here and
 * notified again on the next visit: `notify_mint_cycles` is idempotent, so retrying never mints
 * twice, and only the user can notify their own CMC subaccount.
 */
const pendingKey = (principal: string) => `hosty_icp_mint_pending:${principal}`;

const NOTIFY_ATTEMPTS = 5;
const NOTIFY_RETRY_MS = 2000;

async function notifyWithRetry(blockIndex: bigint): Promise<MintResult> {
  let result: MintResult = { status: "pending", reason: "" };
  for (let attempt = 0; attempt < NOTIFY_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, NOTIFY_RETRY_MS));
    result = await notifyMintCycles(getAgent(), blockIndex);
    if (result.status !== "pending") break;
  }
  return result;
}

export function useIcpDeposit(principal: string | null, { watch }: { watch: boolean }) {
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<MintResult | null>(null);

  const balance = useQuery({
    queryKey: ["icp", "balance", principal ?? "anonymous"],
    queryFn: () => getIcpBalance(getAgent(), Principal.fromText(principal!)),
    enabled: !!principal && watch,
    // the user pays from another device or wallet while the dialog is open
    refetchInterval: 5000,
  });

  const refetchBalance = balance.refetch;

  const rate = useQuery({
    queryKey: ["icp", "tc-per-icp"],
    queryFn: () => getTCPerIcp(getAgent()),
    enabled: watch,
    staleTime: 5 * 60 * 1000,
  });

  const finish = useCallback(
    (blockIndex: bigint, res: MintResult) => {
      if (res.status === "pending") {
        localStorage.setItem(pendingKey(principal!), blockIndex.toString());
      } else {
        localStorage.removeItem(pendingKey(principal!));
      }
      setResult(res);
      return res;
    },
    [principal]
  );

  /** Converts the whole ICP balance (less the transfer fee) into cycles. */
  const convert = useCallback(async (): Promise<MintResult> => {
    if (!principal) throw new Error("Not signed in.");
    setIsConverting(true);
    setResult(null);
    try {
      let earlier: MintResult | null = null;
      const pending = localStorage.getItem(pendingKey(principal));
      if (pending) {
        earlier = finish(BigInt(pending), await notifyWithRetry(BigInt(pending)));
        if (earlier.status === "pending") return earlier;
      }
      const available = (await getIcpBalance(getAgent(), Principal.fromText(principal))) - ICP_FEE_E8S;
      if (available <= 0n) {
        if (earlier) return earlier;
        throw new Error("No ICP to convert yet.");
      }
      const blockIndex = await sendIcpToCmc(getAgent(), available);
      localStorage.setItem(pendingKey(principal), blockIndex.toString());
      return finish(blockIndex, await notifyWithRetry(blockIndex));
    } finally {
      setIsConverting(false);
      void refetchBalance();
    }
  }, [principal, finish, refetchBalance]);

  // finish a conversion an earlier visit left unnotified
  useEffect(() => {
    if (!principal) return;
    const pending = localStorage.getItem(pendingKey(principal));
    if (!pending) return;
    let cancelled = false;
    void notifyWithRetry(BigInt(pending)).then((res) => {
      if (!cancelled) finish(BigInt(pending), res);
    });
    return () => {
      cancelled = true;
    };
  }, [principal, finish]);

  return {
    balanceE8s: balance.data,
    isBalanceLoading: balance.isLoading,
    balanceError: balance.error instanceof Error ? balance.error.message : undefined,
    tcPerIcp: rate.data,
    convert,
    isConverting,
    result,
  };
}
