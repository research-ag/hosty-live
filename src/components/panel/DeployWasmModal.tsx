import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, Cpu, Info } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { FileUploader } from "../ui/FileUploader";
import { TooltipWrapper } from "../ui/TooltipWrapper";
import { Canister } from "../../types";
import { DeployWasmInput, wasmDeploymentsApi } from "../../services/api";
import { isAssetCanister } from "../../constants/knownHashes";

type Mode = "install" | "upgrade" | "reinstall";

interface DeployWasmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: (input: Omit<DeployWasmInput, "canisterId">) => Promise<void>;
  canister: Canister;
  currentModuleHash?: string;
  error?: string;
}

const MAX_WASM = 100 * 1024 * 1024;

export function DeployWasmModal({
  isOpen,
  onClose,
  onInstall,
  canister,
  currentModuleHash,
  error,
}: DeployWasmModalProps) {
  const hasModule = !!currentModuleHash;
  const runsAssets = hasModule && isAssetCanister(currentModuleHash!);
  const defaultMode: Mode = !hasModule ? "install" : runsAssets ? "reinstall" : "upgrade";

  const [wasm, setWasm] = useState<File | null>(null);
  const [candid, setCandid] = useState<File | null>(null);
  const [candidText, setCandidText] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [initArg, setInitArg] = useState("");
  const [argStatus, setArgStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [persistence, setPersistence] = useState<"" | "keep" | "replace">("");
  const [skipPreUpgrade, setSkipPreUpgrade] = useState(false);
  const [postInstallMethod, setPostInstallMethod] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setConfirmText("");
      setArgStatus(null);
    }
  }, [isOpen, defaultMode]);

  useEffect(() => {
    if (!candid) {
      setCandidText(undefined);
      return;
    }
    candid.text().then(setCandidText).catch(() => setCandidText(undefined));
  }, [candid]);

  // Live argument check through the API encoder (typed when a .did was attached).
  useEffect(() => {
    const arg = initArg.trim();
    if (!arg || arg === "()") {
      setArgStatus(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const hex = await wasmDeploymentsApi.validateArg(arg, candidText);
        if (!cancelled) setArgStatus({ ok: true, message: `${hex.length / 2} bytes` });
      } catch (err) {
        if (!cancelled) setArgStatus({ ok: false, message: err instanceof Error ? err.message : String(err) });
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [initArg, candidText]);

  const reinstallConfirmed = mode !== "reinstall" || confirmText.trim() === canister.id;
  const canSubmit = !!wasm && reinstallConfirmed && !busy && (!argStatus || argStatus.ok);

  const modeHelp = useMemo(() => {
    switch (mode) {
      case "install":
        return "The canister is empty; the module is installed fresh.";
      case "upgrade":
        return "Keeps stable memory. The module's pre/post-upgrade hooks run.";
      case "reinstall":
        return runsAssets
          ? "This canister runs the hosty frontend module. Reinstalling replaces it and deletes all uploaded files."
          : "Wipes all canister state and installs the module fresh.";
    }
  }, [mode, runsAssets]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasm || !canSubmit) return;
    setBusy(true);
    try {
      await onInstall({
        wasm,
        candid: candid ?? undefined,
        mode,
        initArg: initArg.trim() || undefined,
        wasmMemoryPersistence: persistence || undefined,
        skipPreUpgrade: skipPreUpgrade || undefined,
        postInstallMethod: postInstallMethod.trim() || undefined,
        confirmReinstall: mode === "reinstall" ? true : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Install a Wasm module" className="max-w-2xl">
      <form onSubmit={submit} className="space-y-5">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-3 text-sm">
          <Cpu className="h-5 w-5 mt-0.5 text-primary shrink-0" />
          <div>
            <p className="font-medium">
              {canister.alias} <span className="font-mono text-xs text-muted-foreground">{canister.id}</span>
            </p>
            <p className="text-muted-foreground">
              {hasModule ? (
                <>
                  Current module <span className="font-mono">{currentModuleHash!.slice(0, 16)}…</span>
                  {runsAssets ? " (hosty frontend module)" : ""}
                </>
              ) : (
                "No module installed yet"
              )}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Wasm module</label>
          <FileUploader onFileSelect={setWasm} accept=".wasm,.gz" maxSize={MAX_WASM} disabled={busy} />
          <p className="text-xs text-muted-foreground">
            Any IC Wasm module (Motoko, Rust, Azle, …), optionally gzipped. Up to 100 MB.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Install mode</label>
          <div className="inline-flex rounded-md border overflow-hidden">
            {(["install", "upgrade", "reinstall"] as Mode[]).map((m) => {
              const disabled = (m === "install" && hasModule) || (m === "upgrade" && !hasModule);
              return (
                <TooltipWrapper
                  key={m}
                  content={
                    m === "install" && hasModule
                      ? "The canister already has a module"
                      : m === "upgrade" && !hasModule
                        ? "Nothing to upgrade yet"
                        : undefined
                  }
                  disabled={!disabled}
                >
                  <button
                    type="button"
                    disabled={disabled || busy}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 text-sm capitalize transition-colors ${
                      mode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {m}
                  </button>
                </TooltipWrapper>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            {mode === "reinstall" ? (
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
            ) : (
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            )}
            {modeHelp}
          </p>
          {mode === "reinstall" && (
            <div className="space-y-1">
              <label className="text-xs font-medium">Type the canister id to confirm</label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={canister.id}
                disabled={busy}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {mode === "upgrade" ? "Upgrade argument" : "Init argument"}{" "}
            <span className="text-muted-foreground font-normal">(Candid text, optional)</span>
          </label>
          <Input
            value={initArg}
            onChange={(e) => setInitArg(e.target.value)}
            placeholder='(principal "aaaaa-aa")'
            className="font-mono"
            disabled={busy}
          />
          {argStatus && (
            <p className={`text-xs ${argStatus.ok ? "text-green-600" : "text-destructive"}`}>
              {argStatus.ok ? `Encodes to ${argStatus.message}` : argStatus.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Checked against the module's Candid once uploaded. Attach a .did below to check it now for
            modules that do not embed their interface (most Rust builds).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${advanced ? "rotate-90" : ""}`} />
          Advanced
        </button>

        {advanced && (
          <div className="space-y-4 rounded-md border p-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Candid interface (.did)</label>
              <FileUploader onFileSelect={setCandid} accept=".did" maxSize={2 * 1024 * 1024} disabled={busy} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Wasm memory persistence (upgrade)</label>
              <select
                value={persistence}
                onChange={(e) => setPersistence(e.target.value as "" | "keep" | "replace")}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                disabled={busy || mode !== "upgrade"}
              >
                <option value="">Automatic (keep for Motoko enhanced orthogonal persistence)</option>
                <option value="keep">keep</option>
                <option value="replace">replace</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={skipPreUpgrade}
                onChange={(e) => setSkipPreUpgrade(e.target.checked)}
                disabled={busy || mode !== "upgrade"}
              />
              Skip pre_upgrade hook
            </label>
            <div className="space-y-1">
              <label className="text-sm font-medium">Post-install method</label>
              <Input
                value={postInstallMethod}
                onChange={(e) => setPostInstallMethod(e.target.value)}
                placeholder="store_module"
                className="font-mono"
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">
                A <span className="font-mono">(blob) -&gt; ()</span> method called with the module bytes after a
                successful install, for canisters that serve their own Wasm.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {busy ? "Starting…" : mode === "reinstall" ? "Reinstall module" : mode === "upgrade" ? "Upgrade module" : "Install module"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
