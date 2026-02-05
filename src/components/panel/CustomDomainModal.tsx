import { useState, useEffect } from "react";
import {
  Globe,
  Info,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  BookOpen,
  Zap,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import psl from "psl";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { customDomainApi } from "../../services/api";
import { customDomainApi as customDomainApiV2 } from "../../api";
import { Canister } from "../../types";
import { CopyButton } from "../ui/CopyButton";
import { useQueryClient } from "@tanstack/react-query";
import { CustomDomain } from "../ui/CustomDomain";
import { isValidDomain } from "../../utils/domains";
import {
  configureDnsRecords,
  saveCredentials,
  loadCredentials,
  clearCredentials,
  type CloudflareCredentials,
  type DnsConfigResult,
} from "../../api/cloudflare";

interface CustomDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  canister?: Canister | null;
}

type TabType = "configure" | "register";

type DnsProvider = "cloudflare" | "route53" | "google" | "other";

const getDomainParts = (domain: string) => {
  if (!domain) return { isApex: false, subdomain: null, baseDomain: domain };

  const parsed = psl.parse(domain);
  return {
    isApex: !parsed.subdomain,
    subdomain: parsed.subdomain,
    baseDomain: parsed.domain,
  };
};

export function CustomDomainModal({
  isOpen,
  onClose,
  canister,
}: CustomDomainModalProps) {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>("configure");
  const [domain, setDomain] = useState("");
  const [registerDomain, setRegisterDomain] = useState("");
  const [initialDomain, setInitialDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [showDnsCheck, setShowDnsCheck] = useState(false);

  // Domain registration mode detection
  const [domainRegistrationInfo, setDomainRegistrationInfo] = useState<{
    isRegistered: boolean;
    registeredCanisterId: string | null;
    isOwnCanister: boolean;
  } | null>(null);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);

  // DNS Provider selection
  const [dnsProvider, setDnsProvider] = useState<DnsProvider>("cloudflare");

  // Cloudflare auto-configure state
  const [showCloudflare, setShowCloudflare] = useState(false);
  const [cfApiToken, setCfApiToken] = useState("");
  const [cfZoneId, setCfZoneId] = useState("");
  const [cfSaveCredentials, setCfSaveCredentials] = useState(true);
  const [cfShowToken, setCfShowToken] = useState(false);
  const [cfIsConfiguring, setCfIsConfiguring] = useState(false);
  const [cfResults, setCfResults] = useState<DnsConfigResult[] | null>(null);
  const [cfError, setCfError] = useState("");

  const { domainFromIcDomains } =
    customDomainApiV2.fetchDomainFromIcDomains.useQuery(
      {
        canisterId: canister?.id ?? "",
      },
      { enabled: !!canister?.id }
    );

  const { domainCheckResult, domainCheckResultIsLoading } =
    customDomainApiV2.checkCustomDomain.useQuery(
      {
        canisterId: canister?.id ?? "",
      },
      { enabled: !!canister?.id && !!domainFromIcDomains }
    );

  const {
    checkCloudflareDns,
    checkCloudflareDnsIsLoading,
    checkCloudflareDnsRefetch,
  } = customDomainApiV2.checkCloudflareDns.useQuery(
    {
      domain: domain,
      expectedCanisterId: canister?.id ?? "",
    },
    { enabled: false }
  );

  const handleDnsCheck = async () => {
    if (!domain || !isValidDomain(domain)) return;

    setShowDnsCheck(true);
    await checkCloudflareDnsRefetch();
  };

  const getDnsStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "missing":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "wrong_target":
      case "wrong_value":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getDnsStatusMessage = (status: string) => {
    switch (status) {
      case "valid":
        return "Configured correctly";
      case "missing":
        return "Record not found";
      case "wrong_target":
      case "wrong_value":
        return "Incorrect value";
      default:
        return "Unknown status";
    }
  };

  // Domain mapping - we just show what's configured (can't verify IPs from browser)
  const getDomainMappingDisplay = (result: {
    status: string;
    values?: string[];
  }) => {
    if (result.status === "missing") {
      return {
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
        message: "Not configured",
      };
    }
    // Show configured IPs
    const ips = result.values?.join(", ") || "Unknown";
    return {
      icon: <Info className="shrink-0 h-4 w-4 text-blue-500" />,
      message: ips,
    };
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setActiveTab("configure");
      setDomain(domainFromIcDomains ?? "");
      setRegisterDomain(domainFromIcDomains ?? "");
      setInitialDomain(domainFromIcDomains ?? "");
      setError("");
      setSuccess("");
      setRegistrationStatus(null);
      setIsCheckingStatus(false);
      setShowDnsCheck(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, canister?.id]);

  useEffect(() => {
    setDomain(domainFromIcDomains ?? "");
    setRegisterDomain(domainFromIcDomains ?? "");
    setInitialDomain(domainFromIcDomains ?? "");
  }, [domainFromIcDomains]);

  useEffect(() => {
    setShowDnsCheck(false);
  }, [domain]);

  // Check if domain is already registered when registerDomain changes
  useEffect(() => {
    const checkDomainRegistration = async () => {
      if (!registerDomain || !isValidDomain(registerDomain) || !canister?.id) {
        setDomainRegistrationInfo(null);
        return;
      }

      setIsCheckingRegistration(true);
      try {
        const result = await customDomainApi.checkRegistrationStatus(
          registerDomain
        );
        if (result.success && result.data?.status) {
          const isOwnCanister = result.data.canisterId === canister.id;
          setDomainRegistrationInfo({
            isRegistered: true,
            registeredCanisterId: result.data.canisterId || null,
            isOwnCanister,
          });
        } else {
          setDomainRegistrationInfo({
            isRegistered: false,
            registeredCanisterId: null,
            isOwnCanister: false,
          });
        }
      } catch {
        setDomainRegistrationInfo({
          isRegistered: false,
          registeredCanisterId: null,
          isOwnCanister: false,
        });
      } finally {
        setIsCheckingRegistration(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkDomainRegistration, 500);
    return () => clearTimeout(timeoutId);
  }, [registerDomain, canister?.id]);

  // Load saved Cloudflare credentials on mount
  useEffect(() => {
    const saved = loadCredentials();
    if (saved) {
      setCfApiToken(saved.apiToken);
      setCfZoneId(saved.zoneId);
    }
  }, []);

  const handleCloudflareConfig = async () => {
    if (!cfApiToken || !cfZoneId || !domain || !canister?.id) return;

    setCfIsConfiguring(true);
    setCfError("");
    setCfResults(null);

    const credentials: CloudflareCredentials = {
      apiToken: cfApiToken,
      zoneId: cfZoneId,
    };

    try {
      // Save credentials if checkbox is checked
      if (cfSaveCredentials) {
        saveCredentials(credentials);
      }

      // Configure DNS records via backend
      const { isApex, subdomain } = getDomainParts(domain);
      const results = await configureDnsRecords(
        credentials,
        domain,
        canister.id,
        isApex,
        subdomain
      );

      setCfResults(results);

      // Check if all succeeded
      const allSuccess = results.every((r) => r.success);
      if (allSuccess) {
        // Refresh DNS check after short delay
        setTimeout(() => {
          checkCloudflareDnsRefetch();
        }, 2000);
      }
    } catch (err) {
      setCfError(err instanceof Error ? err.message : "Configuration failed");
    } finally {
      setCfIsConfiguring(false);
    }
  };

  const handleClearCredentials = () => {
    clearCredentials();
    setCfApiToken("");
    setCfZoneId("");
  };

  const checkRegistrationStatus = async (
    domain: string,
    expectedCanisterId: string
  ) => {
    setIsCheckingStatus(true);
    try {
      const result = await customDomainApi.checkRegistrationStatus(domain);
      if (result.success && result.data) {
        setRegistrationStatus(result.data);

        // Verify the domain is registered to the expected canister
        if (result.data.status === "registered") {
          if (result.data.canisterId === expectedCanisterId) {
            setError("");
            setSuccess("Domain successfully registered and active!");
          } else {
            // Domain is registered but to a different canister - DNS TXT record mismatch
            setSuccess("");
            setError(
              `DNS mismatch: Domain is registered to ${result.data.canisterId}, not this canister. ` +
                `Update your _canister-id TXT record to "${expectedCanisterId}" and try again.`
            );
          }
        } else if (result.data.status === "registering") {
          setError("");
          setSuccess(
            "Domain registration in progress. SSL certificate is being issued."
          );
        }
      } else {
        setSuccess("");
        setError(result.error || "Failed to check registration status");
      }
    } catch (_err) {
      setSuccess("");
      setError("Failed to check registration status");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canister?.id || !registerDomain || !isValidDomain(registerDomain))
      return;

    setIsLoading(true);
    setError("");
    setSuccess("");
    setRegistrationStatus(null);

    const hasExistingDomain = !!initialDomain && isValidDomain(initialDomain);
    const isDifferentDomain = registerDomain !== initialDomain;

    // Determine if this is an update (domain already registered)
    const isUpdate = domainRegistrationInfo?.isRegistered ?? false;

    try {
      // If domain is registered to this canister and already "registered" status - just sync ic-domains
      if (
        domainRegistrationInfo?.isRegistered &&
        domainRegistrationInfo?.isOwnCanister
      ) {
        // Check current status
        const statusCheck = await customDomainApi.checkRegistrationStatus(
          registerDomain
        );
        if (statusCheck.success && statusCheck.data?.status === "registered") {
          await customDomainApi.uploadIcDomainsFile(
            canister.id,
            registerDomain
          );
          setSuccess("Domain is already registered to this canister!");
          setRegistrationStatus(statusCheck.data);
          return;
        }
      }

      // Handle old domain removal if switching domains
      if (hasExistingDomain && isDifferentDomain) {
        await customDomainApi.removeDomain(initialDomain);
      }

      // Register or update domain (uploads ic-domains + registers/updates with IC)
      const result = await customDomainApi.addDomain(
        canister.id,
        registerDomain,
      );

      if (!result.success) {
        throw new Error(
          result.error || `Failed to ${isUpdate ? "update" : "register"} domain`
        );
      }

      setSuccess(
        `Domain ${isUpdate ? "update" : "registration"} submitted successfully!`
      );
      await checkRegistrationStatus(registerDomain, canister.id);
    } catch (err) {
      setSuccess("");
      setError(err instanceof Error ? err.message : "Failed to process domain");
    } finally {
      // Always refresh (ic-domains may have changed)
      queryClient.invalidateQueries({
        queryKey: ["check-cloudflare-dns"],
      });
      queryClient.invalidateQueries({
        queryKey: ["domain-from-ic-domains", canister.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["domain-check-result", canister.id],
      });

      setIsLoading(false);
    }
  };

  const isRegisterSubmitDisabled =
    !registerDomain || !isValidDomain(registerDomain) || isLoading;

  const displayDomain = domain || "<domain>";

  const getDnsRecords = () => {
    const displayCanisterId = canister?.id || "<canister-id>";
    const { isApex, subdomain } = getDomainParts(domain);

    // Cloudflare supports CNAME for apex domains (CNAME flattening)
    const domainName = domain ? (isApex ? "@" : subdomain) : "@ or subdomain";

    const cnameName = domain
      ? isApex
        ? "_acme-challenge"
        : `_acme-challenge.${subdomain}`
      : "_acme-challenge or _acme-challenge.subdomain";

    const cnameValue = domain
      ? `_acme-challenge.${displayDomain}.icp2.io.`
      : "_acme-challenge.yourdomain.com.icp2.io.";

    const txtName = domain
      ? isApex
        ? "_canister-id"
        : `_canister-id.${subdomain}`
      : "_canister-id or _canister-id.subdomain";

    return [
      {
        type: "CNAME",
        name: domainName,
        value: "icp1.io",
        description: "Domain mapping",
      },
      {
        type: "CNAME",
        name: cnameName,
        value: cnameValue,
        description: "ACME challenge",
      },
      {
        type: "TXT",
        name: txtName,
        value: `"${displayCanisterId}"`,
        description: "Canister ID",
      },
    ];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Custom Domain"
      className="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex rounded-lg border p-1 bg-muted/30">
          <button
            type="button"
            onClick={() => setActiveTab("configure")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "configure"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Configure DNS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "register"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Settings className="h-4 w-4" />
            Register
          </button>
        </div>

        {/* Configure DNS Tab */}
        {activeTab === "configure" && (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300 w-full">
                  <p className="font-medium mb-2">Configure DNS Records</p>
                  <p className="mb-3">
                    Add these 3 DNS records in your DNS provider. Select your provider below to see tailored steps.
                  </p>

                  {/* Provider selector */}
                  <div className="flex rounded-md border bg-white/60 dark:bg-slate-900/40 overflow-hidden w-full max-w-xl mb-3">
                    {(
                      [
                        { id: "cloudflare", label: "Cloudflare" },
                        { id: "route53", label: "AWS Route 53" },
                        { id: "google", label: "Google Cloud DNS" },
                        { id: "other", label: "Other" },
                      ] as { id: DnsProvider; label: string }[]
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setDnsProvider(p.id)}
                        className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                          dnsProvider === p.id
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted/60"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Provider-specific instructions */}
                  {dnsProvider === "cloudflare" && (
                    <div className="text-xs space-y-1.5">
                      <p className="font-medium">Cloudflare</p>
                      <ol className="list-decimal ml-4 space-y-1.5">
                        <li>Open your zone in Cloudflare Dashboard → DNS.</li>
                        <li>Create the 3 records shown below (CNAME alias, CNAME for _acme-challenge, and TXT for canister-id).</li>
                        <li>Set Proxy Status to <strong>DNS only</strong> for both CNAME records (disable orange cloud).</li>
                        <li>Click "Check DNS" below to verify propagation, then proceed to Register.</li>
                      </ol>
                    </div>
                  )}
                  {dnsProvider === "route53" && (
                    <div className="text-xs space-y-1.5">
                      <p className="font-medium">AWS Route 53</p>
                      <ol className="list-decimal ml-4 space-y-1.5">
                        <li>Open Route 53 → Hosted zones → select your zone.</li>
                        <li>Create a <strong>CNAME</strong> record for the domain (or subdomain) pointing to the alias value shown below. For apex domains, Route 53 supports CNAME-like behavior via alias/flattening — a standard CNAME also works when not using AWS load balancers.</li>
                        <li>Create a <strong>CNAME</strong> record for <code>_acme-challenge</code> pointing to the ACME target shown below.</li>
                        <li>Create a <strong>TXT</strong> record with name shown below and value <code>"canister-id"</code> (include the quotes).</li>
                        <li>Routing policy: <em>Simple</em>. TTL: e.g. 60s–300s.</li>
                        <li>Click "Check DNS" below to verify propagation, then proceed to Register.</li>
                      </ol>
                    </div>
                  )}
                  {dnsProvider === "google" && (
                    <div className="text-xs space-y-1.5">
                      <p className="font-medium">Google Cloud DNS</p>
                      <ol className="list-decimal ml-4 space-y-1.5">
                        <li>Open Cloud DNS → Managed zones → select your zone.</li>
                        <li>Add a <strong>CNAME</strong> record for your domain (or subdomain) pointing to the alias value shown below.</li>
                        <li>Add a <strong>CNAME</strong> record for <code>_acme-challenge</code> pointing to the ACME target shown below.</li>
                        <li>Add a <strong>TXT</strong> record with name shown below and value <code>"canister-id"</code> (include the quotes).</li>
                        <li>TTL: e.g. 60s–300s. Propagation may take several minutes.</li>
                        <li>Click "Check DNS" below to verify propagation, then proceed to Register.</li>
                      </ol>
                    </div>
                  )}
                  {dnsProvider === "other" && (
                    <div className="text-xs space-y-1.5">
                      <p className="font-medium">Other providers</p>
                      <ol className="list-decimal ml-4 space-y-1.5">
                        <li>Create the 3 records shown below exactly as displayed.</li>
                        <li>Ensure no proxy/CDN is enabled for the CNAME records (they must resolve directly).</li>
                        <li>Keep the TXT value wrapped in quotes: <code>"canister-id"</code>.</li>
                        <li>After saving, use "Check DNS" below to confirm propagation before registering.</li>
                      </ol>
                    </div>
                  )}

                  <p className="text-xs mt-3">
                    <a
                      href="https://internetcomputer.org/docs/current/developer-docs/web-apps/custom-domains/using-custom-domains"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                    >
                      View full documentation →
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Domain Input for DNS Preview */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Domain Name{" "}
                <span className="text-muted-foreground">(for DNS preview)</span>
              </label>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter your domain to see the exact DNS records you need to
                configure
              </p>
            </div>

            {/* DNS Records Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Required DNS Records</h3>
                {domain && isValidDomain(domain) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDnsCheck}
                    disabled={checkCloudflareDnsIsLoading}
                    className="text-xs h-7"
                  >
                    {checkCloudflareDnsIsLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Check DNS
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b">
                  <div
                    className="grid gap-4 text-xs font-medium text-muted-foreground"
                    style={{ gridTemplateColumns: "1fr 2fr 2fr 2fr" }}
                  >
                    <div>Type</div>
                    <div>Name</div>
                    <div>Value</div>
                    <div>Description</div>
                  </div>
                </div>
                <div className="divide-y">
                  {getDnsRecords().map((record, index) => (
                    <div key={index} className="px-4 py-3">
                      <div
                        className="grid gap-4 text-sm"
                        style={{ gridTemplateColumns: "1fr 2fr 2fr 2fr" }}
                      >
                        <div className="font-mono font-medium">
                          {record.type}
                        </div>
                        <div className="flex items-center w-full gap-1">
                          <div
                            className={`flex-1 font-mono text-xs break-all ${
                              !domain
                                ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1 py-0.5 rounded"
                                : ""
                            }`}
                          >
                            {record.name}
                          </div>
                          {domain && (
                            <CopyButton
                              text={record.name}
                              size="icon"
                              buttonClassName="w-5 h-5"
                            />
                          )}
                        </div>
                        <div className="flex items-center w-full gap-1">
                          <div
                            className={`flex-1 font-mono text-xs break-all ${
                              !domain || !canister?.id
                                ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1 py-0.5 rounded"
                                : ""
                            }`}
                          >
                            {record.value}
                          </div>
                          {domain && (
                            <CopyButton
                              text={record.value}
                              size="icon"
                              buttonClassName="w-5 h-5"
                            />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {record.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cloudflare Auto-Configure Section */}
            {dnsProvider === "cloudflare" && (
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowCloudflare(!showCloudflare)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 hover:from-orange-100 hover:to-amber-100 dark:hover:from-orange-950/50 dark:hover:to-amber-950/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">
                    Auto-configure with Cloudflare API
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (optional)
                  </span>
                </div>
                {showCloudflare ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {showCloudflare && (
                <div className="p-4 space-y-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Enter your Cloudflare API credentials to automatically
                    create DNS records. Credentials are stored locally in your
                    browser only.
                  </p>

                  {/* API Token */}
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      API Token
                    </label>
                    <div className="relative">
                      <Input
                        type={cfShowToken ? "text" : "password"}
                        value={cfApiToken}
                        onChange={(e) => setCfApiToken(e.target.value)}
                        placeholder="Enter Cloudflare API token"
                        className="font-mono text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setCfShowToken(!cfShowToken)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {cfShowToken ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Zone ID */}
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Zone ID
                    </label>
                    <Input
                      value={cfZoneId}
                      onChange={(e) => setCfZoneId(e.target.value)}
                      placeholder="Enter Zone ID (32-char hex)"
                      className="font-mono text-xs"
                    />
                  </div>

                  {/* Options */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={cfSaveCredentials}
                        onChange={(e) => setCfSaveCredentials(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span>Remember credentials in browser</span>
                    </label>

                    {(cfApiToken || cfZoneId) && (
                      <button
                        type="button"
                        onClick={handleClearCredentials}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        Clear saved
                      </button>
                    )}
                  </div>

                  {/* Configure Button */}
                  <Button
                    type="button"
                    onClick={handleCloudflareConfig}
                    disabled={
                      !cfApiToken ||
                      !cfZoneId ||
                      !domain ||
                      !isValidDomain(domain) ||
                      !canister?.id ||
                      cfIsConfiguring
                    }
                    className="w-full"
                    variant="outline"
                  >
                    {cfIsConfiguring ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Configuring...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Configure DNS Records
                      </>
                    )}
                  </Button>

                  {/* Error */}
                  {cfError && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                      {cfError}
                    </div>
                  )}

                  {/* Results */}
                  {cfResults && (
                    <div className="space-y-2">
                      {cfResults.map((result, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2 rounded text-sm ${
                            result.success
                              ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                              : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            <span>{result.record}</span>
                          </div>
                          <span className="text-xs">{result.message}</span>
                        </div>
                      ))}

                      {cfResults.every((r) => r.success) && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          ✓ All DNS records configured! Propagation takes 1-5
                          minutes.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Help Links */}
                  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                    <p>
                      <a
                        href="https://dash.cloudflare.com/profile/api-tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:no-underline"
                      >
                        Create API Token →
                      </a>{" "}
                      (requires Zone:DNS:Edit permission)
                    </p>
                    <p>
                      Zone ID is in your Cloudflare dashboard → Domain → right
                      sidebar
                    </p>
                  </div>
                </div>
              )}
            </div>
            )}
            
            {showDnsCheck && domain && isValidDomain(domain) && (
              <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  DNS Propagation Status
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                  Checking DNS records via Cloudflare recursive resolver
                </p>

                {/* DNS Status Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-blue-200 dark:border-blue-800">
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                          Record
                        </th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground w-32 sm:w-48">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100 dark:divide-blue-900">
                      {/* CNAME Domain mapping Row (advisory check) */}
                      <tr>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-mono bg-muted px-2 py-1 rounded shrink-0">
                              CNAME
                            </div>
                            <div>
                              <span className="text-sm">Domain mapping</span>
                              <p className="text-xs text-muted-foreground">
                                Resolved IPs · IC validates at registration
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-2">
                            {checkCloudflareDnsIsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : checkCloudflareDns?.alias ? (
                              (() => {
                                const display = getDomainMappingDisplay(
                                  checkCloudflareDns.alias
                                );
                                return (
                                  <>
                                    {display.icon}
                                    <span className="text-sm text-muted-foreground font-mono">
                                      {display.message}
                                    </span>
                                  </>
                                );
                              })()
                            ) : null}
                          </div>
                        </td>
                      </tr>

                      {/* CNAME ACME challenge Row */}
                      <tr>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-mono bg-muted px-2 py-1 rounded shrink-0">
                              CNAME
                            </div>
                            <span className="text-sm">ACME challenge</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-2">
                            {checkCloudflareDnsIsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : checkCloudflareDns?.acmeChallenge ? (
                              <>
                                {getDnsStatusIcon(
                                  checkCloudflareDns.acmeChallenge.status
                                )}
                                <span className="text-sm">
                                  {getDnsStatusMessage(
                                    checkCloudflareDns.acmeChallenge.status
                                  )}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>

                      {/* TXT Record Row */}
                      <tr>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-mono bg-muted px-2 py-1 rounded shrink-0">
                              TXT
                            </div>
                            <span className="text-sm">Canister ID</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-2">
                            {checkCloudflareDnsIsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : checkCloudflareDns?.canisterId ? (
                              <>
                                {getDnsStatusIcon(
                                  checkCloudflareDns.canisterId.status
                                )}
                                <span className="text-sm">
                                  {getDnsStatusMessage(
                                    checkCloudflareDns.canisterId.status
                                  )}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Additional Notes */}
            <div className="bg-muted/30 border rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Important Notes</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1 shrink-0"></span>
                  <span>
                    <strong>Cloudflare:</strong> Set Proxy Status to "DNS only"
                    (disable orange cloud) for all 3 records
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1 shrink-0"></span>
                  <span>
                    DNS propagation: 1-5 minutes (Cloudflare), up to 30 minutes
                    (other providers)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1 shrink-0"></span>
                  <span>
                    Click "Check DNS" to verify propagation before registering
                  </span>
                </li>
              </ul>
            </div>

            {/* Action Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={() => {
                  if (domain && isValidDomain(domain)) {
                    setRegisterDomain(domain);
                  }
                  setActiveTab("register");
                }}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Proceed to Registration
              </Button>
            </div>
          </div>
        )}

        {/* Register Tab */}
        {activeTab === "register" && (
          <div className="space-y-6">
            {/* Tip Section */}
            <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p>
                    Configure DNS records first (see Configure DNS tab), then
                    return here to register.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Current domain */}
              {!!domainFromIcDomains && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Current Custom Domain
                  </label>
                  <CustomDomain
                    domain={domainFromIcDomains}
                    checkResult={domainCheckResult}
                    isLoading={domainCheckResultIsLoading}
                  />
                </div>
              )}

              {/* Domain Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  New Custom Domain
                </label>
                <div className="relative">
                  <Input
                    value={registerDomain}
                    onChange={(e) => setRegisterDomain(e.target.value)}
                    placeholder="example.com"
                    disabled={isLoading}
                    className="font-mono text-sm"
                  />
                  {isCheckingRegistration && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                {registerDomain && !isValidDomain(registerDomain) && (
                  <p className="text-sm text-destructive mt-1">
                    Please enter a valid domain name
                  </p>
                )}
                {/* Registration status info */}
                {registerDomain &&
                  isValidDomain(registerDomain) &&
                  domainRegistrationInfo &&
                  !isCheckingRegistration && (
                    <div className="mt-2">
                      {domainRegistrationInfo.isRegistered ? (
                        domainRegistrationInfo.isOwnCanister ? (
                          <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Domain already registered to this canister. Will
                            refresh.
                          </p>
                        ) : (
                          <p className="text-sm text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>
                              Domain registered to{" "}
                              <span className="font-mono text-xs">
                                {domainRegistrationInfo.registeredCanisterId}
                              </span>
                              . Update DNS{" "}
                              <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
                                _canister-id
                              </code>{" "}
                              TXT record first.
                            </span>
                          </p>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5" />
                          New domain. Will register.
                        </p>
                      )}
                    </div>
                  )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isRegisterSubmitDisabled || isCheckingRegistration}
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="animate-spin rounded-full h-4 w-4 mr-2" />
                    {domainRegistrationInfo?.isRegistered
                      ? "Updating..."
                      : "Registering..."}
                  </div>
                ) : domainRegistrationInfo?.isRegistered ? (
                  "Update Domain"
                ) : (
                  "Register Domain"
                )}
              </Button>

              {error && (
                <div className="p-3 break-all text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 break-all text-sm text-green-800 bg-green-100 border border-green-300 rounded-md">
                  {success}
                </div>
              )}

              {/* Registration Status */}
              {registrationStatus && (
                <div className="mt-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Registration Status
                    </span>
                    {isCheckingStatus && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Domain:</span>{" "}
                      {registrationStatus.domain}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Canister:</span>{" "}
                      {registrationStatus.canisterId}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <span
                        className={`font-medium ${
                          registrationStatus.status === "registered"
                            ? "text-green-600"
                            : registrationStatus.status === "registering"
                            ? "text-blue-600"
                            : registrationStatus.status === "failed"
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {registrationStatus.status}
                      </span>
                    </div>
                    {registrationStatus.message && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {registrationStatus.message}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
}
