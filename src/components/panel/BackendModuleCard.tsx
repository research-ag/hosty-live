import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Copy, Cpu, ExternalLink, Play, RefreshCw, RotateCcw, ScrollText, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Principal } from "@icp-sdk/core/principal";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { TooltipWrapper } from "../ui/TooltipWrapper";
import { wasmDeploymentsApi } from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { isAssetCanister } from "../../constants/knownHashes";
import { getManagementActor } from "../../api/management";
import { parseCandidMethods } from "../../lib/candidMethods";
export { parseCandidMethods } from "../../lib/candidMethods";

export function candidUiUrl(canisterId: string): string {
  return `https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=${canisterId}`;
}

interface UnattendedGrant {
  enabled: boolean;
  locked: boolean;
  busy: boolean;
  onToggle: () => void;
}

interface BackendModuleCardProps {
  canisterId: string;
  moduleHash?: string;
  canInstall: boolean;
  onInstall: () => void;
  unattended?: UnattendedGrant;
}

export function BackendModuleCard({ canisterId, moduleHash, canInstall, onInstall, unattended }: BackendModuleCardProps) {
  const { toast } = useToast();
  const runsAssets = !!moduleHash && isAssetCanister(moduleHash);
  const hasModule = !!moduleHash && !runsAssets;

  const candidQuery = useQuery({
    queryKey: ["canister", "candid", canisterId, moduleHash ?? ""],
    queryFn: () => wasmDeploymentsApi.candid(canisterId),
    enabled: hasModule,
    staleTime: 60_000,
  });
  const moduleQuery = useQuery({
    queryKey: ["module", moduleHash ?? ""],
    queryFn: () => wasmDeploymentsApi.moduleMeta(moduleHash!),
    enabled: hasModule,
    staleTime: 60_000,
  });

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          Backend module
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!hasModule ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Cpu className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {runsAssets ? "Still running the frontend module" : "No module installed"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Upload a compiled Wasm module here, or let an agent do it through the hosty.live MCP server
              after you approve its deploy session.
            </p>
            <Button onClick={onInstall} disabled={!canInstall}>
              <Upload className="mr-2 h-4 w-4" />
              Install module
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Module hash</label>
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <div className="font-mono text-xs break-all mb-2">{moduleHash}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => copy(moduleHash!, "Module hash")}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  {moduleQuery.data ? (
                    <>
                      <Badge variant={moduleQuery.data.verified ? "success" : "secondary"}>
                        {moduleQuery.data.verified ? "in module store, verified" : "in module store"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {(moduleQuery.data.size / 1024).toFixed(0)} KB{moduleQuery.data.gzipped ? " gzipped" : ""}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => window.open(moduleQuery.data!.downloadUrl, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </>
                  ) : moduleQuery.isFetched ? (
                    <span className="text-xs text-muted-foreground">not in the hosty.live module store</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Candid UI</label>
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <div className="font-mono text-xs break-all mb-2">{candidUiUrl(canisterId)}</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => window.open(candidUiUrl(canisterId), "_blank")}>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => copy(candidUiUrl(canisterId), "URL")}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <InterfaceSection canisterId={canisterId} candid={candidQuery.data} loading={candidQuery.isLoading} onCopy={copy} />

            <div className="pt-1">
              <Button onClick={onInstall} disabled={!canInstall}>
                <Upload className="mr-2 h-4 w-4" />
                Upgrade or reinstall
              </Button>
            </div>
          </>
        )}

        {unattended && <UnattendedSection grant={unattended} />}

        {hasModule && canInstall && <SnapshotsSection canisterId={canisterId} />}

        {hasModule && <LogsSection canisterId={canisterId} />}
      </CardContent>
    </Card>
  );
}

function UnattendedSection({ grant }: { grant: UnattendedGrant }) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="h-4 w-4" />
          Allow unattended deploys
        </div>
        <TooltipWrapper
          content={grant.locked ? "Rented canisters always have this grant; it ends with the rental." : undefined}
          disabled={!grant.locked}
        >
          <button
            type="button"
            role="switch"
            aria-checked={grant.enabled}
            disabled={grant.busy || grant.locked}
            onClick={grant.onToggle}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 ${
              grant.enabled ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                grant.enabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </TooltipWrapper>
      </div>
      <p className="text-xs text-muted-foreground">
        {grant.enabled
          ? "The hosty.live backend canister is a controller of this canister. Agents can install modules here without a deploy session; hosty.live checks on-chain that the request comes from you. Turn it off to remove that controller."
          : "Adds the hosty.live backend canister as a controller of this one canister, so agents can redeploy it without you approving a deploy session each time. It only ever installs code you asked for; it cannot touch other canisters, and you can remove it at any time."}
      </p>
    </div>
  );
}

