import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { oauthApi } from '../services/oauth'
import { CONNECTED_APPS_QUERY_KEY, DEPLOY_SESSIONS_QUERY_KEY } from './useDeploySessions'

/** Apps connected with OAuth (claude.ai connector, Claude Code /mcp). `enabled` is false while the API has OAuth off. */
export function useConnectedApps() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: CONNECTED_APPS_QUERY_KEY,
    queryFn: oauthApi.listApps,
  })

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => oauthApi.disconnect(id),
    // settled: a disconnect whose session cleanup failed has still revoked the app
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CONNECTED_APPS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: DEPLOY_SESSIONS_QUERY_KEY })
    },
  })

  return {
    apps: data ?? [],
    enabled: data !== null && data !== undefined,
    isLoading,
    disconnect: disconnectMutation.mutateAsync,
    isDisconnecting: disconnectMutation.isPending,
  }
}
