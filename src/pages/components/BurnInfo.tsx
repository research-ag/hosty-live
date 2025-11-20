import { useCanisterStatus } from "../../hooks/useCanisterStatus";

export function BurnInfo({ canisterId }: { canisterId: string }) {
  const { isCanisterStatusLoading, burnTcPerYear, uptimeYearsLeft, deletionYearsLeft, uploadBytesLeft } =
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
        Uptime years left:{" "}
        {uptimeYearsLeft !== undefined ? formatNum(uptimeYearsLeft, 2) : "unknown"}
      </div>
      <div>
        Years left until deletion:{" "}
        {deletionYearsLeft !== undefined ? formatNum(deletionYearsLeft, 2) : "unknown"}
      </div>
      <div>
        Upload bytes left:{" "}
        {uploadBytesLeft ?? "unknown"}
      </div>
    </div>
  );
}