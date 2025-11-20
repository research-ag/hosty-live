import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useCanisterStatus } from "../../hooks/useCanisterStatus";

interface TopUpCanisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  canisterId: string;
  userBalanceRaw?: string;
  formatTC: (raw: string | number | bigint) => string;
  onWithdraw: (canisterId: string, amountTC: string) => Promise<bigint>;
  onRefreshBalance?: () => Promise<unknown>;
}

export function TopUpCanisterModal({
  isOpen,
  onClose,
  canisterId,
  userBalanceRaw,
  formatTC,
  onWithdraw,
  onRefreshBalance,
}: TopUpCanisterModalProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string>("");

  const { uptimeYearsLeft } = useCanisterStatus(canisterId);
  const showLongUptimeWarning = typeof uptimeYearsLeft === "number" && uptimeYearsLeft > 10;

  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setError("");
      setSuccess("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !userBalanceRaw) {
      try {
        onRefreshBalance?.();
      } catch {
        // pass
      }
    }
  }, [isOpen, userBalanceRaw, onRefreshBalance]);

  const userBalanceTC = useMemo(() => {
    if (!userBalanceRaw) return undefined;
    try {
      return formatTC(userBalanceRaw);
    } catch {
      return undefined;
    }
  }, [userBalanceRaw, formatTC]);

  const parseTCToRaw = (tc: string | number): bigint => {
    const DECIMALS = 12n;
    const parts = tc.toString().trim();
    if (!/^(?:\d+)(?:\.\d{0,12})?$/.test(parts)) {
      throw new Error("Invalid amount format. Use up to 12 decimal places.");
    }
    const [wholeStr, fracStr = ""] = parts.split(".");
    const whole = BigInt(wholeStr || "0");
    const fracPadded = (fracStr + "0".repeat(12)).slice(0, 12);
    const frac = BigInt(fracPadded);
    return whole * 10n ** DECIMALS + frac;
  };

  const validate = (): string | null => {
    if (!amount.trim()) return "Please enter an amount.";
    if (isNaN(Number(amount))) return "Amount must be a number.";
    if (Number(amount) <= 0) return "Amount must be greater than zero.";
    try {
      const raw = parseTCToRaw(amount);
      if (userBalanceRaw) {
        const bal = BigInt(userBalanceRaw);
        if (raw > bal) return "Insufficient balance.";
      }
    } catch (e: any) {
      return e?.message || "Invalid amount.";
    }
    return null;
  };

  const handleSubmit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError("");
    setIsSubmitting(true);
    setSuccess("");
    try {
      const block = await onWithdraw(canisterId, amount);
      setSuccess(`Top up submitted. Block index: ${block.toString()}`);
      setTimeout(() => onClose(), 1200);
    } catch (e: any) {
      setError(e?.message || "Failed to top up canister");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Top up cycles"
      className="max-w-md"
    >
      <div className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Canister</div>
              <div className="font-mono text-xs break-all">{canisterId}</div>
            </div>
            {userBalanceTC !== undefined && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">
                  Your TC balance
                </div>
                <div className="font-semibold">{userBalanceTC} TC</div>
              </div>
            )}
          </div>
        </div>

        {showLongUptimeWarning && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            The canister has more than 10 years of uptime left. Are you sure you want to top up?
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium">Deposit from cycle balance</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Amount in TC (e.g. 1.25)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Processing…" : "Top up"}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs text-green-600">{success}</p>}
        </div>

        <div className="relative flex items-center">
          <div className="flex-1 h-px bg-border/50" />
          <span className="px-3 text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border/50" />
        </div>

        <div>
          <Button
            variant="outline"
            className="w-full justify-center"
            onClick={() =>
              window.open(
                `https://cycle.express/?to=${canisterId}`,
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Top up directly through Cycle Express
          </Button>
        </div>
      </div>
    </Modal>
  );
}
