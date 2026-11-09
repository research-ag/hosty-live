import { API_BASE_URL, getStoredAccessToken } from "./api";

/** A connected app's pending connection request, as the consent page shows it. */
export interface OAuthRequestView {
  id: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "EXPIRED";
  clientName: string;
  /** true: the name comes from a metadata document published at clientHost. */
  clientVerified: boolean;
  clientHost?: string;
  /** Where the approval is sent; "localhost" for apps on this computer. */
  redirectHost: string;
  redirectUri: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
}

/** A connected app (an OAuth grant): one per connector or CLI install. */
export interface ConnectedApp {
  id: string;
  clientName: string;
  clientVerified: boolean;
  clientHost?: string;
  redirectHost: string;
  scope: string;
  createdAt: string;
  lastUsedAt?: string;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getStoredAccessToken();
    if (!token) throw new HttpError("No active session", 401);
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join("; ") : body.message;
    throw new HttpError(message || `HTTP ${response.status}`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Host names of apps whose connector callbacks are expected; anything else gets a warning. */
const KNOWN_REDIRECT_HOSTS = ["claude.ai", "chatgpt.com", "cursor.com", "vscode.dev", "localhost"];

export function isKnownRedirectHost(host: string): boolean {
  return KNOWN_REDIRECT_HOSTS.includes(host.toLowerCase());
}

export const oauthApi = {
  getRequest: (id: string) => request<OAuthRequestView>(`/oauth/requests/${encodeURIComponent(id)}`, {}, false),
  approve: (id: string) =>
    request<{ redirectUrl: string }>(`/oauth/requests/${encodeURIComponent(id)}/approve`, { method: "POST" }),
  decline: (id: string) =>
    request<{ redirectUrl: string }>(`/oauth/requests/${encodeURIComponent(id)}/decline`, { method: "POST" }),
  /** null when the API has OAuth switched off (the routes answer 404). */
  listApps: async (): Promise<ConnectedApp[] | null> => {
    try {
      return (await request<{ grants: ConnectedApp[] }>("/oauth/grants")).grants;
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) return null;
      throw err;
    }
  },
  /** Disconnects the app; the API ends the deploy sessions it requested. */
  disconnect: (id: string) => request<void>(`/oauth/grants/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
