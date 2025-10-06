import { useEffect, useMemo, useState } from "react";
import { AuthClient } from "@dfinity/auth-client";

export type IIState = {
  principal?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

let authClientPromise: Promise<AuthClient> | null = null;

async function getClient(): Promise<AuthClient> {
  if (!authClientPromise) {
    authClientPromise = AuthClient.create();
  }
  return authClientPromise;
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
      async () => {
        const client = await getClient();
        const identityProvider = "https://identity.ic0.app/#authorize";
        await new Promise<void>((resolve, reject) => {
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
