/**
 * Cloudflare DNS API Service
 *
 * Proxies DNS configuration requests through Cloudflare Worker (bypasses CORS).
 * Credentials are sent securely via HTTPS, used once, and never stored.
 */

const WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;

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
 * Configure all required DNS records for IC custom domain via Cloudflare Worker
 */
export async function configureDnsRecords(
  credentials: CloudflareCredentials,
  domain: string,
  canisterId: string,
  isApexDomain: boolean,
  subdomain: string | null
): Promise<DnsConfigResult[]> {
  if (!WORKER_URL) {
    throw new Error("VITE_CLOUDFLARE_WORKER_URL is not configured");
  }

  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
      errorData.error ||
        errorData.message ||
        `Request failed with status ${response.status}`
    );
  }

  const data: ConfigureDnsResponse = await response.json();
  return data.results;
}
