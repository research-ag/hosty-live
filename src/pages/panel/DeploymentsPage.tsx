import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Github,
  RefreshCw,
  Upload,
  XCircle,
  Zap,
  Link as LinkIcon
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { SortButton } from '../../components/ui/SortButton'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ConnectionStatus } from '../../components/ui/ConnectionStatus'
import { useDeployments } from '../../hooks/useDeployments'
import { useRealTimeDeployments } from '../../hooks/useRealTimeDeployments'
import { useToast } from '../../hooks/useToast'
import { getStatusVariant, getStatusLabel, isActivelyBuilding, getSourceTypeLabel, formatDuration } from '../../lib/deploymentHelpers'
import type { DeploymentStatus } from '../../types'

export function DeploymentsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()

  // Read initial state from URL parameters
  const initialPage = parseInt(searchParams.get('page') || '1', 10)
  const initialSortField = searchParams.get('sortBy') || 'createdAt'
  const initialSortDirection = (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc'

  const {
    deployments,
    isLoading,
    error,
    refreshDeployments
  } = useDeployments()

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [sortField, setSortField] = useState(initialSortField)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection)

  // Real-time WebSocket connection
  const { connectionStatus } = useRealTimeDeployments({
    onDeploymentUpdated: (updatedDeployment) => {
      console.log('📦 [DeploymentsPage] Deployment updated:', updatedDeployment.id, updatedDeployment.status)
      
      // Show subtle toast for successful deployments
      if (updatedDeployment.status === 'SUCCESS') {
        toast.success('Deployment Complete', `Deployment ${updatedDeployment.id.slice(0, 7)} is now live`)
      }
    }
  })

  const itemsPerPage = 9
  const totalPages = Math.ceil(deployments.length / itemsPerPage)

  // Update URL when state changes
  const updateURL = (page: number, sortBy: string, direction: 'asc' | 'desc') => {
    const params = new URLSearchParams()
    if (page !== 1) params.set('page', page.toString())
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy)
    if (direction !== 'desc') params.set('sortDirection', direction)

    setSearchParams(params)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshDeployments()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSort = (field: string) => {
    let newDirection: 'asc' | 'desc'
    if (sortField === field) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    } else {
      newDirection = 'asc'
    }

    setSortField(field)
    setSortDirection(newDirection)
    setCurrentPage(1) // Reset to first page when sorting changes
    updateURL(1, field, newDirection)
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    updateURL(newPage, sortField, sortDirection)
  }

  const sortedDeployments = [...deployments].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const paginatedDeployments = sortedDeployments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getStatusIcon = (status: DeploymentStatus) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-500"/>
      case 'BUILDING':
      case 'DEPLOYING':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse"/>
      case 'FAILED':
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-500"/>
      case 'PENDING':
        return <AlertCircle className="h-4 w-4 text-yellow-500"/>
      default:
        return <Zap className="h-4 w-4"/>
    }
  }

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'GIT':
        return <Github className="h-4 w-4 text-blue-500"/>
      case 'URL':
        return <LinkIcon className="h-4 w-4 text-purple-500"/>
      case 'ZIP':
      default:
        return <Upload className="h-4 w-4 text-green-500"/>
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold">Deployments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your deployment history and status
          </p>
        </div>

        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"/>
            <span className="text-lg">Loading deployments...</span>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold">Deployments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your deployment history and status
          </p>
        </div>

        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => {
                handleRefresh()
              }}>
                <Zap className="mr-2 h-4 w-4"/>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Deployments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your deployment history and status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatus status={connectionStatus} />
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`}/>
            Refresh
          </Button>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex flex-wrap gap-2 mb-6 p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mr-2">
          Sort by:
        </div>
        <SortButton
          label="ID"
          active={sortField === 'id'}
          direction={sortDirection}
          onClick={() => handleSort('id')}
        />
        <SortButton
          label="Created At"
          active={sortField === 'createdAt'}
          direction={sortDirection}
          onClick={() => handleSort('createdAt')}
        />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {paginatedDeployments.map((deployment) => {
          const isActive = isActivelyBuilding(deployment.status)
          
          return (
          <Card
            key={deployment.id}
            className={`group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer border-border/50 hover:border-primary/20 ${
              isActive && connectionStatus === 'connected' ? 'ring-2 ring-blue-500/50 shadow-blue-500/20' : ''
            }`}
            onClick={() => navigate(`/panel/deployment/${deployment.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getStatusIcon(deployment.status)}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg font-semibold font-mono group-hover:text-primary transition-colors"
                               title={deployment.id}>
                      {deployment.id.slice(0, 7)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                      Canister ID: {deployment.canisterId.slice(0, 5)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {getSourceIcon(deployment.sourceType)}
                    <span className="text-xs text-muted-foreground">
                      {getSourceTypeLabel(deployment.sourceType)}
                    </span>
                  </div>
                  <Badge variant={getStatusVariant(deployment.status)}>{getStatusLabel(deployment.status)}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs font-medium">Duration</p>
                  <p className="font-semibold">{formatDuration(deployment.durationMs)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium">Build</p>
                  <p className="font-mono text-xs bg-muted px-2 py-1 rounded truncate">
                    {deployment.buildCommand || 'npm run build'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-xs font-medium mb-1">Status Reason</p>
                <p className="text-sm truncate" title={deployment.statusReason}>
                  {deployment.statusReason || 'No additional information'}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs font-medium mb-1">Created</p>
                <p className="text-sm">
                  {new Date(deployment.createdAt).toLocaleString()}
                </p>
              </div>

              {deployment.deployedAt && (
                <div>
                  <p className="text-muted-foreground text-xs font-medium mb-1">Deployed</p>
                  <p className="text-sm">
                    {new Date(deployment.deployedAt).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/panel/deployment/${deployment.id}`)
                  }}
                  className="flex items-center gap-1 text-xs hover:bg-primary/10"
                >
                  <Eye className="h-3 w-3"/>
                  View Details
                </Button>
                {deployment.buildServiceJobId && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {deployment.buildServiceJobId.slice(0, 14)}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )})}
      </div>

      {/* Empty State */}
      {deployments.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
            <h3 className="text-lg font-semibold mb-2">No deployments yet</h3>
            <p className="text-muted-foreground mb-4">
              Your deployment history will appear here once you start deploying to canisters.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, deployments.length)} of {deployments.length} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4"/>
                Previous
              </Button>
              <span className="text-sm px-3 py-1 bg-muted rounded-md">
                {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4"/>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}