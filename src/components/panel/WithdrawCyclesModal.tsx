import { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useCanisterStatus } from "../../hooks/useCanisterStatus";
import { supportsTcyclesWithdrawal } from "../../constants/knownHashes.ts";

interface WithdrawCyclesModalProps {
  isOpen: boolean;
  onClose: () => void;
  canisterId: string;
  onWithdraw: (destination: string, amountTC: string) => Promise<void>;
}

export function WithdrawCyclesModal({
                                      isOpen,
                                      onClose,
                                      canisterId,
                                      onWithdraw,
                                    }: WithdrawCyclesModalProps) {
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [destType, setDestType] = useState<"own" | "canister">("canister");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string>("");

  const { cyclesRaw, isCanisterStatusLoading, moduleHash } = useCanisterStatus(canisterId);

  const tcyclesSupported = useMemo(() => {
    try {
      return moduleHash ? supportsTcyclesWithdrawal(moduleHash) : false;
    } catch {
      return false;
    }
  }, [moduleHash]);

  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setDestination("");
      setDestType("canister");
      setError("");
      setSuccess("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (destType === "own" && !tcyclesSupported) {
      setDestType("canister");
    }
  }, [destType, tcyclesSupported]);

  const cyclesTC = useMemo(() => {
    try {
      return cyclesRaw ? Number(BigInt(cyclesRaw)) / 1_000_000_000_000 : undefined;
    } catch {
      return undefined;
    }
  }, [cyclesRaw]);

  const safetyBufferTC = 0.31; // leave some cycles to avoid deletion freeze
  const maxWithdrawTC = useMemo(() => {
    if (typeof cyclesTC !== "number") return undefined;
    const m = Math.max(0, cyclesTC - safetyBufferTC);
    return Number.isFinite(m) ? m : undefined;
  }, [cyclesTC]);

  const validate = (): string | null => {
    if (!amount.trim()) return "Please enter an amount.";
    if (isNaN(Number(amount))) return "Amount must be a number.";
    if (Number(amount) <= 0) return "Amount must be greater than zero.";
    if (typeof maxWithdrawTC === "number" && Number(amount) > maxWithdrawTC) return "Amount exceeds available withdrawable balance.";

    if (destType === "canister") {
      const dest = destination.trim();
      if (!dest) return "Please enter a destination canister ID.";
      if (!/^[a-z0-9-]{3,}$/i.test(dest)) return "Invalid canister ID format.";
      // Prevent withdrawing to the same canister
      if (dest === canisterId.trim()) return "Destination cannot be the same as the source canister.";
    }
    return null;
  };

  const handleSubmit = async () => {
    // Disallow tcycles withdrawal if module doesn't support it
    if (destType === "own" && !tcyclesSupported) {
      setError("current module does not support tcycles withdrawal. You can reset the canister to install the latest module that supports it");
      return;
    }

    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError("");
    setIsSubmitting(true);
    setSuccess("");
    try {
      const dest = destType === "own" ? "__OWN_ACCOUNT__" : destination.trim();
      await onWithdraw(dest, amount.trim());
      setSuccess("Withdrawal submitted.");
      setTimeout(() => onClose(), 1200);
    } catch (e: any) {
      setError(e?.message || "Failed to withdraw cycles");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Withdraw cycles" className="max-w-md">
      <div className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">From canister</div>
            <div className="font-mono text-xs break-all">{canisterId}</div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Withdraw to</label>
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              className={`px-2 py-1 rounded border ${destType === "own" ? "bg-primary/10 border-primary" : "bg-background"} ${!tcyclesSupported ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={() => tcyclesSupported && setDestType("own")}
              disabled={!tcyclesSupported}
              title={!tcyclesSupported ? "current module does not support tcycles withdrawal. You can reset the canister to install the latest module that supports it" : undefined}
            >
              Own account (tcycles)
            </button>
            <button
              type="button"
              className={`px-2 py-1 rounded border ${destType === "canister" ? "bg-primary/10 border-primary" : "bg-background"}`}
              onClick={() => setDestType("canister")}
            >
              Another canister
            </button>
          </div>
          {!tcyclesSupported && (
            <p className="text-xs text-destructive mt-1">
              current module does not support tcycles withdrawal. You can reset the canister to install the latest module that supports it
            </p>
          )}
        </div>

        {destType === "canister" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Destination canister ID</label>
            <input
              type="text"
              placeholder="e.g. ryjl3-tyaaa-aaaaa-aaaba-cai"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">Enter the canister to receive cycles</p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Amount (TC)</label>
            {typeof maxWithdrawTC === "number" && (
              <button
                type="button"
                className="text-xs underline"
                onClick={() => setAmount((Math.floor(maxWithdrawTC * 10000) / 10000).toFixed(4))}
                disabled={isCanisterStatusLoading}
              >
                Max
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              placeholder={isCanisterStatusLoading ? "Loading balance…" : "Amount in TC (e.g. 1.25)"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              disabled={isCanisterStatusLoading}
            />
            <Button onClick={handleSubmit} disabled={isSubmitting || isCanisterStatusLoading}>
              {isSubmitting ? "Processing…" : "Withdraw"}
            </Button>
          </div>
          {typeof cyclesTC === "number" && (
            <p className="text-xs text-muted-foreground">Available to withdraw
              (approx.): {maxWithdrawTC?.toFixed(2)} TC</p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs text-green-600">{success}</p>}
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Note: We leave a small safety buffer (~{safetyBufferTC} TC) to avoid freezing threshold issues.
        </div>
        {/* If you need to fully drain cycles, consider the advanced deletion flow */}
      </div>
    </Modal>
  );
}
