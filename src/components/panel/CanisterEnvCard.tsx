import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, RefreshCw, Save, SlidersHorizontal, Trash2, Undo2 } from "lucide-react";
import { Principal } from "@icp-sdk/core/principal";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { useToast } from "../../hooks/useToast";
import { getManagementActor } from "../../api/management";
import { detectAssetsKind, readPublishedEnv, refreshEnv } from "../../api/certified-assets";
import { canistersApi } from "../../services/api";
import type { CanisterNetwork } from "../../types";

// IC limits on mainnet (resource limits docs); the management canister rejects more.
const MAX_VARIABLES = 20;
const MAX_NAME_BYTES = 128;
const MAX_VALUE_BYTES = 128;
const PUBLIC_PREFIX = "PUBLIC_";

interface EnvVariable {
  name: string;
  value: string;
}

interface Row {
  /** Name as loaded; undefined for a row added in this edit. */
  original?: string;
  name: string;
  value: string;
  removed: boolean;
}

type ModuleKind = "certified" | "legacy" | "other";

interface CanisterEnvCardProps {
  canisterId: string;
  /** The signed-in user is a controller (canister_status and update_settings need it). */
  canEdit: boolean;
  /** Testnet canisters are controlled by hosty.live: reads and writes go through the API. */
  network?: CanisterNetwork;
}

const byteLength = (text: string) => new TextEncoder().encode(text).length;

/**
 * Canister environment variables (`canister_settings.environment_variables`), read and
 * written with the user's Internet Identity as a controller. On certified-assets
 * canisters `PUBLIC_*` variables become the `ic_env` cookie; saving calls `refresh_env`
 * so the page publishes them without an upload.
 */
