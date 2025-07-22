import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cyclesApi, faucetApi } from '../services/api'
import type { CyclesInfo, FaucetStatus, FaucetClaimResult } from '../types'
import { useToast } from './useToast'

export function useCycles() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Query for cycles info
  const {
    data: cyclesInfo,
    isLoading: cyclesLoading,
    error: cyclesError
  } = useQuery({
    queryKey: ['cycles', 'info'],
    queryFn: cyclesApi.getCyclesInfo,
    staleTime: 30 * 1000, // Data considered fresh for 30 seconds
    refetchOnWindowFocus: true,
    retry: 2
  })

  // Query for faucet status
  const {
    data: faucetStatus,
    isLoading: faucetLoading,
    error: faucetError
  } = useQuery({
    queryKey: ['cycles', 'faucet'],
    queryFn: faucetApi.getFaucetStatus,
    staleTime: 60 * 1000, // Faucet status changes less frequently
    refetchOnWindowFocus: true,
    retry: 2
  })

  // Mutation for claiming cycles
  const claimCyclesMutation = useMutation({
    mutationFn: faucetApi.claimCycles,
    onSuccess: () => {
      // Invalidate both cycles info and faucet status
      queryClient.invalidateQueries({ queryKey: ['cycles'] })
    },
    onError: (error: any) => {
      console.error('Failed to claim cycles:', error)
    }
  })

  // Combine loading states
  const isLoading = cyclesLoading || faucetLoading

  // Combine errors
  const error = cyclesError || faucetError ? 
    (cyclesError instanceof Error ? cyclesError.message : 
     faucetError instanceof Error ? faucetError.message : 
     'Failed to fetch cycles data') : ''

  // Refresh all data
  const refreshData = async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cycles', 'info'] }),
        queryClient.invalidateQueries({ queryKey: ['cycles', 'faucet'] })
      ])
  }

  // Claim cycles from faucet
  const claimCycles = async (): Promise<{ success: boolean; error?: string; data?: FaucetClaimResult }> => {
    try {
      const result = await claimCyclesMutation.mutateAsync()
      return { success: true, data: result }
    } catch (err: any) {
      console.error('Failed to claim cycles:', err)
      
      if (err.isCooldown) {
        return { 
          success: false, 
          error: `Faucet is on cooldown. Next claim available at: ${new Date(err.nextAvailableAt).toLocaleString()}`
        }
      }
      
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to claim cycles' 
      }
    }
  }

  // Format cycles always in TC (terracycles) - consistent across entire app
  const formatCycles = (cyclesString: string) => {
    const cycles = BigInt(cyclesString)
    const trillion = 1_000_000_000_000n
    const tc = Number(cycles) / Number(trillion)
    return tc.toFixed(1)
  }

  return {
    cyclesInfo,
    faucetStatus,
    isLoading,
    error,
    claimCycles,
    refreshData,
    formatCycles
  }
}