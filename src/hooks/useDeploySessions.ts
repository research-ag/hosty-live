import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DeploySessionInfo, sessionsApi } from "../services/sessions";
import { createDeployDelegation } from "../lib/delegation";
import { getStoredAccessToken, tokensApi } from "../services/api";
import { oauthApi } from "../services/oauth";

export const CONNECTED_APPS_QUERY_KEY = ["connected-apps"];

export const DEPLOY_SESSIONS_QUERY_KEY = ["deploy-sessions"];

/**
 * Deploy sessions let the hosty API install Wasm modules as the user for a limited
 * time. Agents request them; the signed-in tab approves by signing a delegation.
 */
export function useDeploySessions(options: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const enabled = (options.enabled ?? true) && !!getStoredAccessToken();

  const query = useQuery({
    queryKey: DEPLOY_SESSIONS_QUERY_KEY,
    queryFn: sessionsApi.list,
    enabled,
    // The socket invalidates this on changes; polling covers a missed event.
    refetchInterval: (q) =>
      q.state.data?.some((s) => s.status === "PENDING" || s.status === "ACTIVE") ? 15_000 : 60_000,
    staleTime: 5_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: DEPLOY_SESSIONS_QUERY_KEY });

  const approve = useMutation({
    mutationFn: async ({ session, minutes }: { session: DeploySessionInfo; minutes?: number }) => {
      const requested = new Date(session.requestedUntil);
      const limit = minutes ? new Date(Date.now() + minutes * 60_000) : requested;
      const until = limit < requested ? limit : requested;
      const { delegationChain } = await createDeployDelegation(session.publicKeyDer, until);
      return sessionsApi.approve(session.id, delegationChain);
    },
    onSettled: invalidate,
  });

  const decline = useMutation({ mutationFn: (id: string) => sessionsApi.decline(id), onSettled: invalidate });
  const end = useMutation({ mutationFn: (id: string) => sessionsApi.end(id), onSettled: invalidate });
  // The API closes the sessions a revoked token (or disconnected app) requested: pending ones
  // declined, active ones ended.
  const revokeToken = useMutation({
    mutationFn: ({ tokenId, connectedApp }: { tokenId: string; connectedApp: boolean }) =>
      connectedApp ? oauthApi.disconnect(tokenId) : tokensApi.revoke(tokenId),
    onSettled: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
      queryClient.invalidateQueries({ queryKey: CONNECTED_APPS_QUERY_KEY });
    },
  });

  const sessions = query.data ?? [];
  const pending = sessions.filter((s) => s.status === "PENDING");
  const active = sessions.find(
    (s) => s.status === "ACTIVE" && !!s.expiresAt && new Date(s.expiresAt).getTime() > Date.now(),
  );

  /**
   * Used by the web deploy form: reuse the active session or open and approve a short
   * one in place, since the user is clicking Deploy themselves. The API answers this web
   * app with its own pending request only, never an agent's: those are approved on their
   * card, where the user compares the request code.
   */
  const ensureActiveSession = async (minutes = 15, purpose?: string): Promise<DeploySessionInfo> => {
    const session = await sessionsApi.request(minutes / 60, purpose);
    if (session.status === "ACTIVE" && session.expiresAt && new Date(session.expiresAt).getTime() > Date.now()) {
      return session;
    }
    const { delegationChain } = await createDeployDelegation(
      session.publicKeyDer,
      new Date(Math.min(Date.now() + minutes * 60_000, new Date(session.requestedUntil).getTime())),
    );
    const approved = await sessionsApi.approve(session.id, delegationChain);
    await invalidate();
    return approved;
  };

  return {
    sessions,
    pending,
    active,
    isLoading: query.isLoading,
    refresh: invalidate,
    approve: (session: DeploySessionInfo, minutes?: number) => approve.mutateAsync({ session, minutes }),
    decline: (id: string) => decline.mutateAsync(id),
    end: (id: string) => end.mutateAsync(id),
    /** Revokes the API token, or disconnects the connected app, that requested a session. */
    revokeToken: (tokenId: string, connectedApp = false) => revokeToken.mutateAsync({ tokenId, connectedApp }),
    isRevoking: revokeToken.isPending,
    isApproving: approve.isPending,
    ensureActiveSession,
  };
}
