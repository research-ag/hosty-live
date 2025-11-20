import { useEffect, useState, useRef } from "react";
import { AlertTriangle, Github, Info, Link, Server, Upload, Zap, ChevronRight } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { FileUploader } from "../ui/FileUploader";
import { TooltipWrapper } from "../ui/TooltipWrapper";
import { useToast } from "../../hooks/useToast";
import { Canister } from "../../types";
import { getBackendActor } from "../../api/backend";
import type { DeploymentExample } from "../../api/backend/backend.did";

type DeploymentMethod = "zip" | "git" | "url";

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (data: {
    file: File;
    buildCommand: string;
    outputDir: string;
    envVars?: Record<string, string>;
    isDryRun?: boolean;
  }) => void;
  onDeployFromGit: (data: {
    gitRepoUrl: string;
    branch: string;
    buildCommand: string;
    outputDir: string;
    envVars?: Record<string, string>;
    isDryRun?: boolean;
  }) => void;
  onDeployFromUrl: (data: {
    archiveUrl: string;
    buildCommand: string;
    outputDir: string;
    envVars?: Record<string, string>;
    isDryRun?: boolean;
  }) => void;
  canister?: Canister | null;
  error?: string;
}

export function DeployModal({
                              isOpen,
                              onClose,
                              onDeploy,
                              onDeployFromGit,
                              onDeployFromUrl,
                              canister,
                              error,
                            }: DeployModalProps) {
  const [deploymentMethod, setDeploymentMethod] =
    useState<DeploymentMethod>("zip");
  const [file, setFile] = useState<File | null>(null);
  const [gitRepoUrl, setGitRepoUrl] = useState("");
  const [archiveUrl, setArchiveUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [buildCommand, setBuildCommand] = useState("npm run build");
  const [outputDir, setOutputDir] = useState("dist");
  const [envVarsText, setEnvVarsText] = useState("");
  const [envVarsError, setEnvVarsError] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);
  const { toast } = useToast();

  // Deployment examples from backend
  const [examples, setExamples] = useState<DeploymentExample[]>([]);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [examplesError, setExamplesError] = useState<string | undefined>(undefined);
  const [examplesOpen, setExamplesOpen] = useState(false);
  // Refs for scrolling to sections
  const gitUrlSectionRef = useRef<HTMLDivElement | null>(null);
  const archiveUrlSectionRef = useRef<HTMLDivElement | null>(null);
  const [pendingScrollTo, setPendingScrollTo] = useState<null | 'git' | 'url'>(null);

  type PersistedDeployForm = {
    method: DeploymentMethod;
    gitRepoUrl: string;
    archiveUrl: string;
    branch: string;
    buildCommand: string;
    outputDir: string;
    envVarsText: string;
    isDryRun: boolean;
  };

  const parseEnvVars = (
    text: string
  ): { valid: boolean; envVars?: Record<string, string>; error?: string } => {
    if (!text.trim()) {
      return { valid: true, envVars: undefined };
    }

    const envVars: Record<string, string> = {};
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line || line.startsWith("#")) {
        continue;
      }

      const equalIndex = line.indexOf("=");
      if (equalIndex === -1) {
        return {
          valid: false,
          error: `Line ${
            i + 1
          }: Missing = separator. Format should be KEY=value`,
        };
      }

      const key = line.substring(0, equalIndex).trim();
      const value = line.substring(equalIndex + 1).trim();

      if (!key) {
        return {
          valid: false,
          error: `Line ${i + 1}: Variable name cannot be empty`,
        };
      }

      if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
        return {
          valid: false,
          error: `Line ${
            i + 1
          }: Invalid variable name "${key}". Use letters, numbers, and underscores only`,
        };
      }

      envVars[key] = value;
    }

    return {
      valid: true,
      envVars: Object.keys(envVars).length > 0 ? envVars : undefined,
    };
  };

  const getLsKey = (canisterId: string) => `deploy_form:${canisterId}`;

  const persistForm = () => {
    const canisterId = canister?.id;
    if (!canisterId) return;
    const payload: PersistedDeployForm = {
      method: deploymentMethod,
      gitRepoUrl,
      archiveUrl,
      branch,
      buildCommand,
      outputDir,
      envVarsText,
      isDryRun,
    };
    try {
      localStorage.setItem(getLsKey(canisterId), JSON.stringify(payload));
    } catch {
      // Ignore localStorage errors
    }
  };

  useEffect(() => {
    const canisterId = canister?.id;
    if (!isOpen || !canisterId) return;
    try {
      const raw = localStorage.getItem(getLsKey(canisterId));
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<PersistedDeployForm>;
      if (data.method === "zip" || data.method === "git" || data.method === "url")
        setDeploymentMethod(data.method);
      if (typeof data.gitRepoUrl === "string") setGitRepoUrl(data.gitRepoUrl);
      if (typeof data.archiveUrl === "string") setArchiveUrl(data.archiveUrl);
      if (typeof data.branch === "string") setBranch(data.branch);
      if (typeof data.buildCommand === "string")
        setBuildCommand(data.buildCommand);
      if (typeof data.outputDir === "string") setOutputDir(data.outputDir);
      if (typeof data.envVarsText === "string")
        setEnvVarsText(data.envVarsText);
      if (typeof data.isDryRun === "boolean") setIsDryRun(data.isDryRun);
    } catch {
      // Ignore localStorage errors
    }
  }, [isOpen, canister?.id]);

  // Load examples when modal opens
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isOpen) return;
      setLoadingExamples(true);
      setExamplesError(undefined);
      try {
        const actor = await getBackendActor();
        const data = await actor.listDeploymentExamples();
        if (!cancelled) setExamples(data);
      } catch (e) {
        console.error('[DeployModal] Failed to load examples', e);
        if (!cancelled) setExamplesError('Failed to load examples');
      } finally {
        if (!cancelled) setLoadingExamples(false);
      }
    };
    load();
    return () => {
      cancelled = true
    };
  }, [isOpen]);

  // Smooth scroll to target section after selecting an example
  useEffect(() => {
    if (!pendingScrollTo) return;

    const wantGit = pendingScrollTo === 'git';
    const wantUrl = pendingScrollTo === 'url';

    const methodReady = (wantGit && deploymentMethod === 'git') || (wantUrl && deploymentMethod === 'url');
    if (!methodReady) return;

    const targetEl = wantGit ? gitUrlSectionRef.current : archiveUrlSectionRef.current;
    if (!targetEl) return;

    // Defer to next frame to ensure DOM is painted
    const id = window.requestAnimationFrame(() => {
      try {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const input = targetEl.querySelector('input') as HTMLInputElement | null;
        if (input) {
          input.focus({ preventScroll: true } as any);
        }
      } finally {
        setPendingScrollTo(null);
      }
    });

    return () => window.cancelAnimationFrame(id);
  }, [pendingScrollTo, deploymentMethod]);

  useEffect(() => {
    if (!envVarsText.trim()) {
      setEnvVarsError("");
      return;
    }

    const result = parseEnvVars(envVarsText);
    if (!result.valid) {
      setEnvVarsError(result.error || "");
    } else {
      setEnvVarsError("");
    }
  }, [envVarsText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const envVarsResult = parseEnvVars(envVarsText);
    if (!envVarsResult.valid) {
      toast.error(
        "Invalid environment variables",
        envVarsResult.error || "Please check the format"
      );
      return;
    }

    setIsDeploying(true);

    try {
      if (deploymentMethod === "zip") {
        if (!file) {
          toast.error(
            "Please select a file",
            "A ZIP file is required for deployment."
          );
          return;
        }
        await onDeploy({
          file,
          buildCommand,
          outputDir,
          envVars: envVarsResult.envVars,
          isDryRun,
        });
      } else if (deploymentMethod === "git") {
        if (!gitRepoUrl) {
          toast.error(
            "Please enter a repository URL",
            "A GitHub repository URL is required for deployment."
          );
          return;
        }
        await onDeployFromGit({
          gitRepoUrl,
          branch,
          buildCommand,
          outputDir,
          envVars: envVarsResult.envVars,
          isDryRun,
        });
      } else if (deploymentMethod === "url") {
        if (!archiveUrl) {
          toast.error(
            "Please enter an archive URL",
            "A URL to the archive file is required for deployment."
          );
          return;
        }
        await onDeployFromUrl({
          archiveUrl,
          buildCommand,
          outputDir,
          envVars: envVarsResult.envVars,
          isDryRun,
        });
      }

      if (!error) {
        persistForm();
        onClose();
        setFile(null);
        setGitRepoUrl("");
        setArchiveUrl("");
        setBranch("main");
        setBuildCommand("npm run build");
        setOutputDir("dist");
        setEnvVarsText("");
        setEnvVarsError("");
        setIsDryRun(false);
      }
    } finally {
      setIsDeploying(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setGitRepoUrl("");
    setArchiveUrl("");
    setBranch("main");
    setBuildCommand("npm run build");
    setOutputDir("dist");
    setEnvVarsText("");
    setEnvVarsError("");
    setIsDryRun(false);
    setDeploymentMethod("zip");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Deploy to Canister"
      className="max-w-sm sm:max-w-lg md:max-w-xl lg:max-w-2xl"
    >
      <div className="space-y-6">
        {/* Canister Info Section */}
        {canister && (
          <div className="bg-muted/30 border border-border/50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Server className="h-4 w-4 text-primary"/>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm">Target Canister</h3>
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-muted-foreground text-xs sm:text-sm">
                  ID:
                </span>
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded break-all">
                  {canister.id}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-muted-foreground text-xs sm:text-sm">
                  Status:
                </span>
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  {canister.status}
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}

          <div className="border rounded-md bg-muted/20">
            <button
              type="button"
              className="w-full flex items-center justify-between p-3 sm:p-4"
              onClick={() => setExamplesOpen(v => !v)}
            >
              <div className="flex items-center gap-2">
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${examplesOpen ? 'rotate-90' : ''}`}/>
                <label className="block text-sm font-medium">Examples</label>
                <TooltipWrapper content="Click to expand. Inside, click an example to prefill the form.">
                  <Info className="h-4 w-4 text-muted-foreground cursor-help"/>
                </TooltipWrapper>
              </div>
              {loadingExamples && (
                <span className="text-xs text-muted-foreground">Loading…</span>
              )}
            </button>
            {examplesOpen && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                {!!examplesError && (
                  <div className="text-xs text-destructive mb-2">{examplesError}</div>
                )}
                {!loadingExamples && examples.length === 0 && (
                  <div className="text-xs text-muted-foreground">No examples available</div>
                )}
                {examples.length > 0 && (
                  <div className="space-y-3">
                    {/* GitHub */}
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-2">
                        <Github className="h-3 w-3"/> GitHub Repositories
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {examples.filter(e => 'git' in e.kind).map((ex, idx) => {
                          const repoPath = ex.url.replace('https://github.com/', '');
                          const topLine = ex.description.length ? ex.description : repoPath;
                          return (
                            <button
                              key={`git-${idx}`}
                              type="button"
                              onClick={() => {
                                setDeploymentMethod('git');
                                setGitRepoUrl(ex.url);
                                setBranch((ex.kind && (ex.kind as any)['git']) || 'main');
                                setBuildCommand(ex.buildCommand);
                                setOutputDir(ex.outputDir);
                                setEnvVarsText(ex.envVars || "");
                                setPendingScrollTo('git');
                              }}
                              className={`px-2 py-1 rounded border text-xs bg-background hover:bg-muted transition flex items-start gap-2 text-left`}
                            >
                              <div className="flex flex-col">
                                <span className="truncate max-w-[220px]">{topLine}</span>
                                <span className="font-mono text-muted-foreground truncate max-w-[220px]">{ex.url}</span>
                              </div>
                              <a
                                className="text-muted-foreground hover:text-foreground ml-auto"
                                href={ex.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link className="h-3 w-3"/>
                              </a>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Archives */}
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-2">
                        <Link className="h-3 w-3"/> Archives
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {examples.filter(e => 'archive' in e.kind).map((ex, idx) => {
                          const topLine = ex.description.length ? ex.description : 'Archive';
                          return (
                            <button
                              key={`arc-${idx}`}
                              type="button"
                              onClick={() => {
                                setDeploymentMethod('url');
                                setArchiveUrl(ex.url);
                                setBuildCommand(ex.buildCommand);
                                setOutputDir(ex.outputDir);
                                setEnvVarsText(ex.envVars || "");
                                setPendingScrollTo('url');
                              }}
                              className={`px-2 py-1 rounded border text-xs bg-background hover:bg-muted transition flex items-start gap-2 text-left`}
                            >
                              <div className="flex flex-col">
                                <span className="truncate max-w-[260px]">{topLine}</span>
                                <span className="font-mono text-muted-foreground truncate max-w-[260px]">{ex.url}</span>
                              </div>
                              <a
                                className="text-muted-foreground hover:text-foreground ml-auto"
                                href={ex.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link className="h-3 w-3"/>
                              </a>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Deployment Method Tabs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label className="block text-sm font-medium">Source type</label>
              <TooltipWrapper
                content="Choose how you want to deploy: upload a ZIP file, connect a GitHub repository, or provide a URL to an archive file.">
                <Info className="h-4 w-4 text-muted-foreground cursor-help"/>
              </TooltipWrapper>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-lg border p-1 bg-muted/30">
              <button
                type="button"
                onClick={() => setDeploymentMethod("zip")}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  deploymentMethod === "zip"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="h-4 w-4"/>
                <span className="hidden sm:inline">ZIP Upload</span>
                <span className="sm:hidden">ZIP</span>
              </button>
              <button
                type="button"
                onClick={() => setDeploymentMethod("git")}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  deploymentMethod === "git"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Github className="h-4 w-4"/>
                <span className="hidden sm:inline">GitHub</span>
                <span className="sm:hidden">Git</span>
              </button>
              <button
                type="button"
                onClick={() => setDeploymentMethod("url")}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  deploymentMethod === "url"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link className="h-4 w-4"/>
                <span className="hidden sm:inline">Archive URL</span>
                <span className="sm:hidden">URL</span>
              </button>
            </div>
          </div>

          {/* ZIP File Upload */}
          {deploymentMethod === "zip" && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <label className="block text-sm font-medium">
                  Application Package
                </label>
                <TooltipWrapper
                  content="Upload a ZIP file containing your built frontend application. The ZIP should include all necessary files and assets for your web application.">
                  <Info className="h-4 w-4 text-muted-foreground cursor-help"/>
                </TooltipWrapper>
              </div>
              <FileUploader
                onFileSelect={setFile}
                accept=".zip"
                maxSize={100 * 1024 * 1024} // 100MB
              />
            </div>
          )}

          {/* GitHub Repository */}
          {deploymentMethod === "git" && (
            <div className="space-y-4">
              <div ref={gitUrlSectionRef}>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium">
                    GitHub Repository URL
                  </label>
                  <TooltipWrapper
                    content="Enter the URL of your public GitHub repository. The repository should contain your frontend application source code.">
                    <Info className="h-4 w-4 text-muted-foreground cursor-help"/>
                  </TooltipWrapper>
                </div>
                <Input
                  value={gitRepoUrl}
                  onChange={(e) => setGitRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  required
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium">Branch</label>
                  <TooltipWrapper
                    content="The branch to deploy from. Usually 'main' or 'master' for production deployments.">
                    <Info className="h-4 w-4 text-muted-foreground cursor-help"/>
                  </TooltipWrapper>
                </div>
                <Input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  required
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}

          {/* Archive URL */}
          {deploymentMethod === "url" && (
            <div ref={archiveUrlSectionRef}>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-medium">
                  Archive URL
                </label>
                <TooltipWrapper
                  content="Enter the direct URL to your archive file. Supported formats: .zip, .tar.gz, .tgz">
                  <Info className="h-4 w-4 text-muted-foreground cursor-help"/>
                </TooltipWrapper>
              </div>
              <Input
                value={archiveUrl}
                onChange={(e) => setArchiveUrl(e.target.value)}
                placeholder="https://example.com/my-app.zip"
                required
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Supported formats: .zip, .tar.gz, .tgz
              </p>
            </div>
          )}

          {/* Build Command */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium">Build Command</label>
              <TooltipWrapper
                content="The command used to build your application. This should generate production-ready files in your output directory.">
                <Info className="h-4 w-4 text-muted-foreground cursor-help"/>
              </TooltipWrapper>
            </div>
            <Input
              value={buildCommand}
              onChange={(e) => setBuildCommand(e.target.value)}
              placeholder="npm run build"
              required
              className="font-mono text-sm"
            />
          </div>

          {/* Output Directory */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium">
                Output Directory
              </label>
              <TooltipWrapper
                content="The directory containing the built files after running the build command. Common examples: dist, build, out, public.">
                <Info className="h-4 w-4 text-muted-foreground cursor-help"/>
              </TooltipWrapper>
            </div>
            <Input
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
              placeholder="dist"
              required
              className="font-mono text-sm"
            />
          </div>

          {/* Environment Variables */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium">
                Environment Variables (Optional)
              </label>
              <TooltipWrapper
                content="Add environment variables that will be available during the build process. Use the .env file format with KEY=value pairs.">
                <Info className="h-4 w-4 text-muted-foreground cursor-help"/>
              </TooltipWrapper>
            </div>
            <textarea
              value={envVarsText}
              onChange={(e) => setEnvVarsText(e.target.value)}
              placeholder="VITE_API_URL=https://api.example.com&#10;VITE_APP_NAME=My App&#10;NODE_ENV=production"
              className={`w-full px-3 py-2 text-sm font-mono bg-background border rounded-md resize-none focus:outline-none focus:ring-2 ${
                envVarsError
                  ? "border-destructive focus:ring-destructive"
                  : "border-input focus:ring-ring"
              }`}
              rows={4}
            />
            {envVarsError && (
              <p className="text-xs text-destructive mt-1">{envVarsError}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Format: KEY=value (one per line). Lines starting with # are
              ignored.
            </p>
          </div>

          {/* Dry-Run Option */}
          <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50">
            <div className="flex items-start gap-3">
              <input
                id="isDryRun"
                type="checkbox"
                checked={isDryRun}
                onChange={(e) => setIsDryRun(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <label htmlFor="isDryRun" className="text-sm font-medium cursor-pointer">
                    Dry-Run (Test Build Only)
                  </label>
                  <TooltipWrapper
                    content="Test your build configuration without deploying to the Internet Computer. This validates your project builds correctly without spending cycles or affecting your live canister."
                  >
                    <Info className="h-4 w-4 text-muted-foreground cursor-help"/>
                  </TooltipWrapper>
                </div>
                <p className="text-xs text-muted-foreground">
                  When enabled, the build process will run but deployment to the canister will be skipped. 
                  Use this to verify your configuration works before committing to an actual deployment.
                </p>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div
            className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400"/>
              <h4 className="font-medium text-sm sm:text-base text-amber-800 dark:text-amber-200">
                Notes
              </h4>
            </div>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-amber-700 dark:text-amber-300">
              {!isDryRun && (
                <>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1 shrink-0"></span>
                    <span>
                      This deployment will replace the current version of your
                      application
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1 shrink-0"></span>
                    <span>
                      The canister may be briefly unavailable during the deployment
                      process
                    </span>
                  </li>
                </>
              )}
              {isDryRun && (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1 shrink-0"></span>
                  <span>
                    Dry-run mode: Your build will be tested but nothing will be deployed to the canister
                  </span>
                </li>
              )}
              {deploymentMethod === "zip" && (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1 shrink-0"></span>
                  <span>
                    Ensure your ZIP file includes all necessary assets and
                    dependencies
                  </span>
                </li>
              )}
              {deploymentMethod === "git" && (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1 shrink-0"></span>
                  <span>
                    Make sure your repository is public and accessible
                  </span>
                </li>
              )}
              {deploymentMethod === "url" && (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1 shrink-0"></span>
                  <span>
                    Ensure the archive URL is publicly accessible and contains your built application
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-3 sm:gap-0 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isDeploying}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                (deploymentMethod === "zip" && !file) ||
                (deploymentMethod === "git" && !gitRepoUrl) ||
                (deploymentMethod === "url" && !archiveUrl) ||
                isDeploying
              }
              className="flex items-center justify-center gap-2"
            >
              {isDeploying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"/>
                  <span className="hidden sm:inline">{isDryRun ? 'Testing Build...' : 'Deploying...'}</span>
                  <span className="sm:hidden">{isDryRun ? 'Testing...' : 'Deploy...'}</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4"/>
                  <span className="hidden sm:inline">{isDryRun ? 'Test Build' : 'Deploy Application'}</span>
                  <span className="sm:hidden">{isDryRun ? 'Test' : 'Deploy'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
