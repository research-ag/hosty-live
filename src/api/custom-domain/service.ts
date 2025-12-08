import { makeRequest } from "../system";
import { isValidDomain } from "../../utils/domains";

const resetHeaders = {
  "ngrok-skip-browser-warning": null,
  Authorization: null,
};

export interface GoogleDnsResponse {
  Status: number;
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;
  Question: {
    name: string;
    type: number;
  }[];
  Answer?: {
    name: string;
    type: number;
    TTL: number;
    data: string;
  }[];
}

// @ Cloudflare DNS check (recursive resolver - shows propagation status)

export const checkCloudflareDns = async (
  domain: string,
  expectedCanisterId: string
) => {
  const timestamp = Date.now();

  // Cloudflare DNS-over-HTTPS requires Accept: application/dns-json header
  const cloudflareDnsHeaders = {
    ...resetHeaders,
    Accept: "application/dns-json",
  };

  try {
    // Query all three records in parallel
    const [aliasData, canisterIdData, acmeChallengeData] = await Promise.all([
      makeRequest.auto<GoogleDnsResponse>({
        url: `https://cloudflare-dns.com/dns-query?name=${domain}&type=A&_t=${timestamp}`,
        method: "GET",
        headers: cloudflareDnsHeaders,
      }),
      makeRequest.auto<GoogleDnsResponse>({
        url: `https://cloudflare-dns.com/dns-query?name=_canister-id.${domain}&type=TXT&_t=${timestamp}`,
        method: "GET",
        headers: cloudflareDnsHeaders,
      }),
      makeRequest.auto<GoogleDnsResponse>({
        url: `https://cloudflare-dns.com/dns-query?name=_acme-challenge.${domain}&type=CNAME&_t=${timestamp}`,
        method: "GET",
        headers: cloudflareDnsHeaders,
      }),
    ]);

    console.log("✅ Cloudflare DNS responses:", {
      aliasData,
      canisterIdData,
      acmeChallengeData,
    });

    // Domain mapping - just show what's configured (we can't verify IPs reliably)
    const aliasResult = (() => {
      if (aliasData.Status !== 0 || !aliasData.Answer?.length) {
        return { status: "missing" as const, values: [] as string[] };
      }
      const values = aliasData.Answer.map((record) => record.data);
      return { status: "configured" as const, values };
    })();

    // Canister ID validation
    const canisterIdResult = (() => {
      if (canisterIdData.Status !== 0 || !canisterIdData.Answer?.length) {
        return { status: "missing" as const, values: [] as string[] };
      }
      const txtRecords = canisterIdData.Answer.map((record) =>
        record.data.replace(/"/g, "")
      );
      const hasCorrectCanisterId = txtRecords.includes(expectedCanisterId);
      return {
        status: hasCorrectCanisterId
          ? ("valid" as const)
          : ("wrong_value" as const),
        values: txtRecords,
      };
    })();

    // ACME challenge validation
    const acmeChallengeResult = (() => {
      if (acmeChallengeData.Status !== 0 || !acmeChallengeData.Answer?.length) {
        return { status: "missing" as const, values: [] as string[] };
      }
      const expectedValue = `_acme-challenge.${domain}.icp2.io.`;
      const cnameRecords = acmeChallengeData.Answer.map(
        (record) => record.data
      );
      const hasCorrectCname = cnameRecords.some(
        (record) => record === expectedValue
      );
      return {
        status: hasCorrectCname ? ("valid" as const) : ("wrong_value" as const),
        values: cnameRecords,
      };
    })();

    return {
      alias: aliasResult,
      canisterId: canisterIdResult,
      acmeChallenge: acmeChallengeResult,
    };
  } catch (error) {
    console.error("❌ Cloudflare DNS check failed:", error);
    return {
      alias: { status: "missing" as const, values: [] as string[] },
      canisterId: { status: "missing" as const, values: [] as string[] },
      acmeChallenge: { status: "missing" as const, values: [] as string[] },
    };
  }
};

export const fetchDomainFromIcDomains = async (
  canisterId: string
): Promise<string> => {
  try {
    const data = await makeRequest.auto<string>({
      url: `https://${canisterId}.icp0.io/.well-known/ic-domains`,
      method: "GET",
      headers: { ...resetHeaders, "Content-Type": "text/plain" },
    });

    const domain = (data ?? "").trim();

    // Handle HTML fallback (asset canister serves index.html for missing files)
    if (domain.startsWith("<!DOCTYPE") || domain.startsWith("<html")) {
      return "";
    }

    return isValidDomain(domain) ? domain : "";
  } catch {
    return "";
  }
};
