import { useEffect, useMemo, useState } from "react";
import { AuthClient } from "@dfinity/auth-client";
import { initAgentAuthSync, onAuthError, onLogin as agentOnLogin, onLogout as agentOnLogout } from "../ic/agent";

export type IIState = {
  principal?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

type IIListener = (state: { principal?: string; isAuthenticated: boolean }) => void;
const iiListeners = new Set<IIListener>();
function subscribeII(listener: IIListener) {
  iiListeners.add(listener);
  return () => iiListeners.delete(listener);
}
function notifyII(state: { principal?: string; isAuthenticated: boolean }) {
  iiListeners.forEach((l) => {
    try { l(state); } catch { /* pass */ }
  });
}

let authClient: AuthClient | null = null;
let authClientPromise: Promise<void> | null = AuthClient.create().then(c => {
  authClient = c;
  authClientPromise = null;
});

export async function getClient(): Promise<AuthClient> {
  if (!authClient) {
    await authClientPromise!;
  }
  return authClient!;
}

export function getClientSync(): AuthClient {
  if (authClient) {
    return authClient;
  } else {
    throw new Error("AuthClient not initialized");
  }
}

export function useInternetIdentity(): IIState {
  const [principal, setPrincipal] = useState<string | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = subscribeII(({ principal: p, isAuthenticated: authed }) => {
      if (cancelled) return;
      setIsAuthenticated(authed);
      setPrincipal(p);
    });

    // Listen for agent auth errors (expired/unauthorized) -> force logout and redirect
    const offAuthError = onAuthError(async () => {
      try {
        const client = await getClient();
        await client.logout();
      } catch {}
      agentOnLogout();
      notifyII({ principal: undefined, isAuthenticated: false });
      // Redirect to sign-in page
      try {
        window.location.assign('/panel/sign-in');
      } catch {}
    });

    (async () => {
      try {
        await initAgentAuthSync();
        const client = await getClient();
        const authed = await client.isAuthenticated();
        if (cancelled) return;
        setIsAuthenticated(authed);
        if (authed) {
          const identity = client.getIdentity();
          const p = identity?.getPrincipal?.().toText?.();
          if (p) setPrincipal(p);
        }
        notifyII({ principal: authed ? (authClient?.getIdentity()?.getPrincipal?.().toText?.()) : undefined, isAuthenticated: authed });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe();
      offAuthError();
    };
  }, []);

  const login = useMemo(
    () =>
      () => {
        return new Promise<void>((resolve, reject) => {
          const client = getClientSync();
          const identityProvider = "https://id.ai";
          client.login({
            identityProvider,
            onSuccess: async () => {
              try {
                const authed = await client.isAuthenticated();
                setIsAuthenticated(authed);
                const identity = client.getIdentity();
                agentOnLogin(identity);
                const p = identity?.getPrincipal?.().toText?.();
                setPrincipal(p);
                notifyII({ principal: p, isAuthenticated: authed });
                resolve();
              } catch (e) {
                reject(e);
              }
            },
            onError: (err) => reject(err),
          });
        });
      },
    []
  );

  const logout = useMemo(
    () =>
      async () => {
        const client = await getClient();
        await client.logout();
        agentOnLogout();
        setIsAuthenticated(false);
        setPrincipal(undefined);
        notifyII({ principal: undefined, isAuthenticated: false });
        try { window.location.assign('/panel/sign-in'); } catch {}
      },
    []
  );

  return { principal, isAuthenticated, isLoading, login, logout };
}
