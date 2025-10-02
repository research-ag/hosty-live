import { queryEndpoint } from "../system";
import * as apiService from "./service";

// @

export const validateAliasRecord = queryEndpoint({
  entity: "aliasRecordValidationRes",
  queryKey: (payload) => ["alias-record-validation-res", payload.domain],
  queryFn: (payload: { domain: string }) =>
    apiService.validateAliasRecord(payload.domain),
  defaultValue: null,
  nullable: true,
});

// @

export const validateCanisterIdRecord = queryEndpoint({
  entity: "canisterIdRecordValidationRes",
  queryKey: (payload) => [
    "canister-id-record-validation-res",
    payload.domain,
    payload.expectedCanisterId,
  ],
  queryFn: (payload: { domain: string; expectedCanisterId: string }) =>
    apiService.validateCanisterIdRecord(
      payload.domain,
      payload.expectedCanisterId
    ),
  defaultValue: null,
  nullable: true,
});

// @

export const validateAcmeChallengeRecord = queryEndpoint({
  entity: "acmeChallengeRecordValidationRes",
  queryKey: (payload) => [
    "acme-challenge-record-validation-res",
    payload.domain,
  ],
  queryFn: (payload: { domain: string }) =>
    apiService.validateAcmeChallengeRecord(payload.domain),
  defaultValue: null,
  nullable: true,
});

// @

export const fetchDomainFromIcDomains = queryEndpoint({
  entity: "domainFromIcDomains",
  queryKey: (payload) => ["domain-from-ic-domains", payload.canisterId],
  queryFn: (payload: { canisterId: string }) =>
    apiService.fetchDomainFromIcDomains(payload.canisterId),
  defaultValue: null,
  nullable: true,
});

// @

export const checkNamecheapDns = queryEndpoint({
  entity: "checkNamecheapDns",
  queryKey: (payload) => [
    "check-namecheap-dns",
    payload.domain,
    payload.expectedCanisterId,
  ],
  queryFn: (payload: { domain: string; expectedCanisterId: string }) =>
    apiService.checkNamecheapDns(payload.domain, payload.expectedCanisterId),
  defaultValue: null,
  nullable: true,
});

// @

export interface CustomDomainCheckResult {
  domain: string | null;
  status:
    | "not_configured"
    | "dns_invalid"
    | "registration_pending"
    | "registration_failed"
    | "active";
  dnsCheck: {
    alias: { status: string; ips?: string[] };
    txt: { status: string; values?: string[] };
    cname: { status: string; values?: string[] };
  } | null;
  registrationStatus: {
    state: string;
    name?: string;
    canister?: string;
  } | null;
  errorMessage: string | null;
}

export const checkCustomDomain = queryEndpoint({
  entity: "domainCheckResult",
  queryKey: (payload) => ["domain-check-result", payload.canisterId],
  queryFn: async (payload: {
    canisterId: string;
  }): Promise<CustomDomainCheckResult> => {
    try {
      const domain = await apiService.fetchDomainFromIcDomains(
        payload.canisterId
      );

      // return {
      //   domain,
      //   status: "dns_invalid",
      //   dnsCheck: null,
      //   registrationStatus: null,
      //   errorMessage: `DNS configuration issues: ... (here errors description)`,
      // };

      if (!domain) {
        return {
          domain: null,
          status: "not_configured",
          dnsCheck: null,
          registrationStatus: null,
          errorMessage: null,
        };
      }

      const [aliasResult, txtResult, cnameResult] = await Promise.all([
        apiService.validateAliasRecord(domain),
        apiService.validateCanisterIdRecord(domain, payload.canisterId),
        apiService.validateAcmeChallengeRecord(domain),
      ]);

      const dnsCheck = {
        alias: aliasResult,
        txt: txtResult,
        cname: cnameResult,
      };

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

        return {
          domain,
          status: "dns_invalid",
          dnsCheck,
          registrationStatus: null,
          errorMessage: `DNS configuration issues: ${errorMessages.join(", ")}`,
        };
      }

      try {
        const registrationResponse = await apiService.registerDomain(domain);

        if (registrationResponse.id) {
          const registrationStatus = await apiService.checkRegistrationStatus(
            registrationResponse.id
          );

          if (registrationStatus.state === "Available") {
            return {
              domain,
              status: "active",
              dnsCheck,
              registrationStatus,
              errorMessage: null,
            };
          } else if (registrationStatus.state === "Failed") {
            return {
              domain,
              status: "registration_failed",
              dnsCheck,
              registrationStatus,
              errorMessage: `Registration failed: ${registrationStatus.state}`,
            };
          } else {
            return {
              domain,
              status: "registration_pending",
              dnsCheck,
              registrationStatus,
              errorMessage: `Registration in progress: ${registrationStatus.state}`,
            };
          }
        }
      } catch (_registrationError) {
        // If registration call fails, assume it might already be registered
        // This is a fallback - ideally we'd store registration IDs
        return {
          domain,
          status: "registration_pending",
          dnsCheck,
          registrationStatus: null,
          errorMessage: "Unable to verify registration status",
        };
      }

      return {
        domain,
        status: "registration_pending",
        dnsCheck,
        registrationStatus: null,
        errorMessage: null,
      };
    } catch (error) {
      return {
        domain: null,
        status: "not_configured",
        dnsCheck: null,
        registrationStatus: null,
        errorMessage:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },

  defaultValue: null,
  nullable: true,
});
