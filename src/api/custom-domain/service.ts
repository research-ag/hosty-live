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

export const validateAliasRecord = async (
  domain: string
): Promise<{ status: string; ips?: string[] }> => {
  const timestamp = Date.now();
  const data = await makeRequest.auto<GoogleDnsResponse>({
    url: `https://dns.google/resolve?name=${domain}&type=A&_t=${timestamp}`,
    method: "GET",
    headers: resetHeaders,
  });

  if (data.Status !== 0) return { status: "missing" };

  const ips = data.Answer?.map((record) => record.data) || [];
  const hasIcpIPs = ips.some(
    (ip) => ICP_BOUNDARY_NODE_IPS.includes(ip) || ip === "icp1.io."
  );

  return {
    status: hasIcpIPs ? "valid" : "wrong_target",
    ips,
  };
};

export const validateCanisterIdRecord = async (
  domain: string,
  expectedCanisterId: string
): Promise<{ status: string; values?: string[] }> => {
  const timestamp = Date.now();
  const data = await makeRequest.auto<GoogleDnsResponse>({
    url: `https://dns.google/resolve?name=_canister-id.${domain}&type=TXT&_t=${timestamp}`,
    method: "GET",
    headers: resetHeaders,
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
  const timestamp = Date.now();
  const data = await makeRequest.auto<GoogleDnsResponse>({
    url: `https://dns.google/resolve?name=_acme-challenge.${domain}&type=CNAME&_t=${timestamp}`,
    method: "GET",
    headers: resetHeaders,
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

// @ Namecheap check

interface DnsQueryResponse {
  results: Array<{
    name: string;
    type: string;
    server: string;
    answers: string[];
    error?: string;
  }>;
  error?: string;
}

export const checkNamecheapDns = async (
  domain: string,
  expectedCanisterId: string
) => {
  const data = await makeRequest.auto<DnsQueryResponse>({
    url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dns-query`,
    method: "POST",
    headers: { ...resetHeaders },
    data: {
      queries: [
        {
          name: domain,
          type: "A",
          server: "dns1.registrar-servers.com",
        },
        {
          name: `_canister-id.${domain}`,
          type: "TXT",
          server: "dns1.registrar-servers.com",
        },
        {
          name: `_acme-challenge.${domain}`,
          type: "CNAME",
          server: "dns1.registrar-servers.com",
        },
      ],
    },
  });

  const fnResult: Array<{ status: string; ips?: string[]; values?: string[] }> =
    [];

  const [aliasRecord, canisterIdRecord, acmeChallengeRecord] = data.results;

  // Alias validation

  if (!aliasRecord.answers.length) {
    fnResult.push({ status: "missing" });
  } else {
    const ips = aliasRecord.answers.map((record) => record);
    const hasIcpIPs = ips.some(
      (ip) => ICP_BOUNDARY_NODE_IPS.includes(ip) || ip === "icp1.io."
    );

    fnResult.push({
      status: hasIcpIPs ? "valid" : "wrong_target",
      ips,
    });
  }

  // Canister id validation

  if (!canisterIdRecord.answers.length) {
    fnResult.push({ status: "missing" });
  } else {
    const txtRecords = canisterIdRecord.answers.map((record) =>
      record.replace(/"/g, "")
    );
    const hasCorrectCanisterId = txtRecords.includes(expectedCanisterId);

    fnResult.push({
      status: hasCorrectCanisterId ? "valid" : "wrong_value",
      values: txtRecords,
    });
  }
  // Acme challenge validation

  if (!acmeChallengeRecord.answers.length) {
    fnResult.push({ status: "missing" });
  } else {
    const expectedValue = `_acme-challenge.${domain}.icp2.io.`;
    const cnameRecords = acmeChallengeRecord.answers.map((record) => record);
    const hasCorrectCname = cnameRecords.some(
      (record) => record === expectedValue
    );

    fnResult.push({
      status: hasCorrectCname ? "valid" : "wrong_value",
      values: cnameRecords,
    });
  }

  return {
    alias: fnResult[0],
    canisterId: fnResult[1],
    acmeChallenge: fnResult[2],
  };
};

// @

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

  const domain = (data ?? "").trim();

  return isValidDomain(domain) ? domain : "";
};
