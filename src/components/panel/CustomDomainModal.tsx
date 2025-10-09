import { useState, useEffect } from "react";
import {
  Globe,
  Info,
  ExternalLink,
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
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState<any>(null);
  const [dnsSuccess, setDnsSuccess] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [showDnsCheck, setShowDnsCheck] = useState(false);

  const { domainFromIcDomains } =
    customDomainApiV2.fetchDomainFromIcDomains.useQuery(
      {
        canisterId: canister?.icCanisterId ?? "",
      },
      { enabled: !!canister?.icCanisterId }
    );

  const { domainCheckResult, domainCheckResultIsLoading } =
    customDomainApiV2.checkCustomDomain.useQuery(
      {
        canisterId: canister?.icCanisterId ?? "",
      },
      { enabled: !!canister?.icCanisterId && !!domainFromIcDomains }
    );

  const {
    aliasRecordValidationRes,
    aliasRecordValidationResIsLoading,
    aliasRecordValidationResRefetch,
  } = customDomainApiV2.validateAliasRecord.useQuery(
    {
      domain: domain,
    },
    { enabled: false }
  );

  const {
    canisterIdRecordValidationRes,
    canisterIdRecordValidationResIsLoading,
    canisterIdRecordValidationResRefetch,
  } = customDomainApiV2.validateCanisterIdRecord.useQuery(
    {
      domain: domain,
      expectedCanisterId: canister?.icCanisterId ?? "",
    },
    { enabled: false }
  );

  const {
    acmeChallengeRecordValidationRes,
    acmeChallengeRecordValidationResIsLoading,
    acmeChallengeRecordValidationResRefetch,
  } = customDomainApiV2.validateAcmeChallengeRecord.useQuery(
    {
      domain: domain,
    },
    { enabled: false }
  );

  const {
    checkNamecheapDns,
    checkNamecheapDnsIsLoading,
    checkNamecheapDnsRefetch,
  } = customDomainApiV2.checkNamecheapDns.useQuery(
    {
      domain: domain,
      expectedCanisterId: canister?.icCanisterId ?? "",
    },
    { enabled: false }
  );

  console.log("=== checkNamecheapDns", checkNamecheapDns);
  const isAnyDnsCheckLoading =
    aliasRecordValidationResIsLoading ||
    canisterIdRecordValidationResIsLoading ||
    acmeChallengeRecordValidationResIsLoading ||
    checkNamecheapDnsIsLoading;

  const handleDnsCheck = async () => {
    if (!domain || !isValidDomain(domain)) return;

    setShowDnsCheck(true);

    // Trigger all DNS checks
    await Promise.all([
      aliasRecordValidationResRefetch(),
      canisterIdRecordValidationResRefetch(),
      acmeChallengeRecordValidationResRefetch(),
      checkNamecheapDnsRefetch(),
    ]);
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
        return "Not pointing to ICP";
      case "wrong_value":
        return "Incorrect value";
      default:
        return "Unknown status";
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setActiveTab("configure");
      setDomain(domainFromIcDomains ?? "");
      setRegisterDomain(domainFromIcDomains ?? "");
      setInitialDomain(domainFromIcDomains ?? "");
      setError("");
      setRequestId("");
      setRegistrationStatus(null);
      setDnsSuccess(false);
      setIsCheckingStatus(false);
      setShowDnsCheck(false);

      // Fetch current domain
      if (canister?.icCanisterId) {
        fetchCurrentDomain();
      }
    }
  }, [isOpen, canister?.icCanisterId]);

  useEffect(() => {
    setDomain(domainFromIcDomains ?? "");
    setRegisterDomain(domainFromIcDomains ?? "");
    setInitialDomain(domainFromIcDomains ?? "");
  }, [domainFromIcDomains]);

  useEffect(() => {
    setShowDnsCheck(false);
  }, [domain]);

  const fetchCurrentDomain = async () => {
    if (!canister?.icCanisterId) return;

    setIsLoadingInitial(true);
    try {
      const currentDomain = await customDomainApi.getCurrentDomain(
        canister.icCanisterId
      );
      if (currentDomain) {
        setRegisterDomain(currentDomain);
        setInitialDomain(currentDomain);
      }
    } catch (err) {
      // Silently fail, just use empty string
    } finally {
      setIsLoadingInitial(false);
    }
  };

  const checkRegistrationStatus = async (reqId: string) => {
    setIsCheckingStatus(true);
    try {
      const result = await customDomainApi.checkRegistrationStatus(reqId);
      if (result.success) {
        setRegistrationStatus(result.data);
      } else {
        setError(result.error || "Failed to check registration status");
      }
    } catch (err) {
      setError("Failed to check registration status");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !canister?.icCanisterId ||
      !registerDomain ||
      !isValidDomain(registerDomain)
    )
      return;

    setIsLoading(true);
    setError("");
    setRequestId("");
    setRegistrationStatus(null);
    setDnsSuccess(false);

    const isCheckStatus =
      !!initialDomain &&
      registerDomain === initialDomain &&
      isValidDomain(initialDomain);

    try {
      const [aliasResult, txtResult, cnameResult] = await Promise.all([
        customDomainApiV2.validateAliasRecord.fetch(queryClient, {
          domain: registerDomain,
        }),
        customDomainApiV2.validateCanisterIdRecord.fetch(queryClient, {
          domain: registerDomain,
          expectedCanisterId: canister.icCanisterId,
        }),
        customDomainApiV2.validateAcmeChallengeRecord.fetch(queryClient, {
          domain: registerDomain,
        }),
      ]);

      const dnsInvalid =
        aliasResult.status !== "valid" ||
        txtResult.status !== "valid" ||
        cnameResult.status !== "valid";

      if (dnsInvalid) {
        const errorMessages: string[] = [];

        if (aliasResult.status !== "valid")
          errorMessages.push(`ALIAS record: ${aliasResult.status}`);
        if (txtResult.status !== "valid")
          errorMessages.push(`TXT record: ${txtResult.status}`);
        if (cnameResult.status !== "valid")
          errorMessages.push(`CNAME record: ${cnameResult.status}`);

        throw new Error(`DNS pre-check error: ${errorMessages.join(", ")}`);
      }

      setDnsSuccess(true);

      const result = await customDomainApi.addDomain(
        canister.icCanisterId,
        registerDomain,
        isCheckStatus
      );

      queryClient.invalidateQueries({
        queryKey: ["alias-record-validation-res", registerDomain],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "canister-id-record-validation-res",
          registerDomain,
          canister.icCanisterId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["acme-challenge-record-validation-res", registerDomain],
      });
      queryClient.invalidateQueries({
        queryKey: ["domain-from-ic-domains", canister.icCanisterId],
      });
      queryClient.invalidateQueries({
        queryKey: ["domain-check-result", canister.icCanisterId],
      });

      if (result.success && result.requestId) {
        setRequestId(result.requestId);
        // Immediately check status
        await checkRegistrationStatus(result.requestId);
      } else {
        setError(result.error || "Failed to register domain");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to register domain"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isRegisterSubmitDisabled =
    !registerDomain ||
    !isValidDomain(registerDomain) ||
    isLoading ||
    isLoadingInitial;
  const isCheckStatus =
    initialDomain &&
    registerDomain === initialDomain &&
    isValidDomain(initialDomain);
  const submitButtonText = isCheckStatus
    ? "Register Domain (check)"
    : "Register Domain";

  const displayDomain = domain || "<domain>";

  const getDnsRecords = () => {
    const displayCanisterId = canister?.icCanisterId || "<canister-id>";

    const { isApex, subdomain } = getDomainParts(domain);

    // Generate names based on apex/subdomain
    const aliasName = domain ? (isApex ? "@" : subdomain) : "@ or subdomain";
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
        type: "ALIAS",
        name: aliasName,
        value: "icp1.io.",
        description: "Domain mapping",
      },
      {
        type: "CNAME",
        name: cnameName,
        value: cnameValue,
        description: "SSL certificate validation",
      },
      {
        type: "TXT",
        name: txtName,
        value: displayCanisterId,
        description: "Canister ID verification",
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
                  <p className="font-medium mb-2">DNS Configuration Required</p>
                  <p className="mb-3">
                    Before registering your domain, you must configure these DNS
                    records with your domain provider:
                  </p>
                  <p>
                    For detailed setup instructions, visit:{" "}
                    <a
                      href="https://internetcomputer.org/docs/building-apps/frontends/custom-domains/dns-setup"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors underline"
                    >
                      DNS Setup Guide
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
                    disabled={isAnyDnsCheckLoading}
                    className="text-xs h-7"
                  >
                    {isAnyDnsCheckLoading ? (
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
                              !domain || !canister?.icCanisterId
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
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  DNS Configuration Status
                </h4>

                {/* DNS Status Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-blue-200 dark:border-blue-800">
                        <th className="text-left py-2 px-2 font-medium text-muted-foreground">
                          Record
                        </th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground w-20 sm:w-44">
                          Namecheap
                        </th>
                        <th className="text-center py-2 px-2 font-medium text-muted-foreground w-20 sm:w-44">
                          Propagated
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100 dark:divide-blue-900">
                      {/* ALIAS Record Row */}
                      <tr>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-mono bg-muted px-2 py-1 rounded shrink-0">
                              ALIAS
                            </div>
                            <span className="text-sm">Domain mapping</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            {checkNamecheapDnsIsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : checkNamecheapDns?.alias ? (
                              <>
                                {getDnsStatusIcon(
                                  checkNamecheapDns.alias.status
                                )}
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  {getDnsStatusMessage(
                                    checkNamecheapDns.alias.status
                                  )}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            {aliasRecordValidationResIsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : aliasRecordValidationRes ? (
                              <>
                                {getDnsStatusIcon(
                                  aliasRecordValidationRes.status
                                )}
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  {getDnsStatusMessage(
                                    aliasRecordValidationRes.status
                                  )}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>

                      {/* CNAME Record Row */}
                      <tr>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-mono bg-muted px-2 py-1 rounded shrink-0">
                              CNAME
                            </div>
                            <span className="text-sm">
                              SSL certificate validation
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            {checkNamecheapDnsIsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : checkNamecheapDns?.acmeChallenge ? (
                              <>
                                {getDnsStatusIcon(
                                  checkNamecheapDns.acmeChallenge.status
                                )}
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  {getDnsStatusMessage(
                                    checkNamecheapDns.acmeChallenge.status
                                  )}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            {acmeChallengeRecordValidationResIsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : acmeChallengeRecordValidationRes ? (
                              <>
                                {getDnsStatusIcon(
                                  acmeChallengeRecordValidationRes.status
                                )}
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  {getDnsStatusMessage(
                                    acmeChallengeRecordValidationRes.status
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
                            <span className="text-sm">
                              Canister ID verification
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            {checkNamecheapDnsIsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : checkNamecheapDns?.canisterId ? (
                              <>
                                {getDnsStatusIcon(
                                  checkNamecheapDns.canisterId.status
                                )}
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  {getDnsStatusMessage(
                                    checkNamecheapDns.canisterId.status
                                  )}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            {canisterIdRecordValidationResIsLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : canisterIdRecordValidationRes ? (
                              <>
                                {getDnsStatusIcon(
                                  canisterIdRecordValidationRes.status
                                )}
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  {getDnsStatusMessage(
                                    canisterIdRecordValidationRes.status
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
              <h4 className="text-sm font-medium mb-2">Notes</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1 shrink-0"></span>
                  <span>
                    DNS record names are shown in the format your DNS provider
                    expects (@ for apex domains, subdomain names for subdomains)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1 shrink-0"></span>
                  <span>
                    DNS changes can take up to 48 hours to propagate globally
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1 shrink-0"></span>
                  <span>
                    Verify your DNS records are active before proceeding to
                    registration
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
                    Before registering a domain here, you need to configure DNS
                    settings.
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
                  disabled={isLoading || isLoadingInitial}
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
                    {isCheckStatus ? "Checking..." : "Registering..."}
                  </div>
                ) : (
                  submitButtonText
                )}
              </Button>

              {error && (
                <div className="p-3 break-all text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  {error}
                </div>
              )}

              {dnsSuccess && (
                <div className="p-3 break-all text-sm text-green-800 bg-green-100 border border-green-300 rounded-md">
                  DNS pre-check successful! All required records are properly
                  configured.
                </div>
              )}

              {/* Registration Status */}
              {requestId && (
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

                  {registrationStatus ? (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Domain:</span>{" "}
                        {registrationStatus.name}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Canister:</span>{" "}
                        {registrationStatus.canister}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Status:</span>{" "}
                        <span
                          className={`font-medium ${
                            registrationStatus.state === "Available"
                              ? "text-green-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {registrationStatus.state}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Request ID: {requestId}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
}
