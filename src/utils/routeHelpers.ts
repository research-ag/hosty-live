import { useLocation, useNavigate } from 'react-router-dom'
import { useCallback } from 'react'

/**
 * Custom hook for URL state management
 */
export function useURLState() {
  const location = useLocation()
  const navigate = useNavigate()

  const setURLParams = useCallback((params: Record<string, string | number | undefined>) => {
    const searchParams = new URLSearchParams(location.search)
    
    // Update or remove parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        searchParams.delete(key)
      } else {
        searchParams.set(key, String(value))
      }
    })
    
    // Navigate with new search params
    navigate({
      pathname: location.pathname,
      search: searchParams.toString()
    }, { replace: true })
  }, [location, navigate])

  const getURLParam = useCallback((key: string, defaultValue?: string): string | undefined => {
    const searchParams = new URLSearchParams(location.search)
    return searchParams.get(key) || defaultValue
  }, [location.search])

  const clearURLParams = useCallback(() => {
    navigate({
      pathname: location.pathname,
      search: ''
    }, { replace: true })
  }, [location.pathname, navigate])

  return {
    setURLParams,
    getURLParam,
    clearURLParams,
    searchParams: new URLSearchParams(location.search)
  }
}

/**
 * Route validation helpers
 */
export const routeValidators = {
  isValidCanisterId: (id: string): boolean => {
    // Basic validation for Internet Computer canister IDs
    return /^[a-z0-9-]+$/.test(id) && id.length > 10
  },
  
  isValidDeploymentId: (id: string): boolean => {
    // Basic validation for deployment IDs
    return /^dep_[a-zA-Z0-9]+$/.test(id)
  }
}

/**
 * Navigation helpers with type safety
 */
export const navigationHelpers = {
  goToCanister: (navigate: ReturnType<typeof useNavigate>) => (id: string) => {
    if (!routeValidators.isValidCanisterId(id)) {
      console.warn('Invalid canister ID:', id)
      return
    }
    navigate(`/panel/canister/${id}`)
  },
  
  goToDeployment: (navigate: ReturnType<typeof useNavigate>) => (id: string) => {
    if (!routeValidators.isValidDeploymentId(id)) {
      console.warn('Invalid deployment ID:', id)
      return
    }
    navigate(`/panel/deployment/${id}`)
  },
  
  goToCanistersWithFilters: (navigate: ReturnType<typeof useNavigate>) => (
    filters?: { page?: number; sortBy?: string; sortDirection?: 'asc' | 'desc' }
  ) => {
    const searchParams = new URLSearchParams()
    
    if (filters?.page && filters.page !== 1) {
      searchParams.set('page', String(filters.page))
    }
    if (filters?.sortBy && filters.sortBy !== 'name') {
      searchParams.set('sortBy', filters.sortBy)
    }
    if (filters?.sortDirection && filters.sortDirection !== 'asc') {
      searchParams.set('sortDirection', filters.sortDirection)
    }
    
    const search = searchParams.toString()
    navigate(`/panel/canisters${search ? `?${search}` : ''}`)
  }
}