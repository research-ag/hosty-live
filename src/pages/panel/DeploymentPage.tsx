import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, ChevronDown, ChevronUp, ExternalLink, Copy, CheckCircle, RefreshCw, Upload, Github } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useDeployment } from '../../hooks/useDeployments'
import { useCanisters } from '../../hooks/useCanisters'
import { useToast } from '../../hooks/useToast'

export function DeploymentPage() {
  const { id } = useParams<{ id: string }>()
  const { 
    deployment, 
    isLoading: deploymentLoading, 
    error: deploymentError, 
    refreshDeployment 
  } = useDeployment(id)
  const { getCanister } = useCanisters()
  const { toast } = useToast()
  
  const [showBuildLogs, setShowBuildLogs] = useState(false)
  const [copied, setCopied] = useState(false)
  const [canister, setCanister] = useState<any>(null)
  const [canisterLoading, setCanisterLoading] = useState(false)
  const [canisterError, setCanisterError] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch canister data when deployment data is available
  useEffect(() => {
    const fetchCanister = async () => {
      if (!deployment?.canisterId) return
      
      setCanisterLoading(true)
      setCanisterError('')
      
      const canisterResult = await getCanister(deployment.canisterId)
      if (canisterResult.success) {
        if (canisterResult.data) {
          setCanister(canisterResult.data)
        } else {
          setCanisterError('Failed to load canister details')
        }
      } else {
        setCanisterError(canisterResult.error || 'Failed to load canister details')
      }
      setCanisterLoading(false)
    }
    
    fetchCanister()
  }, [deployment?.canisterId])
  
  // Handle refresh - refresh both deployment and canister data
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshDeployment()
      if (deployment?.canisterId) {
        setCanisterLoading(true)
        const canisterResult = await getCanister(deployment.canisterId)
        if (canisterResult.success && canisterResult.data) {
          setCanister(canisterResult.data)
        }
        setCanisterLoading(false)
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  // Loading state
  if (deploymentLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            <span className="text-lg">Loading deployment...</span>
          </div>
        </div>
      </div>
    )
  }
  
  // Error state
  if (deploymentError || !deployment) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">
            {deploymentError || 'Deployment Not Found'}
          </h1>
          <Link to="/panel/deployments">
            <Button>Back to Deployments</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!deployment) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Deployment Not Found</h1>
          <Link to="/panel/deployments">
            <Button>Back to Deployments</Button>
          </Link>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => { 
    const variants = {
      pending: 'secondary',
      building: 'default',
      deployed: 'success',
      failed: 'destructive'
    } as const
    
    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A'
    return `${(duration / 1000).toFixed(1)}s`
  }

  const getSourceIcon = (sourceType?: string) => {
    switch (sourceType) {
      case 'git':
        return <Github className="h-5 w-5 text-blue-500" />
      case 'zip':
      default:
        return <Upload className="h-5 w-5 text-green-500" />
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  return (
    <div className="p-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link to="/panel/deployments" className="hover:text-foreground">
          Deployments
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground" title={deployment.id}>{deployment.id.slice(0, 7)}</span>
      </nav>

      {/* General Info */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2" title={deployment.id}>Deployment {deployment.id.slice(0, 7)}</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Status:</span>
              {getStatusBadge(deployment.status)}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Source:</span>
              <div className="flex items-center gap-2">
                {getSourceIcon(deployment.sourceType)}
                <span className="text-sm capitalize">{deployment.sourceType || 'zip'}</span>
              </div>
            </div>
            {deployment.statusReason && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Reason:</span>
                <span className="text-sm text-muted-foreground">{deployment.statusReason}</span>
              </div>
            )}
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={deploymentLoading || canisterLoading || isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${deploymentLoading || canisterLoading || isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* General Details */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Canister</label>
              <div className="mt-1 space-y-2">
                <Link 
                  to={`/panel/canister/${canister?.id || deployment.canisterId}`}
                  className="inline-flex items-center gap-2 text-sm font-mono hover:text-primary transition-colors group"
                >
                  <span className="group-hover:underline">{canister?.id || deployment.canisterId}</span>
                  <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                </Link>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">{getStatusBadge(deployment.status)}</div>
            </div>
            {deployment.statusReason && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status Reason</label>
                <p className="text-sm">{deployment.statusReason}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm">{new Date(deployment.createdAt).toLocaleString()}</p>
            </div>
            {deployment.deployedAt && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Deployed At</label>
                <p className="text-sm">{new Date(deployment.deployedAt).toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Build Command</label>
              <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{deployment.buildCommand}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Output Directory</label>
              <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{deployment.outputDirectory}</p>
            </div>
            {deployment.sourceType === 'git' && deployment.sourceGitRepo && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Repository</label>
            <p className="text-sm font-mono bg-muted px-2 py-1 rounded break-all">{deployment.sourceGitRepo}</p>
          </div>
        )}
        {deployment.sourceType === 'git' && deployment.gitBranch && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Branch</label>
            <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{deployment.gitBranch}</p>
          </div>
        )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Duration</label>
              <p className="text-sm">{formatDuration(deployment.duration)}</p>
            </div>
            {deployment.buildServiceJobId && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Build Service Job ID</label>
                <p className="text-sm font-mono">{deployment.buildServiceJobId}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Build Logs */}
      {deployment.buildLogs && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Build Logs</CardTitle>
              <Button
                variant="ghost"
                onClick={() => setShowBuildLogs(!showBuildLogs)}
                className="flex items-center space-x-2"
              >
                <span>{showBuildLogs ? 'Hide' : 'Show'} Logs</span>
                {showBuildLogs ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {showBuildLogs && (
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded-md overflow-auto whitespace-pre-wrap">
                {deployment.buildLogs}
              </pre>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
