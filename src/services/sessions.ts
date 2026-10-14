import { API_BASE_URL, getStoredAccessToken } from "./api";

export type DeploySessionStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "ENDED" | "DECLINED";

export interface DeploySessionInfo {
  id: string;
  principal: string;
  status: DeploySessionStatus;
  /** DER encoded public key of the API's ephemeral session key, hex. */
  publicKeyDer: string;
  requestedUntil: string;
  expiresAt?: string;
  requestedByName?: string;
  approvedAt?: string;
  endedAt?: string;
  createdAt: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredAccessToken();
  if (!token) throw new Error("No active session");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join("; ") : body.message;
    throw new Error(message || `HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const sessionsApi = {
  list: () => request<{ sessions: DeploySessionInfo[] }>("/sessions").then((r) => r.sessions),
  current: () => request<DeploySessionInfo | null>("/sessions/current"),
  request: (hours: number) =>
    request<DeploySessionInfo>("/sessions", { method: "POST", body: JSON.stringify({ hours }) }),
  approve: (id: string, delegationChain: unknown) =>
    request<DeploySessionInfo>(`/sessions/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ delegationChain }),
    }),
  decline: (id: string) => request<DeploySessionInfo>(`/sessions/${id}/decline`, { method: "POST" }),
  end: (id: string) => request<DeploySessionInfo>(`/sessions/${id}`, { method: "DELETE" }),
};
