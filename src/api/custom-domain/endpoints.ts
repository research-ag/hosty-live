import { queryEndpoint } from "../system";
import * as apiService from "./service";

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

export const checkCloudflareDns = queryEndpoint({
  entity: "checkCloudflareDns",
  queryKey: (payload) => [
    "check-cloudflare-dns",
    payload.domain,
    payload.expectedCanisterId,
  ],
  queryFn: (payload: { domain: string; expectedCanisterId: string }) =>
    apiService.checkCloudflareDns(payload.domain, payload.expectedCanisterId),
  defaultValue: null,
  nullable: true,
});

// @

export interface CustomDomainCheckResult {
  domain: string | null;
  status:
    | "not_configured"
    | "dns_invalid"
    | "registering"
    | "registered"
    | "expired"
    | "failed";
  validationResult: {
    validation_status: "valid" | "invalid";
    canister_id?: string;
  } | null;
  registrationStatus: {
    registration_status: "registering" | "registered" | "expired" | "failed";
    canister_id?: string;
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

      if (!domain) {
        return {
          domain: null,
          status: "not_configured",
          validationResult: null,
          registrationStatus: null,
          errorMessage: null,
        };
      }

      // Check registration status via IC API
      try {
        // Query IC boundary nodes for registration status
        const response = await fetch(
          `https://icp0.io/custom-domains/v1/${domain}`
        );

        if (response.ok) {
          const data = await response.json();
          const regStatus = data.data?.registration_status;
          const registeredCanisterId = data.data?.canister_id;

          // Verify canister ID matches
          if (
            registeredCanisterId &&
            registeredCanisterId !== payload.canisterId
          ) {
            return {
              domain,
              status: "failed",
              validationResult: null,
              registrationStatus: {
                registration_status: regStatus || "registering",
                canister_id: registeredCanisterId,
              },
              errorMessage: `Domain registered to different canister: ${registeredCanisterId}`,
            };
          }

          return {
            domain,
            status: regStatus || "registering",
            validationResult: null,
            registrationStatus: {
              registration_status: regStatus || "registering",
              canister_id: registeredCanisterId,
            },
            errorMessage: null,
          };
        }
      } catch (_statusError) {
        // Domain not registered, return not_configured
      }

      return {
        domain,
        status: "not_configured",
        validationResult: null,
        registrationStatus: null,
        errorMessage: null,
      };
    } catch (error) {
      return {
        domain: null,
        status: "not_configured",
        validationResult: null,
        registrationStatus: null,
        errorMessage:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },

  defaultValue: null,
  nullable: true,
});
