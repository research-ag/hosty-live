import { useQuery } from "@tanstack/react-query";
import { Copy, Cpu, ExternalLink, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { wasmDeploymentsApi } from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { isAssetCanister } from "../../constants/knownHashes";

export function candidUiUrl(canisterId: string): string {
  return `https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=${canisterId}`;
}

interface BackendModuleCardProps {
  canisterId: string;
  moduleHash?: string;
  canInstall: boolean;
  onInstall: () => void;
}

export function BackendModuleCard({ canisterId, moduleHash, canInstall, onInstall }: BackendModuleCardProps) {
  const { toast } = useToast();
  const runsAssets = !!moduleHash && isAssetCanister(moduleHash);

  const candidQuery = useQuery({
    queryKey: ["canister", "candid", canisterId, moduleHash ?? ""],
    queryFn: () => wasmDeploymentsApi.candid(canisterId),
    enabled: !!moduleHash && !runsAssets,
    staleTime: 60_000,
  });
  const moduleQuery = useQuery({
    queryKey: ["module", moduleHash ?? ""],
    queryFn: () => wasmDeploymentsApi.moduleMeta(moduleHash!),
    enabled: !!moduleHash && !runsAssets,
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
        {!moduleHash || runsAssets ? (
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
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => copy(moduleHash, "Module hash")}>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">Interface (Candid)</label>
                {candidQuery.data && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => copy(candidQuery.data!, "Candid")}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                )}
              </div>
              {candidQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : candidQuery.data ? (
                <pre className="text-xs bg-muted/50 border border-border rounded-lg p-3 overflow-auto max-h-80 whitespace-pre">
                  {candidQuery.data}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Unknown: the module was not installed through hosty.live and does not embed its Candid.
                </p>
              )}
            </div>

            <div className="pt-1">
              <Button onClick={onInstall} disabled={!canInstall}>
                <Upload className="mr-2 h-4 w-4" />
                Upgrade or reinstall
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
