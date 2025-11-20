import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Copy,
  ExternalLink,
  Gift,
  Globe,
  LockKeyhole,
  LockKeyholeOpen,
  Pencil,
  Settings,
  Share2,
  Upload,
  UserCheck,
  Zap,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, } from "../../components/ui/Card";
import { TextInputModal } from "../../components/ui/TextInputModal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Badge } from "../../components/ui/Badge";
import { DeployModal } from "../../components/panel/DeployModal";
import { TransferOwnershipModal } from "../../components/panel/TransferOwnershipModal";
import { CustomDomainModal } from "../../components/panel/CustomDomainModal";
import { TooltipWrapper } from "../../components/ui/TooltipWrapper";
import { useCanisters } from "../../hooks/useCanisters";
import { useQueryClient } from "@tanstack/react-query";
import { useDeployments } from "../../hooks/useDeployments";
import { useToast } from "../../hooks/useToast";
import { customDomainApi } from "../../api";
import { CustomDomain } from "../../components/ui/CustomDomain";
import { useCanisterStatus } from "../../hooks/useCanisterStatus";
import { useAuth } from "../../hooks/useAuth";
import { Principal } from "@dfinity/principal";
import { getStatusProxyActor, statusProxyCanisterId, } from "../../api/status-proxy";
import { TopUpCanisterModal } from "../../components/panel/TopUpCanisterModal";
import { useTCycles } from "../../hooks/useTCycles";
import { getAssetStorageActor } from "../../api/asset-storage";
import { backendCanisterId, getBackendActor } from "../../api/backend";
import { BurnInfo } from "../components/BurnInfo.tsx";
import { isAssetCanister } from "../../constants/knownHashes.ts";
import { Canister } from "../../types/index.ts";

function CyclesValue({ canisterId }: { canisterId: string }) {
  const { cyclesRaw, isCanisterStatusLoading } = useCanisterStatus(canisterId);
  if (isCanisterStatusLoading) return <>…</>;
  if (!cyclesRaw) return <>unknown</>;
  try {
    const tc = Number(BigInt(cyclesRaw)) / 1_000_000_000_000;
    return <>{tc.toFixed(2)} TC</>;
  } catch {
    return <>unknown</>;
  }
}

