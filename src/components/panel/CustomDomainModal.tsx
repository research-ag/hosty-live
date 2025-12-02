import { useState, useEffect } from "react";
import {
  Globe,
  Info,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  BookOpen,
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

interface CustomDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  canister?: Canister | null;
}

type TabType = "configure" | "register";

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

  // Domain mapping check is advisory only (IPs change, CNAME flattening issues)
  const getDomainMappingIcon = (status: string) => {
    if (status === "valid") {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <Info className="h-4 w-4 text-muted-foreground" />;
  };

  const getDomainMappingMessage = (status: string) => {
    if (status === "valid") return "Detected";
    if (status === "missing") return "Not detected";
    return "Could not verify";
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

  const checkRegistrationStatus = async (domain: string) => {
    setIsCheckingStatus(true);
    try {
      const result = await customDomainApi.checkRegistrationStatus(domain);
      if (result.success && result.data) {
        setRegistrationStatus(result.data);

        // Show success message for registered domains
        if (result.data.status === "registered") {
          setError(""); // Clear any errors
          setSuccess("Domain successfully registered and active!");
        }
      } else {
        setSuccess(""); // Clear any status messages
        setError(result.error || "Failed to check registration status");
      }
    } catch (_err) {
      setSuccess(""); // Clear any status messages
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

    try {
      // Check if domain is already registered to this canister
      const existingRegistration =
        await customDomainApi.checkRegistrationStatus(registerDomain);

      if (
        existingRegistration.success &&
        existingRegistration.data?.canisterId === canister.id &&
        existingRegistration.data?.status === "registered"
      ) {
        // Domain already registered and working - just update ic-domains file
        await customDomainApi.uploadIcDomainsFile(canister.id, registerDomain);
        setSuccess("Domain is already registered to this canister!");
        setRegistrationStatus(existingRegistration.data);
        return;
      }

      // Handle registration/update
      if (hasExistingDomain && isDifferentDomain) {
        // Remove old domain from IC
        await customDomainApi.removeDomain(initialDomain);
      }

      // Register domain (uploads ic-domains + registers with IC)
      const result = await customDomainApi.addDomain(
        canister.id,
        registerDomain
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to register domain");
      }

      setSuccess("Domain registration submitted successfully!");
      await checkRegistrationStatus(registerDomain);
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
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-2">Configure DNS Records</p>
                  <p className="mb-2">
                    Add these 3 DNS records in your domain provider. Cloudflare
                    is recommended for fastest propagation (1-5 min vs 30+ min).
                  </p>
                  <ul className="space-y-1 text-xs ml-4 mb-3">
                    <li>
                      • <strong>Cloudflare:</strong> Set Proxy Status to "DNS
                      only" for all records
                    </li>
                    <li>
                      • TXT value format:{" "}
                      <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">
                        "canister-id"
                      </code>{" "}
                      (with quotes)
                    </li>
                  </ul>
                  <p className="text-xs">
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
                            <span className="text-sm">Domain mapping</span>
                            <div className="relative group">
                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-popover border rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                Advisory check only - IC validates at registration
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-2">
                            {checkCloudflareDnsIsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : checkCloudflareDns?.alias ? (
                              <>
                                {getDomainMappingIcon(
                                  checkCloudflareDns.alias.status
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {getDomainMappingMessage(
                                    checkCloudflareDns.alias.status
                                  )}
                                </span>
                              </>
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
                <Input
                  value={registerDomain}
                  onChange={(e) => setRegisterDomain(e.target.value)}
                  placeholder="example.com"
                  disabled={isLoading}
                  className="font-mono text-sm"
                />
                {registerDomain && !isValidDomain(registerDomain) && (
                  <p className="text-sm text-destructive mt-1">
                    Please enter a valid domain name
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isRegisterSubmitDisabled}
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="animate-spin rounded-full h-4 w-4 mr-2" />
                    Registering...
                  </div>
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
