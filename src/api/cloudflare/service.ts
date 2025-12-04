/**
 * Cloudflare DNS API Service
 *
 * Proxies DNS configuration requests through the deployments API backend.
 * Credentials are sent securely via HTTPS, used once, and never stored on the server.
 */

import { getStoredAccessToken } from "../../services/api";

const API_BASE =
  import.meta.env.VITE_HOSTY_API_BASE ||
  "https://mrresearch.xyz/hosty-live-api";

export interface CloudflareCredentials {
  apiToken: string;
  zoneId: string;
}

export interface DnsConfigResult {
  record: string;
  success: boolean;
  message: string;
  action: "created" | "updated" | "skipped" | "error";
}

interface ConfigureDnsResponse {
  results: DnsConfigResult[];
}

/**
 * Configure all required DNS records for IC custom domain via backend proxy
 */
export async function configureDnsRecords(
  credentials: CloudflareCredentials,
  domain: string,
  canisterId: string,
  isApexDomain: boolean,
  subdomain: string | null
): Promise<DnsConfigResult[]> {
  const accessToken = getStoredAccessToken();

  const response = await fetch(`${API_BASE}/cloudflare/dns-records`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    body: JSON.stringify({
      apiToken: credentials.apiToken,
      zoneId: credentials.zoneId,
      domain,
      canisterId,
      isApexDomain,
      subdomain: subdomain || undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Request failed with status ${response.status}`
    );
  }

  const data: ConfigureDnsResponse = await response.json();
  return data.results;
}
