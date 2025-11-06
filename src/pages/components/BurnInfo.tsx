import { useCanisterStatus } from "../../hooks/useCanisterStatus";

export function BurnInfo({ canisterId }: { canisterId: string }) {
  const { isCanisterStatusLoading, burnTcPerYear, yearsLeft } =
    useCanisterStatus(canisterId);
  if (isCanisterStatusLoading)
    return <p className="text-xs text-muted-foreground">…</p>;
  const formatNum = (n: number | undefined, precision: number) => {
    if (n === undefined) return "unknown";
    if (!isFinite(n)) return "∞";
    return n.toFixed(precision);
  };
  return (
    <div className="text-xs text-muted-foreground">
      <div>
        Burn rate:{" "}
        {burnTcPerYear !== undefined
          ? `${formatNum(burnTcPerYear, 4)} TC/year`
          : "unknown"}
      </div>
      <div>
        Years left:{" "}
        {yearsLeft !== undefined ? formatNum(yearsLeft, 2) : "unknown"}
      </div>
    </div>
  );
}