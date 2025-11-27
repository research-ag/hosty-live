import { makeRequest } from "../system";
import { isValidDomain } from "../../utils/domains";

const resetHeaders = {
  "ngrok-skip-browser-warning": null,
  Authorization: null,
};

const ICP_BOUNDARY_NODE_IPS = [
  "145.40.67.162",
  "63.251.162.12",
  "147.75.108.42",
  "147.75.202.74",
  "23.142.184.129",
  "icp1.io.",
];

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

    // Alias validation
    const aliasResult = (() => {
      if (aliasData.Status !== 0 || !aliasData.Answer?.length) {
        return { status: "missing" };
      }
      const ips = aliasData.Answer.map((record) => record.data);
      const hasIcpIPs = ips.some(
        (ip) => ICP_BOUNDARY_NODE_IPS.includes(ip) || ip === "icp1.io."
      );
      return {
        status: hasIcpIPs ? "valid" : "wrong_target",
        ips,
      };
    })();

    // Canister ID validation
    const canisterIdResult = (() => {
      if (canisterIdData.Status !== 0 || !canisterIdData.Answer?.length) {
        return { status: "missing" };
      }
      const txtRecords = canisterIdData.Answer.map((record) =>
        record.data.replace(/"/g, "")
      );
      const hasCorrectCanisterId = txtRecords.includes(expectedCanisterId);
      return {
        status: hasCorrectCanisterId ? "valid" : "wrong_value",
        values: txtRecords,
      };
    })();

    // ACME challenge validation
    const acmeChallengeResult = (() => {
      if (acmeChallengeData.Status !== 0 || !acmeChallengeData.Answer?.length) {
        return { status: "missing" };
      }
      const expectedValue = `_acme-challenge.${domain}.icp2.io.`;
      const cnameRecords = acmeChallengeData.Answer.map(
        (record) => record.data
      );
      const hasCorrectCname = cnameRecords.some(
        (record) => record === expectedValue
      );
      return {
        status: hasCorrectCname ? "valid" : "wrong_value",
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
    // Return error state for all records
    return {
      alias: { status: "missing" },
      canisterId: { status: "missing" },
      acmeChallenge: { status: "missing" },
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
