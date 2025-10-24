import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, ExternalLink, Globe } from "lucide-react";
import { Button } from "../../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { canistersApi } from "../../services/api";
import { useCanisterStatus } from "../../hooks/useCanisterStatus";

interface PublicCanisterData {
  icCanisterId: string;
  createdAt: string;
  frontendUrl: string;
  cyclesBalance?: string;
  cyclesBalanceRaw?: string;
  controllers?: string[];
  isAssetCanister?: boolean;
  isSystemController?: boolean;
}

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
  const { id: canisterId } = useParams<{ id: string }>();
  const [canister, setCanister] = useState<PublicCanisterData | null>(null);
  const canisterStatus = useCanisterStatus(canister?.icCanisterId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isPreviewInteractive, setIsPreviewInteractive] = useState(false);

  // Fetch canister data
  const fetchCanister = async () => {
    if (!canisterId) return;

    setIsLoading(true);
    setError("");

    const result = await canistersApi.getPublicCanister(canisterId);

    if (result.success && result.data) {
      console.log(
        "🎯 [SharedCanisterPage] Canister data received:",
        result.data
      );
      setCanister(result.data);
    } else {
      setError(result.error || "Canister not found");
    }

    setIsLoading(false);
  };

  // Load canister on mount
  useEffect(() => {
    fetchCanister();
  }, [canisterId]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch (fallbackError) {
        console.error("Fallback copy failed:", fallbackError);
      }
    }
  };

  // Loading state
  if (isLoading || canisterStatus.isCanisterStatusLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            <span className="text-lg">Loading canister...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || canisterStatus.canisterStatusError || !canister) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">
            {error ||
              canisterStatus.canisterStatusError?.message ||
              "Canister Not Found"}
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
            Canister {canister.icCanisterId}
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
              <p className="text-sm font-mono">{canister.icCanisterId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Cycles
              </label>
              <div className="space-y-1">
                <p className="text-sm">
                  <CyclesValue cyclesBalanceRaw={canisterStatus.cyclesRaw} />
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Created
              </label>
              <p className="text-sm">
                {new Date(canister.createdAt).toLocaleString()}
              </p>
            </div>
            {canisterStatus.controllers &&
              canisterStatus.controllers.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Controllers
                  </label>
                  <div className="space-y-1">
                    {canisterStatus.controllers.map((controller, index) => (
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
            {canisterStatus.isAssetCanister !== undefined && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Asset Canister
                </label>
                <p className="text-sm">
                  {canisterStatus.isAssetCanister ? "Yes" : "No"}
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
              <Globe className="h-5 w-5" />
              Frontend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {canister.frontendUrl ? (
              <div className="space-y-6">
                {/* URL Display with Actions */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">
                    Application URL
                  </label>
                  <div className="bg-muted/50 border border-border rounded-lg p-3">
                    <div className="font-mono text-sm text-foreground break-all select-text leading-relaxed mb-3">
                      {canister.frontendUrl}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(canister.frontendUrl, "_blank")
                        }
                        className="h-7 px-2 text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          copyToClipboard(canister.frontendUrl!);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
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
                      src={canister.frontendUrl}
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
                      onClick={() =>
                        window.open(canister.frontendUrl, "_blank")
                      }
                      className="h-7 px-2 text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open full size
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  No Frontend Deployed
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  No frontend deployed yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