export function CanisterEnvCard({ canisterId, canEdit, network = "mainnet" }: CanisterEnvCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const viaApi = network === "testnet";

  const kindQuery = useQuery({
    queryKey: ["canister", "assets-kind", canisterId],
    queryFn: async (): Promise<ModuleKind> => {
      try {
        return await detectAssetsKind(canisterId);
      } catch {
        return "other";
      }
    },
    staleTime: 5 * 60_000,
  });
  const kind = kindQuery.data;

  const envQuery = useQuery({
    queryKey: ["canister", "env", canisterId],
    queryFn: async (): Promise<EnvVariable[]> => {
      if (viaApi) {
        return (await canistersApi.env(canisterId)).variables.map(({ name, value }) => ({ name, value }));
      }
      const management = await getManagementActor();
      const target = Principal.fromText(canisterId);
      const status = await management.canister_status.withOptions({ effectiveCanisterId: target })({
        canister_id: target,
      });
      return status.settings.environment_variables.map(({ name, value }) => ({ name, value }));
    },
    enabled: canEdit,
    staleTime: 30_000,
  });

  const publishedQuery = useQuery({
    queryKey: ["canister", "env-published", canisterId],
    queryFn: () => readPublishedEnv(canisterId),
    enabled: kind === "certified",
    staleTime: 30_000,
  });

  useEffect(() => {
    if (envQuery.data) {
      setRows(envQuery.data.map((v) => ({ original: v.name, name: v.name, value: v.value, removed: false })));
    }
  }, [envQuery.data]);

  const loaded = useMemo(() => new Map((envQuery.data ?? []).map((v) => [v.name, v.value])), [envQuery.data]);

  const change = useMemo(() => {
    const set: Record<string, string> = {};
    const unset: string[] = [];
    for (const row of rows) {
      const name = row.name.trim();
      if (row.removed) {
        if (row.original !== undefined) unset.push(row.original);
        continue;
      }
      if (row.original !== undefined && row.original !== name) unset.push(row.original);
      if (name && (row.original !== name || loaded.get(name) !== row.value)) set[name] = row.value;
    }
    return { set, unset: unset.filter((n) => !(n in set)) };
  }, [rows, loaded]);
  const dirty = Object.keys(change.set).length > 0 || change.unset.length > 0;

  const problems = useMemo(() => {
    const out: string[] = [];
    const live = rows.filter((r) => !r.removed);
    const names = live.map((r) => r.name.trim());
    if (names.some((n) => !n)) out.push("Every variable needs a name.");
    const dupes = names.filter((n, i) => n && names.indexOf(n) !== i);
    if (dupes.length) out.push(`Duplicate names: ${[...new Set(dupes)].join(", ")}`);
    if (live.length > MAX_VARIABLES) out.push(`At most ${MAX_VARIABLES} variables per canister.`);
    for (const r of live) {
      if (byteLength(r.name) > MAX_NAME_BYTES) out.push(`${r.name}: names are limited to ${MAX_NAME_BYTES} bytes.`);
      if (byteLength(r.value) > MAX_VALUE_BYTES) out.push(`${r.name}: values are limited to ${MAX_VALUE_BYTES} bytes.`);
    }
    return out;
  }, [rows]);

  const published = publishedQuery.data ?? undefined;
  const publishedInSync = useMemo(() => {
    if (!envQuery.data || !published) return undefined;
    const expected = envQuery.data.filter((v) => v.name.startsWith(PUBLIC_PREFIX));
    return expected.length === Object.keys(published).length && expected.every((v) => published[v.name] === v.value);
  }, [envQuery.data, published]);

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const reload = async () => {
    await queryClient.invalidateQueries({ queryKey: ["canister", "env", canisterId] });
    await queryClient.invalidateQueries({ queryKey: ["canister", "env-published", canisterId] });
  };

  const save = async (republishOnly = false) => {
    setSaving(true);
    try {
      if (viaApi) {
        // the API merges the change into the current list and calls refresh_env itself
        await canistersApi.updateEnv(canisterId, republishOnly ? { set: {}, unset: [] } : change);
        toast.success(
          kind === "certified" ? (republishOnly ? "Variables republished" : "Saved and published") : "Environment variables saved",
        );
        await reload();
        return;
      }
      const management = await getManagementActor();
      const target = Principal.fromText(canisterId);
      if (!republishOnly) {
        // Read-modify-write: apply this edit to the list as it is now, so changes made
        // elsewhere since the page loaded (another tab, an agent) are kept.
        const eff = { effectiveCanisterId: target };
        const status = await management.canister_status.withOptions(eff)({ canister_id: target });
        const next: EnvVariable[] = [];
        for (const v of status.settings.environment_variables) {
          if (change.unset.includes(v.name)) continue;
          next.push(v.name in change.set ? { name: v.name, value: change.set[v.name] } : { name: v.name, value: v.value });
        }
        for (const [name, value] of Object.entries(change.set)) {
          if (!next.some((v) => v.name === name)) next.push({ name, value });
        }
        if (next.length > MAX_VARIABLES) throw new Error(`At most ${MAX_VARIABLES} variables per canister`);
        await management.update_settings.withOptions(eff)({
          canister_id: target,
          settings: {
            environment_variables: [next],
            freezing_threshold: [],
            wasm_memory_threshold: [],
            controllers: [],
            reserved_cycles_limit: [],
            log_visibility: [],
            wasm_memory_limit: [],
            memory_allocation: [],
            compute_allocation: [],
          },
          sender_canister_version: [],
        });
      }
      if (kind === "certified") {
        await refreshEnv(canisterId);
        toast.success(republishOnly ? "Variables republished" : "Saved and published", "The page serves the new ic_env cookie now.");
      } else {
        toast.success("Environment variables saved");
      }
      await reload();
    } catch (error) {
      toast.error("Saving environment variables failed", error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5" />
          Canister environment variables
          {kind === "certified" && publishedInSync === false && <Badge variant="outline">not published yet</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Settings of the canister itself, not of a build. They stay when you redeploy and are read at runtime.
          {kind === "certified" && (
            <>
              {" "}This canister publishes every variable whose name starts with <code className="font-mono">{PUBLIC_PREFIX}</code> in
              the <code className="font-mono">ic_env</code> cookie of its HTML pages, so the{" "}
              <strong>values of {PUBLIC_PREFIX}* variables are public</strong>. Other names never reach the page. A game frontend
              names its backend with <code className="font-mono">PUBLIC_CANISTER_ID:backend</code> (the colon is part of the name).
            </>
          )}
          {kind === "other" && " The canister's own module reads them (ic0.env_var_*); nothing is published."}
        </p>

        {kind === "legacy" && (
          <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
            <span>
              This canister runs the legacy hosty assets module, which serves an empty <code className="font-mono">ic_env</code> cookie:
              variables set here never reach the page. Use <strong>Reset canister</strong> below to switch it to certified-assets
              (the variables are kept), then deploy again.
            </span>
          </div>
        )}

        {!canEdit ? (
          <p className="text-sm text-muted-foreground">Only a controller of the canister can read or change its environment variables.</p>
        ) : envQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : envQuery.isError ? (
          <div className="text-sm text-destructive">
            Cannot read the canister settings: {envQuery.error instanceof Error ? envQuery.error.message : String(envQuery.error)}
          </div>
        ) : (
          <>
            {rows.length === 0 && <p className="text-sm text-muted-foreground">No environment variables set.</p>}
            <div className="space-y-2">
              {rows.map((row, index) => (
                <div key={index} className={`flex gap-2 items-center ${row.removed ? "opacity-50" : ""}`}>
                  <Input
                    value={row.name}
                    placeholder="PUBLIC_CANISTER_ID:backend"
                    aria-label="Name"
                    className="font-mono text-xs flex-1"
                    disabled={row.removed || saving}
                    onChange={(e) => update(index, { name: e.target.value })}
                  />
                  <Input
                    value={row.value}
                    placeholder="value"
                    aria-label="Value"
                    className="font-mono text-xs flex-1"
                    disabled={row.removed || saving}
                    onChange={(e) => update(index, { value: e.target.value })}
                  />
                  {kind === "certified" && (
                    <Badge variant={row.name.startsWith(PUBLIC_PREFIX) ? "secondary" : "outline"} className="shrink-0 w-16 justify-center">
                      {row.name.startsWith(PUBLIC_PREFIX) ? "public" : "private"}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={saving}
                    title={row.removed ? "Keep" : "Remove"}
                    onClick={() =>
                      row.original === undefined
                        ? setRows((current) => current.filter((_, i) => i !== index))
                        : update(index, { removed: !row.removed })
                    }
                  >
                    {row.removed ? <Undo2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
            {problems.length > 0 && (
              <ul className="text-sm text-destructive list-disc pl-5">
                {problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={saving || rows.filter((r) => !r.removed).length >= MAX_VARIABLES}
                onClick={() => setRows((current) => [...current, { name: "", value: "", removed: false }])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add variable
              </Button>
              <Button size="sm" disabled={!dirty || saving || problems.length > 0} onClick={() => save()}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving…" : kind === "certified" ? "Save and publish" : "Save"}
              </Button>
              {kind === "certified" && publishedInSync === false && !dirty && (
                <Button variant="outline" size="sm" disabled={saving} onClick={() => save(true)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Republish
                </Button>
              )}
              {dirty && (
                <Button variant="ghost" size="sm" disabled={saving} onClick={() => envQuery.data && setRows(envQuery.data.map((v) => ({ original: v.name, name: v.name, value: v.value, removed: false })))}>
                  Discard changes
                </Button>
              )}
            </div>
            {kind === "certified" && published && Object.keys(published).length > 0 && (
              <div className="text-xs text-muted-foreground">
                Served in <code className="font-mono">ic_env</code> now:{" "}
                {Object.entries(published).map(([n, v]) => (
                  <code key={n} className="font-mono mr-2">{n}={v}</code>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
