import { makeRequest } from "../system";

const resetHeaders = {
  "ngrok-skip-browser-warning": null,
  Authorization: null,
  "Cache-Control": "no-cache, no-store, must-revalidate",
};

const ICP_BOUNDARY_NODE_IPS = [
  "145.40.67.162",
  "63.251.162.12",
  "147.75.108.42",
  "147.75.202.74",
];

export interface CloudflareDnsResponse {
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

export const validateAliasRecord = async (
  domain: string
): Promise<{ status: string; ips?: string[] }> => {
  const data = await makeRequest.auto<CloudflareDnsResponse>({
    url: `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`,
    method: "GET",
    headers: { ...resetHeaders, Accept: "application/dns-json" },
  });

  if (data.Status !== 0) return { status: "missing" };

  const ips = data.Answer?.map((record) => record.data) || [];
  const hasIcpIPs = ips.some((ip) => ICP_BOUNDARY_NODE_IPS.includes(ip));

  return {
    status: hasIcpIPs ? "valid" : "wrong_target",
    ips,
  };
};

export const validateCanisterIdRecord = async (
  domain: string,
  expectedCanisterId: string
): Promise<{ status: string; values?: string[] }> => {
  const data = await makeRequest.auto<CloudflareDnsResponse>({
    url: `https://cloudflare-dns.com/dns-query?name=_canister-id.${domain}&type=TXT`,
    method: "GET",
    headers: { ...resetHeaders, Accept: "application/dns-json" },
  });

  if (data.Status !== 0) return { status: "missing" };

  const txtRecords =
    data.Answer?.map((record) => record.data.replace(/"/g, "")) || [];
  const hasCorrectCanisterId = txtRecords.includes(expectedCanisterId);

  return {
    status: hasCorrectCanisterId ? "valid" : "wrong_value",
    values: txtRecords,
  };
};

export const validateAcmeChallengeRecord = async (
  domain: string
): Promise<{ status: string; values?: string[] }> => {
  const data = await makeRequest.auto<CloudflareDnsResponse>({
    url: `https://cloudflare-dns.com/dns-query?name=_acme-challenge.${domain}&type=CNAME`,
    method: "GET",
    headers: { ...resetHeaders, Accept: "application/dns-json" },
  });

  if (data.Status !== 0) return { status: "missing" };

  const expectedValue = `_acme-challenge.${domain}.icp2.io.`;
  const cnameRecords = data.Answer?.map((record) => record.data) || [];
  const hasCorrectCname = cnameRecords.some(
    (record) => record === expectedValue
  );

  return {
    status: hasCorrectCname ? "valid" : "wrong_value",
    values: cnameRecords,
  };
};

export interface RegistrationsResponse {
  name: string;
  canister: string;
  state: string;
}

export interface RegisterDomainResponse {
  id: string;
}

export const registerDomain = async (domain: string) => {
  const data = await makeRequest.auto<RegisterDomainResponse>({
    url: "https://icp0.io/registrations",
    method: "POST",
    data: { name: domain },
    headers: resetHeaders,
  });

  return data;
};

export const checkRegistrationStatus = async (
  requestId: string
): Promise<RegistrationsResponse> => {
  const data = await makeRequest.auto<RegistrationsResponse>({
    url: `https://icp0.io/registrations/${requestId}`,
    method: "GET",
    headers: resetHeaders,
  });

  return data;
};

export const fetchDomainFromIcDomains = async (
  canisterId: string
): Promise<string> => {
  const data = await makeRequest.auto<string>({
    url: `https://${canisterId}.icp0.io/.well-known/ic-domains`,
    method: "GET",
    headers: { ...resetHeaders, "Content-Type": "text/plain" },
  });

  return (data ?? "").trim();
};
