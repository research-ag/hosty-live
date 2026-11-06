import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tokensApi } from '../services/api'

export function useApiTokens() {
  const queryClient = useQueryClient()

  const { data: tokens = [], isLoading, error } = useQuery({
    queryKey: ['api-tokens'],
    queryFn: tokensApi.list,
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => tokensApi.create(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-tokens'] }),
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => tokensApi.revoke(id),
    // settled: a revoke whose session cleanup failed has still revoked the token
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] })
      // the API ends the deploy sessions the token requested
      queryClient.invalidateQueries({ queryKey: ['deploy-sessions'] })
    },
  })

  return {
    tokens,
    isLoading,
    error,
    createToken: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    revokeToken: revokeMutation.mutateAsync,
    isRevoking: revokeMutation.isPending,
  }
}
