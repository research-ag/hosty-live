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

/**
 * IC Custom Domains API statuses (direct mapping):
 * - registering: SSL certificate being issued
 * - registered: Domain active and working
 * - failed: Registration failed
 * - expired: SSL certificate expired
 *
 * Additional statuses (our logic):
 * - not_configured: No ic-domains file or not registered with IC
 * - routing_error: Domain registered but not routing to expected canister
 */
export type DomainStatus =
  | "not_configured"
  | "registering"
  | "registered"
  | "failed"
  | "expired"
  | "routing_error";

export interface CustomDomainCheckResult {
  domain: string | null;
  status: DomainStatus;
  registeredCanisterId: string | null;
  routingCanisterId: string | null;
  errorMessage: string | null;
}

/**
 * Verify domain routes to expected canister via x-ic-canister-id header
 */
async function verifyDomainRouting(
  domain: string,
  expectedCanisterId: string
): Promise<{ routingCanisterId: string | null; isCorrect: boolean }> {
  try {
    const response = await fetch(`https://${domain}/`, {
      method: "HEAD",
      redirect: "follow",
    });
    const routingCanisterId = response.headers.get("x-ic-canister-id");
    return {
      routingCanisterId,
      isCorrect: routingCanisterId === expectedCanisterId,
    };
  } catch {
    return { routingCanisterId: null, isCorrect: false };
  }
}

export const checkCustomDomain = queryEndpoint({
  entity: "domainCheckResult",
  queryKey: (payload) => ["domain-check-result", payload.canisterId],
  queryFn: async (payload: {
    canisterId: string;
  }): Promise<CustomDomainCheckResult> => {
    // Step 1: Fetch domain from ic-domains file
    const domain = await apiService.fetchDomainFromIcDomains(
      payload.canisterId
    );

    if (!domain) {
      return {
        domain: null,
        status: "not_configured",
        registeredCanisterId: null,
        routingCanisterId: null,
        errorMessage: null,
      };
    }

    // Step 2: Check IC registration status
    try {
      const response = await fetch(
        `https://icp0.io/custom-domains/v1/${domain}`
      );

      if (!response.ok) {
        // Domain not registered with IC
        return {
          domain,
          status: "not_configured",
          registeredCanisterId: null,
          routingCanisterId: null,
          errorMessage: null,
        };
      }

      const data = await response.json();
      const icStatus = data.data?.registration_status as DomainStatus;
      const registeredCanisterId = data.data?.canister_id;

      // Check if registered to different canister
      if (registeredCanisterId && registeredCanisterId !== payload.canisterId) {
        return {
          domain,
          status: "failed",
          registeredCanisterId,
          routingCanisterId: null,
          errorMessage: `Domain registered to different canister: ${registeredCanisterId}`,
        };
      }

      // Step 3: For registered domains, verify actual routing via x-ic-canister-id
      if (icStatus === "registered") {
        const routing = await verifyDomainRouting(domain, payload.canisterId);

        if (!routing.isCorrect && routing.routingCanisterId) {
          return {
            domain,
            status: "routing_error",
            registeredCanisterId,
            routingCanisterId: routing.routingCanisterId,
            errorMessage: `Domain routes to ${routing.routingCanisterId}`,
          };
        }
      }

      // Return IC status directly
      return {
        domain,
        status: icStatus || "registering",
        registeredCanisterId,
        routingCanisterId: null,
        errorMessage: null,
      };
    } catch {
      return {
        domain,
        status: "not_configured",
        registeredCanisterId: null,
        routingCanisterId: null,
        errorMessage: null,
      };
    }
  },

  defaultValue: null,
  nullable: true,
});