export function CanisterPage() {
  const { id: icCanisterId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCanister, addController, removeController, resetCanister, donateCanister } = useCanisters();
  const { deployToCanister, deployFromGit, deployFromUrl } = useDeployments();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { principal } = useAuth();

  const { domainFromIcDomains } =
    customDomainApi.fetchDomainFromIcDomains.useQuery(
      {
        canisterId: icCanisterId ?? "",
      },
      { enabled: !!icCanisterId }
    );

  const { domainCheckResult, domainCheckResultIsLoading } =
    customDomainApi.checkCustomDomain.useQuery(
      {
        canisterId: icCanisterId ?? "",
      },
      { enabled: !!icCanisterId && !!domainFromIcDomains }
    );

  const canisterStatus = useCanisterStatus(icCanisterId);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isCustomDomainModalOpen, setIsCustomDomainModalOpen] = useState(false);
  const [_, setCopied] = useState(false);
  const [canister, setCanister] = useState<Canister | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [deployError, setDeployError] = useState<string>("");
  const [transferError, setTransferError] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isPreviewInteractive, setIsPreviewInteractive] = useState(false);
  const [showMakeImmutableModal, setShowMakeImmutableModal] = useState(false);
  const [debugModeChecked, setDebugModeChecked] = useState(true);
  const [isImmutabilityActionLoading, setIsImmutabilityActionLoading] =
    useState(false);
  const [isImmutableInDebugMode, setIsImmutableInDebugMode] = useState<
    boolean | null
  >(null);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isEditAliasOpen, setIsEditAliasOpen] = useState(false);
  const [isEditDescriptionOpen, setIsEditDescriptionOpen] = useState(false);
  const { withdrawToCanister, balanceRaw, formatTC, refresh } =
    useTCycles(principal);
  // Remove controller confirm dialog state
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [isRemovingController, setIsRemovingController] = useState(false);
  // Reset canister dialog state
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string>("");
  // Donate canister dialog state
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isDonating, setIsDonating] = useState(false);
  const [donateError, setDonateError] = useState<string>("");

  const fetchImmutability = async () => {
    try {
      if (!icCanisterId) return;
      const actor = await getStatusProxyActor();
      const res = await actor.isImmutableInDebugMode(
        Principal.fromText(icCanisterId)
      );
      setIsImmutableInDebugMode(res.length > 0);
    } catch (e) {
      console.error("Failed to check immutability:", e);
      setIsImmutableInDebugMode(null);
    }
  };

  // Fetch canister data
  const fetchCanister = async () => {
    if (!icCanisterId) return;

    setIsLoading(true);
    setError("");

    const result = await getCanister(icCanisterId, true);

    if (result.success) {
      if (result.data) {
        console.log("🎯 [CanisterPage] Canister data received:", result.data);
        setCanister(result.data);
      } else {
        setError("Canister not found");
      }
    } else {
      setError(result.error || "Canister not found");
    }

    setIsLoading(false);
  };

  // Load canister on mount
  useEffect(() => {
    fetchCanister().then();
  }, [icCanisterId]);

  useEffect(() => {
    fetchImmutability().then();
  }, [icCanisterId]);

  const handleDeploy = async (data: {
    file: File;
    buildCommand: string;
    outputDir: string;
    envVars?: Record<string, string>;
  }) => {
    if (!canister) return;

    setDeployError("");

    const result = await deployToCanister({
      canisterId: canister.id, // Use internal canister ID for deployments
      file: data.file,
      buildCommand: data.buildCommand,
      outputDir: data.outputDir,
      envVars: data.envVars,
    });

    if (result.success) {
      toast.success(
        "Deployment started!",
        "Your application is being deployed. Check the deployments page for progress."
      );
      // Navigate to deployments page to see the new deployment
      navigate("/panel/deployments");
    } else {
      toast.error(
        "Deployment failed",
        result.error || "Failed to start deployment"
      );
      setDeployError(result.error || "Failed to start deployment");
    }
  };

  const handleDeployFromGit = async (data: {
    gitRepoUrl: string;
    branch: string;
    buildCommand: string;
    outputDir: string;
    envVars?: Record<string, string>;
  }) => {
    if (!canister) return;

    setDeployError("");

    const result = await deployFromGit({
      canisterId: canister.id, // Use internal canister ID for deployments
      gitRepoUrl: data.gitRepoUrl,
      branch: data.branch,
      buildCommand: data.buildCommand,
      outputDir: data.outputDir,
      envVars: data.envVars,
    });

    if (result.success) {
      toast.success(
        "Deployment started!",
        "Your application is being deployed from GitHub. Check the deployments page for progress."
      );
      // Navigate to deployments page to see the new deployment
      navigate("/panel/deployments");
    } else {
      toast.error(
        "Deployment failed",
        result.error || "Failed to start deployment from GitHub"
      );
      setDeployError(result.error || "Failed to start deployment from GitHub");
    }
  };

  const handleDeployFromUrl = async (data: {
    archiveUrl: string;
    buildCommand: string;
    outputDir: string;
    envVars?: Record<string, string>;
  }) => {
    if (!canister) return;

    setDeployError("");

    const result = await deployFromUrl({
      canisterId: canister.id, // Use internal canister ID for deployments
      archiveUrl: data.archiveUrl,
      buildCommand: data.buildCommand,
      outputDir: data.outputDir,
      envVars: data.envVars,
    });

    if (result.success) {
      toast.success(
        "Deployment started!",
        "Your application is being deployed from the archive URL. Check the deployments page for progress."
      );
      // Navigate to deployments page to see the new deployment
      navigate("/panel/deployments");
    } else {
      toast.error(
        "Deployment failed",
        result.error || "Failed to start deployment from URL"
      );
      setDeployError(result.error || "Failed to start deployment from URL");
    }
  };

  const handleRemoveController = (userPrincipal: string) => {
    if (!canister) return;

    if (userPrincipal === principal) {
      toast.error("Forbidden", "You can't remove yourself from controllers.");
      return;
    }
    if (userPrincipal === statusProxyCanisterId) {
      toast.error(
        "Forbidden",
        "You can't remove the status-proxy canister from controllers."
      );
      return;
    }
    if (userPrincipal === backendCanisterId && canister.ownedBySystem) {
      toast.error(
        "Forbidden",
        "You can't remove hosty.live from controllers if canister is owned by the system."
      );
      return;
    }

    setRemoveTarget(userPrincipal);
    setIsRemoveConfirmOpen(true);
  };

  const confirmRemoveController = async () => {
    if (!canister || !removeTarget) return;
    try {
      setIsRemovingController(true);
      const res = await removeController(canister.id, removeTarget);
      if (res.success) {
        toast.success("Controller removed", "The controller was removed.");
        setIsRemoveConfirmOpen(false);
        setRemoveTarget(null);
        await fetchCanister();
        await queryClient.invalidateQueries({
          queryKey: ["canister", "status", icCanisterId ?? "unknown"],
        });
      } else {
        toast.error("Failed to remove controller", res.error || "Unknown error");
      }
    } finally {
      setIsRemovingController(false);
    }
  };

  const confirmResetCanister = async () => {
    if (!canister) return;
    try {
      setIsResetting(true);
      setResetError("");
      const owners = canister.userIds.map(ps => Principal.fromText(ps));
      if (canister.ownedBySystem) {
        owners.push(Principal.fromText(backendCanisterId));
      }
      const res = await resetCanister(canister.id, owners);
      if (res.success) {
        toast.success("Canister reset", "The canister was reset to defaults.");
        setIsResetOpen(false);
        await fetchCanister();
        await queryClient.invalidateQueries({
          queryKey: ["canister", "status", icCanisterId ?? "unknown"],
        });
      } else {
        toast.error("Failed to reset canister", res.error || "Unknown error");
        setResetError(res.error || "Unknown error");
      }
    } catch (e: any) {
      toast.error("Failed to reset canister", e?.message || String(e));
      setResetError(e?.message || String(e));
    } finally {
      setIsResetting(false);
    }
  };

  const confirmDonateCanister = async () => {
    if (!canister) return;
    try {
      setIsDonating(true);
      setDonateError("");
      const res = await donateCanister(canister.id);
      if (res.success) {
        toast.success("Canister donated", "This canister was donated to the pool and may be used by others.");
        setIsDonateOpen(false);
        // Redirect to canisters page since you no longer own it
        navigate("/panel/canisters");
      } else {
        toast.error("Failed to donate canister", res.error || "Unknown error");
        setDonateError(res.error || "Unknown error");
      }
    } catch (e: any) {
      toast.error("Failed to donate canister", e?.message || String(e));
      setDonateError(e?.message || String(e));
    } finally {
      setIsDonating(false);
    }
  };

  const handleTransferOwnership = async (userPrincipal: string) => {
    if (!canister) return;

    setTransferError("");
    setIsTransferring(true);

    const result = await addController(canister.id, userPrincipal);

    if (result.success) {
      toast.success(
        "Controller added successfully",
        "The user has been added as a controller to this canister."
      );
      setIsTransferModalOpen(false);
      // Refresh canister data to get updated controller info and system flags
      fetchCanister();
    } else {
      toast.error(
        "Failed to add controller",
        result.error || "There was an error adding the controller."
      );
      setTransferError(result.error || "Failed to add controller");
    }

    setIsTransferring(false);
  };

  const handleConfirmMakeImmutable = async () => {
    if (!icCanisterId) return;
    try {
      setIsImmutabilityActionLoading(true);
      const actor = await getStatusProxyActor();
      await actor.makeImmutable(
        Principal.fromText(icCanisterId),
        debugModeChecked
      );
      toast.success(
        "Immutability set",
        debugModeChecked
          ? "Canister made immutable in debug mode."
          : "Canister made immutable. This cannot be undone."
      );
      setShowMakeImmutableModal(false);
      await Promise.all([fetchCanister(), fetchImmutability()]);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to make immutable", e?.message || String(e));
    } finally {
      setIsImmutabilityActionLoading(false);
    }
  };

  const handleUndoImmutability = async () => {
    if (!icCanisterId) return;
    try {
      setIsImmutabilityActionLoading(true);
      const actor = await getStatusProxyActor();
      await actor.undoImmutability(Principal.fromText(icCanisterId));
      const assetCanister = await getAssetStorageActor(icCanisterId);
      try {
        await assetCanister.grant_permission({
          permission: { Commit: null },
          to_principal: Principal.fromText(import.meta.env.VITE_BACKEND_PRINCIPAL),
        });
      } catch (_) {
        // pass
      }
      toast.success("Immutability undone", "Canister is mutable again.");
      setIsImmutableInDebugMode(false);
      await fetchCanister();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to undo immutability", e?.message || String(e));
    } finally {
      setIsImmutabilityActionLoading(false);
    }
  };

  // Loading state
  if (isLoading || canisterStatus.isCanisterStatusLoading) {
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
  if (error || !canister || canisterStatus.canisterStatusError) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">
            {error ||
              canisterStatus.canisterStatusError?.message ||
              "Canister Not Found"}
          </h1>
          <Link to="/panel/canisters">
            <Button>Back to Canisters</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!canister) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Canister Not Found</h1>
          <Link to="/panel/canisters">
            <Button>Back to Canisters</Button>
          </Link>
        </div>
      </div>
    );
  }

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

  const handleUpdateAlias = async (newAlias: string) => {
    if (!icCanisterId || !canister) return;
    const prev = canister;
    const trimmed = (newAlias ?? '').trim();
    const nextAlias = trimmed === '' ? undefined : trimmed;
    setCanister({ ...canister, alias: nextAlias ?? '' });
    setIsEditAliasOpen(false);
    try {
      const backend = await getBackendActor();
      const payload: any = { alias: [], description: [], frontendUrl: [] };
      payload.alias = trimmed === '' ? [[]] : [[trimmed]];
      await backend.updateCanister(Principal.fromText(icCanisterId), payload);
      toast.success("Alias updated");
      queryClient.invalidateQueries({ queryKey: ['canisters'] }).then();
    } catch (e: any) {
      setCanister(prev);
      console.error("Failed to update alias", e);
      toast.error("Failed to update alias", e?.message || String(e));
      throw e;
    }
  };

  const handleUpdateDescription = async (newDesc: string) => {
    if (!icCanisterId || !canister) return;
    const prev = canister;
    const trimmed = (newDesc ?? '').trim();
    const nextDesc = trimmed === '' ? undefined : trimmed;
    setCanister({ ...canister, description: nextDesc || null });
    setIsEditDescriptionOpen(false);
    try {
      const backend = await getBackendActor();
      const payload: any = { alias: [], description: [], frontendUrl: [] };
      payload.description = trimmed === '' ? [[]] : [[trimmed]];
      await backend.updateCanister(Principal.fromText(icCanisterId), payload);
      toast.success("Description updated");
      queryClient.invalidateQueries({ queryKey: ['canisters'] }).then();
    } catch (e: any) {
      setCanister(prev);
      console.error("Failed to update description", e);
      toast.error("Failed to update description", e?.message || String(e));
      throw e;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-5 w-5 text-green-500"/>;
      case "inactive":
        return <AlertCircle className="h-5 w-5 text-gray-500"/>;
      default:
        return null;
    }
  };

  const canDeploy = !!canisterStatus.moduleHash && isAssetCanister(canisterStatus.moduleHash);
  const deployTooltip = !canDeploy
    ? "Deployment disabled: Canister is not an asset canister"
    : undefined;

  return (
    <div className="p-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link to="/panel/canisters" className="hover:text-foreground">
          Canisters
        </Link>
        <ChevronRight className="h-4 w-4"/>
        <span className="text-foreground">{canister.alias}</span>
      </nav>

      {/* General Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-semibold">
              {canister.alias}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditAliasOpen(true)}
              title="Edit alias"
              className="h-7 w-7 p-0"
            >
              <Pencil className="h-4 w-4"/>
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(canister.status)}
            <Badge
              variant={canister.status === "active" ? "success" : "secondary"}
            >
              {canister.status}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3 md:flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              const sharedUrl = `${window.location.origin}/shared/${canister.id}`;
              copyToClipboard(sharedUrl);
              toast.success("Shared URL copied to clipboard");
            }}
            className="w-full sm:w-auto"
          >
            <Share2 className="mr-2 h-4 w-4"/>
            Share
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsCustomDomainModalOpen(true)}
            className="w-full sm:w-auto"
          >
            <Settings className="mr-2 h-4 w-4"/>
            Custom Domain
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsTransferModalOpen(true)}
            disabled={!principal || canister.ownedBySystem || !canisterStatus.controllers?.includes(principal)}
            className="w-full sm:w-auto"
          >
            <UserCheck className="mr-2 h-4 w-4"/>
            Ownership
          </Button>
          <TooltipWrapper content={deployTooltip}>
            <Button
              variant="default"
              onClick={() => setIsDeployModalOpen(true)}
              disabled={!canDeploy}
              className="w-full sm:w-auto"
            >
              <Upload className="mr-2 h-4 w-4"/>
              Deploy
            </Button>
          </TooltipWrapper>
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
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Description
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditDescriptionOpen(true)}
                  title="Edit description"
                  className="h-6 w-6 p-0"
                >
                  <Pencil className="h-3.5 w-3.5"/>
                </Button>
              </div>
              <p className="text-sm font-mono">{canister.description || '-'}</p>
            </div>
            {!!domainFromIcDomains && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Custom domain
                </label>
                <CustomDomain
                  domain={domainFromIcDomains}
                  checkResult={domainCheckResult}
                  isLoading={domainCheckResultIsLoading}
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                IC Canister ID
              </label>
              <p className="text-sm font-mono">{canister.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Cycles
              </label>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm">
                    <CyclesValue canisterId={canister.id}/>
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
                <BurnInfo canisterId={canister.id}/>
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
            {canister.deployedAt && (<div>
              <label className="text-sm font-medium text-muted-foreground">
                Last Deployed
              </label>
              <p className="text-sm">
                {new Date(canister.deployedAt).toLocaleString()}
              </p>
            </div>)}
            {canisterStatus.controllers &&
              canisterStatus.controllers.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Controllers
                  </label>
                  <div className="space-y-1">
                    {canisterStatus.controllers.map((controller, index) => {
                      const isSelf = controller === principal;
                      const isProxy = controller === statusProxyCanisterId;
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-2 bg-muted px-2 py-1 rounded"
                        >
                          <div className="text-xs font-mono">
                            {controller === backendCanisterId && (
                              <span className="text-primary">(hosty.live) </span>
                            )}
                            {isSelf && (
                              <span className="text-primary">(you) </span>
                            )}
                            {isProxy && (
                              <span className="text-primary">(status proxy canister) </span>
                            )}
                            {controller}
                          </div>
                          <div>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isSelf || isProxy || (canister.ownedBySystem && controller === backendCanisterId) || isRemovingController || (!!principal && !canisterStatus.controllers?.includes(principal))}
                              onClick={() => handleRemoveController(controller)}
                              title={
                                isSelf
                                  ? "You can't remove yourself"
                                  : isProxy
                                    ? "You can't remove the status-proxy canister"
                                    : "Remove controller"
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ height: "0.5rem" }}/>
                  {canisterStatus.controllers.length > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => setShowMakeImmutableModal(true)}
                      disabled={(!!principal && !canisterStatus.controllers?.includes(principal)) || canister.ownedBySystem}
                      className="w-full sm:w-auto"
                    >
                      <LockKeyhole className="mr-2 h-4 w-4"/>
                      Make immutable
                    </Button>
                  )}
                  {isImmutableInDebugMode === true && (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          await handleUndoImmutability();
                        } catch {
                          // pass
                        }
                      }}
                      className="w-full sm:w-auto"
                      disabled={isImmutabilityActionLoading}
                    >
                      {isImmutabilityActionLoading ? (
                        <>
                          <div
                            className="mr-2 h-4 w-4 border-2 border-b-transparent border-current rounded-full animate-spin"/>
                          Undoing…
                        </>
                      ) : (
                        <>
                          <LockKeyholeOpen className="mr-2 h-4 w-4"/>
                          Undo immutability
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            {canisterStatus.moduleHash && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Asset Canister
                </label>
                <p className="text-sm">
                  {isAssetCanister(canisterStatus.moduleHash) ? "Yes" : "No"}
                </p>
              </div>
            )}
            {canisterStatus.wasmBinarySize && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Wasm Size
                </label>
                <p className="text-sm">{canisterStatus.wasmBinarySize}</p>
              </div>
            )}
            {canisterStatus.wasmMemorySize && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Memory Size
                </label>
                <p className="text-sm">{canisterStatus.wasmMemorySize}</p>
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
            <div className="pt-2" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Button
                variant="destructive"
                disabled={!principal || !canisterStatus.controllers?.includes(principal)}
                onClick={() => setIsResetOpen(true)}
                className="w-full sm:w-auto"
                style={{ minWidth: "11rem" }}
              >
                <AlertCircle className="mr-2 h-4 w-4"/>
                Reset canister
              </Button>
              {!canister.ownedBySystem && (
                <Button
                  variant="destructive"
                  disabled={!principal || !canisterStatus.controllers?.includes(principal)}
                  onClick={() => setIsDonateOpen(true)}
                  className="w-full sm:w-auto"
                  style={{ minWidth: "11rem" }}
                >
                  <Gift className="mr-2 h-4 w-4"/>
                  Donate canister
                </Button>
              )}
            </div>
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
                        <ExternalLink className="h-3 w-3 mr-1"/>
                        Open
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          copyToClipboard(canister.frontendUrl!);
                          toast.success("URL copied to clipboard");
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1"/>
                        Copy
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
                      of your frontend
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(canister.frontendUrl, "_blank")
                      }
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
                  No frontend deployed yet
                </p>
                <TooltipWrapper
                  content={deployTooltip}
                  disabled={!deployTooltip}
                >
                  <Button
                    onClick={() => setIsDeployModalOpen(true)}
                    disabled={!canDeploy}
                  >
                    <Upload className="mr-2 h-4 w-4"/>
                    Deploy Now
                  </Button>
                </TooltipWrapper>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        onDeploy={handleDeploy}
        onDeployFromGit={handleDeployFromGit}
        onDeployFromUrl={handleDeployFromUrl}
        canister={canister}
        error={deployError}
      />

      <TransferOwnershipModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onTransfer={handleTransferOwnership}
        canister={canister}
        isLoading={isTransferring}
        error={transferError}
      />

      <CustomDomainModal
        isOpen={isCustomDomainModalOpen}
        onClose={() => setIsCustomDomainModalOpen(false)}
        canister={canister}
      />

      {icCanisterId && (
        <TopUpCanisterModal
          isOpen={isTopUpModalOpen}
          onClose={() => setIsTopUpModalOpen(false)}
          canisterId={icCanisterId}
          userBalanceRaw={balanceRaw}
          formatTC={formatTC}
          onWithdraw={async (cid, amt) => {
            const res = await withdrawToCanister(cid, amt);
            toast.success(
              "Top up successful",
              `Deposit submitted. Block index: ${res.toString()}`
            );
            await refresh();
            return res;
          }}
          onRefreshBalance={refresh}
        />
      )}

      <ConfirmDialog
        isOpen={isRemoveConfirmOpen}
        title="Remove this controller?"
        description={(
          <>
            <p>They will lose the ability to manage this canister.</p>
            {removeTarget && (
              <div className="mt-3 p-2 bg-muted rounded font-mono text-xs break-all">
                {removeTarget}
              </div>
            )}
          </>
        )}
        confirmLabel="Yes"
        cancelLabel="Cancel"
        isLoading={isRemovingController}
        onConfirm={confirmRemoveController}
        onCancel={() => {
          if (!isRemovingController) {
            setIsRemoveConfirmOpen(false);
            setRemoveTarget(null);
          }
        }}
      />

      <ConfirmDialog
        isOpen={isResetOpen}
        title="Reset this canister?"
        error={Number(canisterStatus.cyclesRaw) < 310_000_000_000 ? "Please top up canister so it has at least 0.31 TC balance in order to reset it" : undefined}
        description={(
          <>
            <p className="text-sm">
              This will restore the canister to post-creation defaults:
            </p>
            <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
              <li>Controllers set to you and the status-proxy canister</li>
              <li>Asset wasm module re-installed</li>
              <li>Asset permissions cleared and default grants reapplied</li>
              <li>Default index.html deployed to the asset canister</li>
            </ul>
            {!!resetError && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded text-xs">
                {resetError}
              </div>
            )}
          </>
        )}
        confirmLabel="Reset"
        cancelLabel="Cancel"
        isLoading={isResetting}
        onConfirm={confirmResetCanister}
        onCancel={() => {
          if (!isResetting) {
            setIsResetOpen(false);
            setResetError("");
          }
        }}
        className="[&_.btn-confirm]:bg-destructive"
      />

      <ConfirmDialog
        isOpen={isDonateOpen}
        title="Donate this canister?"
        description={(
          <>
            <p className="text-sm">
              Donation will give this canister to the system so it can be used by other users who need it.
            </p>
            {!!donateError && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded text-xs">
                {donateError}
              </div>
            )}
          </>
        )}
        confirmLabel="Donate"
        cancelLabel="Cancel"
        isLoading={isDonating}
        onConfirm={confirmDonateCanister}
        onCancel={() => {
          if (!isDonating) {
            setIsDonateOpen(false);
            setDonateError("");
          }
        }}
        className="[&_.btn-confirm]:bg-destructive"
      />

      <TextInputModal
        isOpen={isEditAliasOpen}
        onClose={() => setIsEditAliasOpen(false)}
        title="Enter canister alias"
        label="Enter canister alias"
        initialValue={canister.alias ?? ''}
        submitText="Submit"
        onSubmit={handleUpdateAlias}
      />

      <TextInputModal
        isOpen={isEditDescriptionOpen}
        onClose={() => setIsEditDescriptionOpen(false)}
        title="Enter canister description"
        label="Enter canister description"
        initialValue={canister.description ?? ''}
        submitText="Submit"
        onSubmit={handleUpdateDescription}
      />

      {showMakeImmutableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background shadow-lg border border-border">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-lg font-semibold">Make immutable</h3>
            </div>
            <div className="px-4 py-4 space-y-4">
              {!isImmutabilityActionLoading && (canisterStatus.uptimeYearsLeft || 0) < 1 && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  Cannot make immutable canister with less than 1 year of uptime. Please top up the canister
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  id="debugMode"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={debugModeChecked}
                  onChange={(e) => setDebugModeChecked(e.target.checked)}
                />
                <label htmlFor="debugMode" className="text-sm">
                  Debug mode
                </label>
              </div>
              <div className="text-sm">
                <p
                  className={`mt-1 ${
                    debugModeChecked
                      ? "text-muted-foreground"
                      : "text-red-600 dark:text-red-500"
                  }`}
                >
                  Immutability without debug mode can never be undone.
                </p>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowMakeImmutableModal(false)}
                disabled={isImmutabilityActionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmMakeImmutable}
                disabled={isImmutabilityActionLoading || (canisterStatus.uptimeYearsLeft || 0) < 1}
              >
                {isImmutabilityActionLoading ? "Applying…" : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
