import { useEffect, useMemo, useState } from "react";
import { AuthClient } from "@dfinity/auth-client";
import { HttpAgent } from "@dfinity/agent";
import { DelegationIdentity } from "@dfinity/identity";

export type IIState = {
  principal?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isSessionAboutToExpire: () => boolean;
};

type IIListener = (state: { principal?: string; isAuthenticated: boolean }) => void;
const iiListeners = new Set<IIListener>();

function subscribeII(listener: IIListener) {
  iiListeners.add(listener);
  return () => iiListeners.delete(listener);
}

function notifyII(state: { principal?: string; isAuthenticated: boolean }) {
  iiListeners.forEach((l) => {
    try {
      l(state);
    } catch {
      // pass
    }
  });
}

export function getAgent(): HttpAgent {
  return new HttpAgent({ host: 'https://ic0.app', identity: authClient?.getIdentity() });
}

let authClient: AuthClient | null = null;
let authClientPromise: Promise<void> | null = AuthClient.create({
  idleOptions: {
    disableIdle: true,
    disableDefaultIdleCallback: true
  },
  loginOptions: {
    maxTimeToLive: 8n * 60n * 60n * 1_000_000_000n, // 8 hours
  }
}).then(c => {
  authClient = c;
  authClientPromise = null;
});

export async function getAuthClient(): Promise<AuthClient> {
  if (!authClient) {
    await authClientPromise!;
  }
  return authClient!;
}

export function getAuthClientSync(): AuthClient {
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

    (async () => {
      try {
        const client = await getAuthClient();
        const authed = await client.isAuthenticated();
        if (cancelled) return;
        setIsAuthenticated(authed);
        if (authed) {
          const identity = client.getIdentity();
          const p = identity?.getPrincipal?.().toText?.();
          if (p) setPrincipal(p);
        }
        notifyII({
          principal: authed ? (authClient?.getIdentity()?.getPrincipal?.().toText?.()) : undefined,
          isAuthenticated: authed
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const login = useMemo(
    () =>
      () => {
        return new Promise<void>((resolve, reject) => {
          const client = getAuthClientSync();
          const identityProvider = "https://id.ai";
          client.login({
            identityProvider,
            maxTimeToLive: 8n * 60n * 60n * 1_000_000_000n, // 8 hours
            onSuccess: async () => {
              try {
                const authed = await client.isAuthenticated();
                setIsAuthenticated(authed);
                const identity = client.getIdentity();
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
        const client = await getAuthClient();
        await client.logout();
        setIsAuthenticated(false);
        setPrincipal(undefined);
        notifyII({ principal: undefined, isAuthenticated: false });
        try {
          window.location.assign('/panel/sign-in');
        } catch {
          // pass
        }
      },
    []
  );

  const isSessionAboutToExpire = () => {
    const identity = authClient?.getIdentity();
    if (identity instanceof DelegationIdentity) {
      const delegation = identity.getDelegation()?.delegations?.[0]?.delegation;
      if (delegation) {
        // Check actual expiry
        return Date.now() > Number(delegation.expiration / BigInt(1_000_000)) - 5 * 60_000;
      }
    }
    return false;
  };

  return { principal, isAuthenticated, isLoading, login, logout, isSessionAboutToExpire };
}
