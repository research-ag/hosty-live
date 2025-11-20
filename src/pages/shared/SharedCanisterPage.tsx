import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, ExternalLink, Globe, Zap } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { useCanisterStatus } from "../../hooks/useCanisterStatus";
import { BurnInfo } from "../components/BurnInfo";
import { useCanisterStateStatus } from "../../api/read-state.ts";
import { isAssetCanister } from "../../constants/knownHashes.ts";

function CyclesValue({ cyclesBalanceRaw }: { cyclesBalanceRaw?: string }) {
  if (!cyclesBalanceRaw) return <>unknown</>;
  try {
    const tc = Number(BigInt(cyclesBalanceRaw)) / 1_000_000_000_000;
    return <>{tc.toFixed(1)} TC</>;
  } catch {
    return <>unknown</>;
  }
}

export function SharedCanisterPage() {
  const { id: icCanisterId } = useParams<{ id: string }>();
  const canisterStatus = useCanisterStatus(icCanisterId);

  const { data: canisterStateStatus, isLoading: isCanisterStateStatusLoading } = useCanisterStateStatus(icCanisterId!);
  const [copied, setCopied] = useState(false);
  const [isPreviewInteractive, setIsPreviewInteractive] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const showLongUptimeWarning = typeof canisterStatus.uptimeYearsLeft === "number" && canisterStatus.uptimeYearsLeft > 10;

  // Generate frontend URL from IC canister ID
  const frontendUrl = icCanisterId ? `https://${icCanisterId}.icp0.io` : null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Loading state
  if (canisterStatus.isCanisterStatusLoading && isCanisterStateStatusLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"/>
            <span className="text-lg">Loading canister...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (canisterStatus.canisterStatusError || !icCanisterId) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">
            {canisterStatus.canisterStatusError?.message || "Canister Not Found"}
          </h1>
          <Link to="/">
            <Button>Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* General Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold mb-2">
            Canister {icCanisterId}
          </h1>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                IC Canister ID
              </label>
              <p className="text-sm font-mono">{icCanisterId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Cycles
              </label>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm">
                    <CyclesValue cyclesBalanceRaw={canisterStatus.cyclesRaw}/>
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsTopUpModalOpen(true)}
                    title="Top up"
                    className="h-6 w-6 p-0"
                  >
                    <Zap className="h-3.5 w-3.5"/>
                  </Button>
                </div>
                <BurnInfo canisterId={icCanisterId}/>
              </div>
            </div>
            {!!(canisterStatus.controllers?.length || canisterStateStatus?.controllers?.length) && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Controllers
                </label>
                <div className="space-y-1">
                  {(canisterStatus.controllers || canisterStateStatus!.controllers!).map((controller, index) => (
                    <p
                      key={index}
                      className="text-xs font-mono bg-muted px-2 py-1 rounded"
                    >
                      {controller ===
                        import.meta.env.VITE_BACKEND_PRINCIPAL && (
                          <span className="text-primary">(hosty.live)</span>
                        )}{" "}
                      {controller}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {(canisterStatus.moduleHash || canisterStateStatus?.moduleHash) && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Asset Canister
                </label>
                <p className="text-sm">
                  {isAssetCanister(canisterStatus.moduleHash || canisterStateStatus!.moduleHash!) ? "Yes" : "No"}
                </p>
              </div>
            )}
            {canisterStatus.pageViews !== undefined && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Page views
                </label>
                <p className="text-sm">
                  {canisterStatus.pageViews}
                </p>
              </div>
            )}
            {/* {canisterStatus.isSystemController !== undefined && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Controlled by hosty.live
                </label>
                <p className="text-sm">
                  {canisterStatus.isSystemController ? "Yes" : "No"}
                </p>
              </div>
            )} */}
          </CardContent>
        </Card>

        {/* Frontend Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5"/>
              Frontend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(canisterStatus.moduleHash || canisterStateStatus?.moduleHash)
            && isAssetCanister(canisterStatus.moduleHash || canisterStateStatus!.moduleHash!) ? (
              <div className="space-y-6">
                {/* URL Display with Actions */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">
                    Application URL
                  </label>
                  <div className="bg-muted/50 border border-border rounded-lg p-3">
                    <div className="font-mono text-sm text-foreground break-all select-text leading-relaxed mb-3">
                      {frontendUrl}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(frontendUrl!, "_blank")}
                        className="h-7 px-2 text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1"/>
                        Open
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(frontendUrl!)}
                        className="h-7 px-2 text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1"/>
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Frontend Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">
                      Preview
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">
                        Interactive
                      </label>
                      <button
                        onClick={() =>
                          setIsPreviewInteractive(!isPreviewInteractive)
                        }
                        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          isPreviewInteractive
                            ? "bg-primary"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            isPreviewInteractive
                              ? "translate-x-3.5"
                              : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-gray-950">
                    <iframe
                      src={frontendUrl!}
                      className="w-full h-96 md:h-[500px] lg:h-[600px] border-0"
                      title="Frontend Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      loading="lazy"
                      style={{
                        pointerEvents: isPreviewInteractive ? "auto" : "none",
                        userSelect: isPreviewInteractive ? "auto" : "none",
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {isPreviewInteractive ? "Interactive" : "Static"} preview
                      of the frontend
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(frontendUrl!, "_blank")}
                      className="h-7 px-2 text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1"/>
                      Open full size
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-8 w-8 text-muted-foreground"/>
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  No Frontend Deployed
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  This canister is not an asset canister
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={isTopUpModalOpen}
        onClose={() => setIsTopUpModalOpen(false)}
        title="Top up cycles"
        className="max-w-md"
      >
        <div className="space-y-4">

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="text-xs text-muted-foreground mb-1">Canister</div>
            <div className="font-mono text-xs break-all">{icCanisterId}</div>
          </div>

          {showLongUptimeWarning && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              The canister has more than 10 years of uptime left. Are you sure you want to top up?
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Top up this canister with cycles using Cycle Express. You can pay
            with credit card.
          </div>

          <Button
            variant="default"
            className="w-full justify-center"
            onClick={() => {
              window.open(
                `https://cycle.express/?to=${icCanisterId}`,
                "_blank",
                "noopener,noreferrer"
              );
              setIsTopUpModalOpen(false);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2"/>
            Go to Cycle Express
          </Button>
        </div>
      </Modal>
    </div>
  );
}
