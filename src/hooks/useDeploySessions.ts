import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DeploySessionInfo, sessionsApi } from "../services/sessions";
import { createDeployDelegation } from "../lib/delegation";
import { getStoredAccessToken } from "../services/api";

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

  const sessions = query.data ?? [];
  const pending = sessions.filter((s) => s.status === "PENDING");
  const active = sessions.find(
    (s) => s.status === "ACTIVE" && !!s.expiresAt && new Date(s.expiresAt).getTime() > Date.now(),
  );

  /**
   * Used by the web deploy form: reuse the active session or open and approve a short
   * one in place, since the user is clicking Deploy themselves.
   */
  const ensureActiveSession = async (minutes = 15): Promise<DeploySessionInfo> => {
    const current = await sessionsApi.current();
    if (current?.status === "ACTIVE" && current.expiresAt && new Date(current.expiresAt).getTime() > Date.now()) {
      return current;
    }
    const session = current?.status === "PENDING" ? current : await sessionsApi.request(minutes / 60);
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
    isApproving: approve.isPending,
    ensureActiveSession,
  };
}
