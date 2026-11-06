import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Principal } from "@icp-sdk/core/principal";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CopyButton } from "../ui/CopyButton";
import { useIcpDeposit } from "../../hooks/useIcpDeposit";
import {
  accountIdentifierHex,
  E8S_PER_ICP,
  formatIcp,
  ICP_FEE_E8S,
  icpPaymentUri,
} from "../../api/icp";

interface DepositIcpModalProps {
  isOpen: boolean;
  onClose: () => void;
  principal: string;
  formatTC: (raw: string | number | bigint) => string;
  /** Called after cycles were minted into the balance. */
  onConverted?: () => Promise<unknown>;
}

/** Prefilled TC for the payment request (a backend create with some margin); changeable. */
const DEFAULT_TC = "3";

/** ICP to request for `tc` teracycles: the conversion's transfer fee on top, rounded up to 0.0001 ICP. */
function icpForTC(tc: number, tcPerIcp: number): bigint | undefined {
  if (!Number.isFinite(tc) || tc <= 0 || !tcPerIcp) return undefined;
  const exact = Math.ceil((tc / tcPerIcp) * Number(E8S_PER_ICP));
  // a huge entry overflows to Infinity, which BigInt() would throw on
  if (!Number.isFinite(exact)) return undefined;
  const e8s = BigInt(exact) + ICP_FEE_E8S;
  const step = 10_000n;
  return ((e8s + step - 1n) / step) * step;
}

export function DepositIcpModal({ isOpen, onClose, principal, formatTC, onConverted }: DepositIcpModalProps) {
  const [amountTC, setAmountTC] = useState(DEFAULT_TC);
  const [error, setError] = useState("");
  const { balanceE8s, isBalanceLoading, balanceError, tcPerIcp, convert, isConverting, result } =
    useIcpDeposit(principal, { watch: isOpen });

  useEffect(() => {
    if (!isOpen) {
      setAmountTC(DEFAULT_TC);
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (result?.status === "minted") void onConverted?.();
  }, [result, onConverted]);

  const owner = useMemo(() => Principal.fromText(principal), [principal]);
  const accountId = useMemo(() => accountIdentifierHex(owner), [owner]);
  const requestE8s = tcPerIcp ? icpForTC(Number(amountTC), tcPerIcp) : undefined;
  const paymentUri = icpPaymentUri(owner, requestE8s);

  const convertibleE8s = balanceE8s !== undefined && balanceE8s > ICP_FEE_E8S ? balanceE8s - ICP_FEE_E8S : 0n;
  const retryPending = result?.status === "pending";
  const convertibleTC = tcPerIcp ? (Number(convertibleE8s) / Number(E8S_PER_ICP)) * tcPerIcp : undefined;

  const handleConvert = async () => {
    setError("");
    try {
      await convert();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Deposit ICP" className="max-w-md">
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Send ICP from any wallet (NNS dapp, Oisy, Plug or an exchange) to your own ICP account
          below, then convert it into cycles here. Only your Internet Identity controls this
          account, no memo is needed.
        </p>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="icp-deposit-tc">
            Cycles you want (TC)
          </label>
          <input
            id="icp-deposit-tc"
            type="text"
            inputMode="decimal"
            value={amountTC}
            onChange={(e) => setAmountTC(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="text-xs text-muted-foreground">
            {tcPerIcp
              ? requestE8s
                ? `Send ${formatIcp(requestE8s)} ICP (1 ICP ≈ ${tcPerIcp.toFixed(2)} TC at the current rate, conversion fee included).`
                : `1 ICP ≈ ${tcPerIcp.toFixed(2)} TC at the current rate. Any amount works.`
              : "Loading the ICP rate…"}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="rounded-md bg-white p-3">
            <QRCodeSVG value={paymentUri} size={192} marginSize={0} />
          </div>
          <a
            href={paymentUri}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            Open in a wallet app
          </a>
          <p className="text-xs text-muted-foreground text-center">
            Scan with the NNS dapp or Oisy, or open the link in a wallet app that handles{" "}
            <code>icp:</code> payment links. Otherwise copy the address into your wallet.
          </p>
        </div>

        <div className="rounded-md border p-3 space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">ICP address (principal)</div>
            <div className="flex items-center gap-2">
              <div className="font-mono text-xs break-all flex-1">{principal}</div>
              <CopyButton text={principal} size="icon" variant="ghost" />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Account ID (for exchanges)</div>
            <div className="flex items-center gap-2">
              <div className="font-mono text-xs break-all flex-1">{accountId}</div>
              <CopyButton text={accountId} size="icon" variant="ghost" />
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">ICP received</span>
            <span className="font-semibold flex items-center gap-2">
              {isBalanceLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : balanceError ? (
                <span className="text-destructive text-xs">{balanceError}</span>
              ) : (
                `${formatIcp(balanceE8s ?? 0n)} ICP`
              )}
            </span>
          </div>
          <Button className="w-full" onClick={handleConvert} disabled={isConverting || (convertibleE8s === 0n && !retryPending)}>
            {isConverting
              ? "Converting…"
              : retryPending
                ? "Finish the conversion"
                : convertibleE8s > 0n
                ? `Convert ${formatIcp(convertibleE8s)} ICP to ≈ ${convertibleTC?.toFixed(4) ?? "?"} TC`
                : "Waiting for ICP…"}
          </Button>
          <p className="text-xs text-muted-foreground">
            The balance refreshes every few seconds. Converting sends the whole balance, less the
            0.0001 ICP transfer fee, to the cycles minting canister, which adds the cycles to your
            balance at its current rate.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {result?.status === "minted" && (
            <p className="text-xs text-green-600">
              Added {formatTC(result.minted)} TC. Your balance is now {formatTC(result.balance)} TC.
            </p>
          )}
          {result?.status === "pending" && (
            <p className="text-xs text-muted-foreground">
              The ICP was sent; the cycles minting canister has not confirmed it yet ({result.reason}).
              Finish it now or when you reopen this dialog.
            </p>
          )}
          {result?.status === "refunded" && (
            <p className="text-xs text-destructive">
              The cycles minting canister refunded the ICP: {result.reason}
            </p>
          )}
          {result?.status === "failed" && (
            <p className="text-xs text-destructive">Conversion failed: {result.reason}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
