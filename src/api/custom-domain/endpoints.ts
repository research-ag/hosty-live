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

      // Check registration status using new API
      try {
        const statusResponse = await apiService.checkRegistrationStatus(domain);

        if (statusResponse.status === "success" && statusResponse.data) {
          const regStatus = statusResponse.data.registration_status;
          const registeredCanisterId = statusResponse.data.canister_id;

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
        // Domain not yet registered, try validation
        try {
          const validationResponse = await apiService.validateDomain(domain);

          if (
            validationResponse.status === "success" &&
            validationResponse.data
          ) {
            return {
              domain,
              status: "dns_invalid",
              validationResult: {
                validation_status: validationResponse.data.validation_status,
                canister_id: validationResponse.data.canister_id,
              },
              registrationStatus: null,
              errorMessage: null,
            };
          } else {
            return {
              domain,
              status: "dns_invalid",
              validationResult: null,
              registrationStatus: null,
              errorMessage:
                validationResponse.errors || validationResponse.message,
            };
          }
        } catch (validationError) {
          return {
            domain,
            status: "dns_invalid",
            validationResult: null,
            registrationStatus: null,
            errorMessage:
              validationError instanceof Error
                ? validationError.message
                : "Validation failed",
          };
        }
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
