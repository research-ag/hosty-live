import { useEffect, useMemo, useState } from "react";
import { AuthClient } from "@dfinity/auth-client";

export type IIState = {
  principal?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

let authClient: AuthClient | null = null;
let authClientPromise: Promise<void> | null = AuthClient.create().then(c => {
  authClient = c;
  authClientPromise = null;
});

async function getClient(): Promise<AuthClient> {
  if (!authClient) {
    await authClientPromise!;
  }
  return authClient!;
}

function getClientSync(): AuthClient {
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
    (async () => {
      try {
        const client = await getClient();
        const authed = await client.isAuthenticated();
        if (cancelled) return;
        setIsAuthenticated(authed);
        if (authed) {
          const identity = client.getIdentity();
          const p = identity?.getPrincipal?.().toText?.();
          if (p) setPrincipal(p);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useMemo(
    () =>
      () => {
        return new Promise<void>((resolve, reject) => {
          const client = getClientSync();
          const identityProvider = "https://identity.ic0.app/#authorize";
          client.login({
            identityProvider,
            onSuccess: async () => {
              try {
                const authed = await client.isAuthenticated();
                setIsAuthenticated(authed);
                const identity = client.getIdentity();
                const p = identity?.getPrincipal?.().toText?.();
                setPrincipal(p);
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
        setIsAuthenticated(false);
        setPrincipal(undefined);
      },
    []
  );

  return { principal, isAuthenticated, isLoading, login, logout };
}
