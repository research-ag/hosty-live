import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, ExternalLink, Github, Link as LinkIcon, RefreshCw, RotateCcw, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { LiveLogConsole } from '../../components/ui/LiveLogConsole'
import { ConnectionStatus } from '../../components/ui/ConnectionStatus'
import { useDeployment, useDeployments } from '../../hooks/useDeployments'
import { useCanisters } from '../../hooks/useCanisters'
import { useToast } from '../../hooks/useToast'
import { useRealTimeDeployments } from '../../hooks/useRealTimeDeployments'
import {
  formatDuration,
  getSourceTypeLabel,
  getStatusLabel,
  getStatusVariant,
  isActivelyBuilding
} from '../../lib/deploymentHelpers'
import { getBackendActor } from '../../api/backend'
import { DeploymentExampleInput } from "../../api/backend/backend.did";

export function DeploymentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    deployment,
    isLoading: deploymentLoading,
    error: deploymentError,
    refreshDeployment
  } = useDeployment(id)
  const { redeploy, isRedeploying } = useDeployments()
  const { getCanister } = useCanisters()
  const { toast } = useToast()

  const [canister, setCanister] = useState<any>(null)
  const [canisterLoading, setCanisterLoading] = useState(false)
  const [canisterError, setCanisterError] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSavingExample, setIsSavingExample] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [exampleDescription, setExampleDescription] = useState('')
  const [exampleError, setExampleError] = useState<string | null>(null)

  // Real-time WebSocket connection
  const { connectionStatus } = useRealTimeDeployments({
    onLog: (deploymentId) => {
      if (deploymentId === id) {
        console.log('📝 [DeploymentPage] Received log chunk for current deployment')
      }
    },
    onDeploymentUpdated: (updatedDeployment) => {
      if (updatedDeployment.id === id) {
        console.log('📦 [DeploymentPage] Current deployment updated:', updatedDeployment.status)

        // Show toast for status changes
        if (updatedDeployment.status === 'SUCCESS') {
          toast.success('Deployment Successful', 'Your deployment is now live!')
        } else if (updatedDeployment.status === 'FAILED') {
          toast.error('Deployment Failed', updatedDeployment.statusReason || 'Check logs for details')
        }
      }
    }
  })

  // Check if deployment is currently building
  const isBuilding = deployment ? isActivelyBuilding(deployment.status) : false

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

  const handleRedeploy = async () => {
    if (!deployment) return
    const result = await redeploy(deployment.id)
    if (result.success) {
      toast.success('Redeployment Started', 'A new deployment has been triggered')
      if (result.data?.id) {
        navigate(`/panel/deployment/${result.data.id}`)
      }
    } else {
      toast.error('Redeploy Failed', result.error || 'Could not start redeployment')
    }
  }

  // Check if redeploy is available (only for GIT and URL sources)
  const canRedeploy = deployment && (deployment.sourceType === 'GIT' || deployment.sourceType === 'URL')

  // Loading state
  if (deploymentLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"/>
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

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'GIT':
        return <Github className="h-5 w-5 text-blue-500"/>
      case 'URL':
        return <LinkIcon className="h-5 w-5 text-purple-500"/>
      case 'ZIP':
      default:
        return <Upload className="h-5 w-5 text-green-500"/>
    }
  }
  // Save deployment as public example
  const canSaveAsExample = deployment.status === 'SUCCESS' && (deployment.sourceType === 'GIT' || deployment.sourceType === 'URL')

  const serializeEnvVars = (vars?: Record<string, string> | null): string => {
    if (!vars) return ''
    try {
      return Object.entries(vars)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n')
    } catch {
      return ''
    }
  }

  const openSaveDialog = () => {
    setExampleDescription('')
    setExampleError(null)
    setSaveDialogOpen(true)
  }

  const handleSaveAsExample = async () => {
    const description = (exampleDescription || '').trim()
    if (!description) {
      setExampleError('Please enter a short description for the example.')
      return
    }

    try {
      setIsSavingExample(true)
      setExampleError(null)
      const actor = await getBackendActor()

      // Build example payload
      let url = ''
      let kind: DeploymentExampleInput['kind'] = { archive: null }
      if (deployment.sourceType === 'GIT' && deployment.sourceGitRepo) {
        url = deployment.sourceGitRepo
        const branch = deployment.gitBranch || 'main'
        kind = { git: branch }
      } else if (deployment.sourceType === 'URL' && deployment.sourceZipUrl) {
        url = deployment.sourceZipUrl
        kind = { archive: null }
      } else {
        toast.error('Unsupported source', 'Only GitHub and Archive URL deployments can be saved as examples.')
        setIsSavingExample(false)
        return
      }
      let assets: DeploymentExampleInput['assets'] = { pure: null }
      if (!deployment.pureAssets) {
        assets = {
          build: {
            command: deployment.buildCommand || 'npm run build',
            envVars: serializeEnvVars(deployment.envVars || undefined)
          }
        }
      }

      const payload: DeploymentExampleInput = {
        description,
        kind,
        url,
        assets,
        assetsDir: deployment.outputDir || 'dist',
      }

      await actor.addDeploymentExample(payload)
      toast.success('Example saved', 'Your deployment has been added to the public examples list.')
      setSaveDialogOpen(false)
    } catch (e: any) {
      console.error('[DeploymentPage] Failed to save example', e)
      setExampleError(e?.message || 'Failed to save example')
      toast.error('Failed to save example', e?.message || 'Please try again later')
    } finally {
      setIsSavingExample(false)
    }
  }

  return (
    <div className="p-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link to="/panel/deployments" className="hover:text-foreground">
          Deployments
        </Link>
        <ChevronRight className="h-4 w-4"/>
        <span className="text-foreground" title={deployment.id}>{deployment.id.slice(0, 7)}</span>
      </nav>

      {/* General Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl sm:text-2xl font-semibold" title={deployment.id}>Deployment {deployment.id.slice(0, 7)}</h1>
            {deployment.isDryRun && (
              <Badge variant="secondary"
                     className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                Dry-Run
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={getStatusVariant(deployment.status)}>{getStatusLabel(deployment.status)}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Source:</span>
              {getSourceIcon(deployment.sourceType)}
              <span className="text-sm">{getSourceTypeLabel(deployment.sourceType)}</span>
            </div>
            {deployment.statusReason && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Reason:</span>
                <span className="text-sm text-muted-foreground">{deployment.statusReason}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <ConnectionStatus status={connectionStatus}/>
          {canRedeploy && (
            <Button
              variant="default"
              onClick={handleRedeploy}
              disabled={isRedeploying}
              size="sm"
              className="flex items-center gap-2"
            >
              <RotateCcw className={`h-4 w-4 ${isRedeploying ? 'animate-spin' : ''}`}/>
              {isRedeploying ? 'Redeploying...' : 'Redeploy'}
            </Button>
          )}
          {canSaveAsExample && (
            <Button
              variant="secondary"
              onClick={openSaveDialog}
              disabled={isSavingExample}
              size="sm"
              className="flex items-center gap-2"
              title="Add this deployment configuration as a public example"
            >
              {isSavingExample ? 'Saving…' : 'Save as example'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={deploymentLoading || canisterLoading || isRefreshing}
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${deploymentLoading || canisterLoading || isRefreshing ? 'animate-spin' : ''}`}/>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* General Details */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deployment.isDryRun && (
              <div
                className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <span className="font-semibold">Test Build:</span> This was a dry-run deployment. The build process
                  was executed, but no actual deployment to the canister was performed.
                </p>
              </div>
            )}
            {deployment.pureAssets && (
              <div
                className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-3">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  <span className="font-semibold">Pure Assets:</span> This deployment used pre-built assets. No build
                  process or dependency installation was performed.
                </p>
              </div>
            )}
            {deployment.redeployedFromId && (
              <div
                className="rounded-lg border border-muted bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  <span>
                    <span className="font-semibold">Redeployed from:</span>{' '}
                    <Link
                      to={`/panel/deployment/${deployment.redeployedFromId}`}
                      className="font-mono hover:text-primary transition-colors"
                    >
                      {deployment.redeployedFromId.slice(0, 7)}
                    </Link>
                  </span>
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Canister</label>
              <div className="mt-1 space-y-2">
                <Link
                  to={`/panel/canister/${canister?.id || deployment.canisterId}`}
                  className="inline-flex items-center gap-2 text-sm font-mono hover:text-primary transition-colors group"
                >
                  <span className="group-hover:underline">{canister?.id || deployment.canisterId}</span>
                  <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity"/>
                </Link>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                <Badge variant={getStatusVariant(deployment.status)}>{getStatusLabel(deployment.status)}</Badge>
              </div>
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
            {!deployment.pureAssets && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Build Command</label>
                <p
                  className="text-sm font-mono bg-muted px-2 py-1 rounded">{deployment.buildCommand || 'npm run build'}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {deployment.pureAssets ? 'Assets Directory' : 'Output Directory'}
              </label>
              <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{deployment.outputDir || 'dist'}</p>
            </div>
            {deployment.sourceType === 'GIT' && deployment.sourceGitRepo && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Repository</label>
                <p className="text-sm font-mono bg-muted px-2 py-1 rounded break-all">{deployment.sourceGitRepo}</p>
              </div>
            )}
            {deployment.sourceType === 'GIT' && deployment.gitBranch && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Branch</label>
                <p className="text-sm font-mono bg-muted px-2 py-1 rounded">{deployment.gitBranch}</p>
              </div>
            )}
            {deployment.sourceType === 'URL' && deployment.sourceZipUrl && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Archive URL</label>
                <p className="text-sm font-mono bg-muted px-2 py-1 rounded break-all">{deployment.sourceZipUrl}</p>
              </div>
            )}
            {deployment.envVars && Object.keys(deployment.envVars).length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Environment Variables</label>
                <div className="text-sm font-mono bg-muted px-3 py-2 rounded mt-1 space-y-1">
                  {Object.entries(deployment.envVars).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-muted-foreground">{key}=</span>
                      <span className="break-all">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Duration</label>
              <p className="text-sm">{formatDuration(deployment.durationMs)}</p>
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

      {/* Build Logs - Real-time Streaming */}
      {(deployment.buildLogs || isBuilding) && (
        <div className="mt-6">
          <LiveLogConsole
            logs={deployment.buildLogs || ''}
            isLive={isBuilding && connectionStatus === 'connected'}
            title="Build Logs"
          />
        </div>
      )}
      {/* Save as public example dialog */}
      <ConfirmDialog
        isOpen={saveDialogOpen}
        title="Save as public example"
        description={
          <div className="space-y-2">
            <p>
              This will save the current deployment configuration as a reusable example.
              The example becomes <span className="font-semibold">public</span> and will be visible to everyone.
            </p>
          </div>
        }
        confirmLabel={isSavingExample ? 'Saving…' : 'Save example'}
        cancelLabel="Cancel"
        isLoading={isSavingExample}
        onConfirm={handleSaveAsExample}
        onCancel={() => setSaveDialogOpen(false)}
        error={exampleError || undefined}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Short description (name)
          </label>
          <Input
            autoFocus
            placeholder="e.g. React + Vite (dist)"
            value={exampleDescription}
            onChange={(e) => setExampleDescription(e.target.value)}
            disabled={isSavingExample}
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