function InterfaceSection({
  canisterId,
  candid,
  loading,
  onCopy,
}: {
  canisterId: string;
  candid?: string;
  loading: boolean;
  onCopy: (text: string, what: string) => void;
}) {
  const methods = useMemo(() => (candid ? parseCandidMethods(candid) : []), [candid]);
  const [method, setMethod] = useState<string>("");
  const [arg, setArg] = useState("()");
  const [update, setUpdate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ reply: string; caller: string; durationMs: number } | null>(null);
  const [error, setError] = useState<string>("");
  const [showCandid, setShowCandid] = useState(false);

  const selected = methods.find((m) => m.name === method) ?? methods[0];

  const call = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await wasmDeploymentsApi.call(canisterId, {
        method: selected.name,
        arg: arg.trim() || "()",
        update: update || !selected.query,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground">Interface (Candid)</label>
        {candid && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowCandid((v) => !v)}>
              {showCandid ? "Hide .did" : "Show .did"}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onCopy(candid, "Candid")}>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          </div>
        )}
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : !candid ? (
        <p className="text-xs text-muted-foreground">
          Unknown: the module was not installed through hosty.live and does not embed its Candid.
        </p>
      ) : (
        <div className="space-y-3">
          {showCandid && (
            <pre className="text-xs bg-muted/50 border border-border rounded-lg p-3 overflow-auto max-h-80 whitespace-pre">
              {candid}
            </pre>
          )}
          {methods.length > 0 && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] items-end">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Method</label>
                  <select
                    value={selected?.name ?? ""}
                    onChange={(e) => {
                      setMethod(e.target.value);
                      setResult(null);
                      setError("");
                    }}
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-sm font-mono"
                  >
                    {methods.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                        {m.query ? " (query)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">
                    Arguments <span className="font-mono text-muted-foreground">({selected?.args || ""})</span>
                  </label>
                  <Input value={arg} onChange={(e) => setArg(e.target.value)} className="font-mono" placeholder="()" />
                </div>
                <Button size="sm" onClick={call} disabled={busy || !selected}>
                  <Play className="h-3.5 w-3.5 mr-1" />
                  {busy ? "Calling…" : "Call"}
                </Button>
              </div>
              {selected?.query && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={update} onChange={(e) => setUpdate(e.target.checked)} />
                  Send as update call (certified, slower)
                </label>
              )}
              {!selected?.query && (
                <p className="text-xs text-muted-foreground">
                  Update call: signed as you while a deploy session is active, otherwise with the hosty.live builder principal.
                </p>
              )}
              {error && <p className="text-xs text-destructive break-all">{error}</p>}
              {result && (
                <div className="space-y-1">
                  <pre className="text-xs bg-muted/50 border border-border rounded-lg p-3 overflow-auto max-h-60 whitespace-pre-wrap break-all">
                    {result.reply}
                  </pre>
                  <p className="text-[11px] text-muted-foreground">
                    {result.durationMs} ms · caller {result.caller}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LogsSection({ canisterId }: { canisterId: string }) {
  const [open, setOpen] = useState(false);
  const logs = useQuery({
    queryKey: ["canister", "logs", canisterId],
    queryFn: async () => {
      const management = await getManagementActor();
      const target = Principal.fromText(canisterId);
      const result = await management.fetch_canister_logs.withOptions({ effectiveCanisterId: target })({
        canister_id: target,
      });
      return result.canister_log_records.map((r) => ({
        idx: Number(r.idx),
        time: new Date(Number(r.timestamp_nanos / 1_000_000n)),
        message: new TextDecoder().decode(new Uint8Array(r.content as ArrayLike<number>)),
      }));
    },
    enabled: open,
    staleTime: 10_000,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
          <ScrollText className="h-4 w-4" />
          Logs
        </label>
        <div className="flex items-center gap-1">
          {open && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => logs.refetch()} disabled={logs.isFetching}>
              <RefreshCw className={`h-3 w-3 mr-1 ${logs.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "Show"}
          </Button>
        </div>
      </div>
      {open &&
        (logs.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : logs.error ? (
          <p className="text-xs text-destructive break-all">
            {logs.error instanceof Error ? logs.error.message : String(logs.error)}
          </p>
        ) : logs.data && logs.data.length > 0 ? (
          <pre className="text-xs bg-muted/50 border border-border rounded-lg p-3 overflow-auto max-h-80 whitespace-pre-wrap break-all">
            {logs.data.map((r) => `${r.time.toISOString()}  ${r.message}`).join("\n")}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground">No log records yet.</p>
        ))}
    </div>
  );
}

/**
 * Canister snapshots, driven directly as a controller from the browser (no deploy session
 * needed): list, take now, roll back, delete.
 */
function SnapshotsSection({ canisterId }: { canisterId: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const target = useMemo(() => Principal.fromText(canisterId), [canisterId]);

  const snapshots = useQuery({
    queryKey: ["canister", "snapshots", canisterId],
    queryFn: async () => {
      const management = await getManagementActor();
      const list = await management.list_canister_snapshots.withOptions({ effectiveCanisterId: target })({
        canister_id: target,
      });
      return list
        .map((s) => ({
          id: Array.from(s.id as ArrayLike<number>)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(""),
          raw: new Uint8Array(s.id as ArrayLike<number>),
          takenAt: new Date(Number(s.taken_at_timestamp / 1_000_000n)),
          size: Number(s.total_size),
        }))
        .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
    },
    staleTime: 30_000,
  });

  const run = async (key: string, action: () => Promise<void>, done: string) => {
    setBusy(key);
    try {
      await action();
      toast.success(done);
      await snapshots.refetch();
    } catch (e) {
      toast.error("Snapshot action failed", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      setConfirmRestore(null);
    }
  };

  const take = () =>
    run(
      "take",
      async () => {
        const management = await getManagementActor();
        const newest = snapshots.data?.[0];
        await management.take_canister_snapshot.withOptions({ effectiveCanisterId: target })({
          canister_id: target,
          replace_snapshot: newest ? [newest.raw] : [],
        });
      },
      "Snapshot taken",
    );

  const restore = (raw: Uint8Array, id: string) =>
    run(
      `restore-${id}`,
      async () => {
        const management = await getManagementActor();
        await management.load_canister_snapshot.withOptions({ effectiveCanisterId: target })({
          canister_id: target,
          snapshot_id: raw,
          sender_canister_version: [],
        });
      },
      "Snapshot restored",
    );

  const remove = (raw: Uint8Array, id: string) =>
    run(
      `delete-${id}`,
      async () => {
        const management = await getManagementActor();
        await management.delete_canister_snapshot.withOptions({ effectiveCanisterId: target })({
          canister_id: target,
          snapshot_id: raw,
        });
      },
      "Snapshot deleted",
    );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
          <Camera className="h-4 w-4" />
          Snapshots
        </label>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={take} disabled={busy !== null}>
          <Camera className="h-3 w-3 mr-1" />
          {busy === "take" ? "Taking…" : "Take snapshot"}
        </Button>
      </div>
      {snapshots.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : snapshots.error ? (
        <p className="text-xs text-destructive break-all">
          {snapshots.error instanceof Error ? snapshots.error.message : String(snapshots.error)}
        </p>
      ) : snapshots.data && snapshots.data.length > 0 ? (
        <div className="space-y-1">
          {snapshots.data.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs">
              <span className="font-mono truncate max-w-[12rem]" title={s.id}>
                {s.id.slice(0, 16)}…
              </span>
              <span className="text-muted-foreground">{s.takenAt.toLocaleString()}</span>
              <span className="text-muted-foreground">{(s.size / 1024).toFixed(0)} KB</span>
              <span className="ml-auto flex items-center gap-1">
                {confirmRestore === s.id ? (
                  <>
                    <span className="text-destructive">Replace the current state?</span>
                    <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={() => restore(s.raw, s.id)} disabled={busy !== null}>
                      {busy === `restore-${s.id}` ? "Restoring…" : "Yes, restore"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setConfirmRestore(null)} disabled={busy !== null}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setConfirmRestore(s.id)} disabled={busy !== null}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restore
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => remove(s.raw, s.id)} disabled={busy !== null}>
                      <Trash2 className="h-3 w-3 mr-1" />
                      {busy === `delete-${s.id}` ? "Deleting…" : "Delete"}
                    </Button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No snapshots. The install dialog takes one before each upgrade by default; restoring rolls module,
          heap and stable memory back to that point.
        </p>
      )}
    </div>
  );
}
