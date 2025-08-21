import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Copy, Upload, DollarSign, CheckCircle, AlertCircle, Globe, ExternalLink, UserCheck, Settings } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { DeployModal } from '../../components/panel/DeployModal'
import { TransferOwnershipModal } from '../../components/panel/TransferOwnershipModal'
import { CustomDomainModal } from '../../components/panel/CustomDomainModal'
import { TooltipWrapper } from '../../components/ui/TooltipWrapper'
import { useCanisters } from '../../hooks/useCanisters'
import { useDeployments } from '../../hooks/useDeployments'
import { useToast } from '../../hooks/useToast'

export function CanisterPage() {
  const { id: icCanisterId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getCanister, addController } = useCanisters()
  const { deployToCanister, deployFromGit } = useDeployments()
  const { toast } = useToast()
  
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isCustomDomainModalOpen, setIsCustomDomainModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [canister, setCanister] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [deployError, setDeployError] = useState<string>('')
  const [transferError, setTransferError] = useState<string>('')
  const [isTransferring, setIsTransferring] = useState(false)

  // Fetch canister data
  const fetchCanister = async () => {
    if (!icCanisterId) return
    
    setIsLoading(true)
    setError('')
    
    const result = await getCanister(icCanisterId, true)
    
    if (result.success && result.data) {
      console.log('🎯 [CanisterPage] Canister data received:', result.data)
      setCanister(result.data)
    } else {
      setError(result.error || 'Canister not found')
    }
    
    setIsLoading(false)
  }
  
  // Load canister on mount
  useEffect(() => {
    fetchCanister()
  }, [icCanisterId])
  
  const handleDeploy = async (data: { file: File; buildCommand: string; outputDir: string }) => {
    if (!canister) return
    
    setDeployError('')

    const result = await deployToCanister({
      canisterId: canister.id, // Use internal canister ID for deployments
      file: data.file,
      buildCommand: data.buildCommand,
      outputDir: data.outputDir
    })
    
    if (result.success) {
      toast.success('Deployment started!', 'Your application is being deployed. Check the deployments page for progress.')
      // Navigate to deployments page to see the new deployment
      navigate('/panel/deployments')
    } else {
      toast.error('Deployment failed', result.error || 'Failed to start deployment')
      setDeployError(result.error || 'Failed to start deployment')
    }
  }
  
  const handleDeployFromGit = async (data: { gitRepoUrl: string; branch: string; buildCommand: string; outputDir: string }) => {
    if (!canister) return
    
    setDeployError('')

    const result = await deployFromGit({
      canisterId: canister.id, // Use internal canister ID for deployments
      gitRepoUrl: data.gitRepoUrl,
      branch: data.branch,
      buildCommand: data.buildCommand,
      outputDir: data.outputDir
    })
    
    if (result.success) {
      toast.success('Deployment started!', 'Your application is being deployed from GitHub. Check the deployments page for progress.')
      // Navigate to deployments page to see the new deployment
      navigate('/panel/deployments')
    } else {
      toast.error('Deployment failed', result.error || 'Failed to start deployment from GitHub')
      setDeployError(result.error || 'Failed to start deployment from GitHub')
    }
  }
  
  const handleTransferOwnership = async (userPrincipal: string) => {
    if (!canister) return
    
    setTransferError('')
    setIsTransferring(true)

    const result = await addController(canister.id, userPrincipal)
    
    if (result.success) {
      toast.success('Controller added successfully', 'The user has been added as a controller to this canister.')
      setIsTransferModalOpen(false)
      // Refresh canister data to get updated controller info and system flags
      console.log('=== Hello world')
      fetchCanister()
    } else {
      toast.error('Failed to add controller', result.error || 'There was an error adding the controller.')
      setTransferError(result.error || 'Failed to add controller')
    }
    
    setIsTransferring(false)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            <span className="text-lg">Loading canister...</span>
          </div>
        </div>
      </div>
    )
  }
  
  // Error state
  if (error || !canister) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">
            {error || 'Canister Not Found'}
          </h1>
          <Link to="/panel/canisters">
            <Button>Back to Canisters</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!canister) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Canister Not Found</h1>
          <Link to="/panel/canisters">
            <Button>Back to Canisters</Button>
          </Link>
        </div>
      </div>
    )
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        textArea.remove()
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError)
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'inactive':
        return <AlertCircle className="h-5 w-5 text-gray-500" />
      default:
        return null
    }
  }

  const formatCycles = (cycles: string | number) => {
    if (typeof cycles === 'string') {
      return (Number(cycles) / 1_000_000_000_000).toFixed(1)
    }
    return cycles.toFixed(1)
  }

  const canDeploy = canister?.isAssetCanister && canister?.isSystemController
  const deployTooltip = !canDeploy 
    ? "Deployment disabled: System is no longer controller or canister is not an asset canister"
    : undefined

  return (
    <div className="p-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link to="/panel/canisters" className="hover:text-foreground">
          Canisters
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{canister.name}</span>
      </nav>

      {/* General Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold mb-2">{canister.name || `${canister.icCanisterId?.slice(0, 5)}...`}</h1>
          <div className="flex items-center space-x-2">
            {getStatusIcon(canister.status)}
            <Badge variant={canister.status === 'active' ? 'success' : 'secondary'}>
              {canister.status}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3 md:flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => setIsCustomDomainModalOpen(true)}
            disabled={!canister?.isSystemController}
            className="w-full sm:w-auto"
          >
            <Settings className="mr-2 h-4 w-4" />
            Custom Domain
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsTransferModalOpen(true)}
            className="w-full sm:w-auto"
          >
            <UserCheck className="mr-2 h-4 w-4" />
            Ownership
          </Button>
          <TooltipWrapper content={deployTooltip} disabled={!deployTooltip}>
            <Button
              variant="default"
              onClick={() => setIsDeployModalOpen(true)}
              disabled={!canDeploy}
              className="w-full sm:w-auto"
            >
              <Upload className="mr-2 h-4 w-4" />
              Deploy
            </Button>
          </TooltipWrapper>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">IC Canister ID</label>
              <p className="text-sm font-mono">{canister.icCanisterId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Cycles</label>
              <div className="space-y-1">
                <p className="text-sm">{canister.cyclesBalanceRaw ? `${formatCycles(canister.cyclesBalanceRaw || canister.cycles)} TC` : "unknown"}</p>
                {canister.cyclesBalanceRaw && (
                  <p className="text-xs text-muted-foreground">
                    Raw: {BigInt(canister.cyclesBalanceRaw).toLocaleString()} cycles
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm">{new Date(canister.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="text-sm">{new Date(canister.updatedAt).toLocaleString()}</p>
            </div>
            {canister.wasmBinarySize && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">WASM Size</label>
                <p className="text-sm">{canister.wasmBinarySize}</p>
              </div>
            )}
            {canister.controllers && canister.controllers.length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Controllers</label>
                <div className="space-y-1">
                  {canister.controllers.map((controller, index) => (
                    <p key={index} className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {controller === 'i2qrn-wou4z-zo3z2-g6vlg-dma7w-siosb-tfkdt-gw2ut-s2tmr-66dzg-fae' && (
                        <span className="text-primary">(hosty.live) </span>
                      )}
                      {controller}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {canister.isAssetCanister !== undefined && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Asset Canister</label>
                <p className="text-sm">{canister.isAssetCanister ? 'Yes' : 'No'}</p>
              </div>
            )}
            {canister.isSystemController !== undefined && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Controlled by hosty.live</label>
                <p className="text-sm">{canister.isSystemController ? 'Yes' : 'No'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Frontend URL Section */}
        <Card className="group/card hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg group-hover/card:text-primary transition-colors">
              <Globe className="h-5 w-5" />
              Frontend URL
            </CardTitle>
          </CardHeader>
          <CardContent>
            {canister.frontendUrl ? (
              <div className="space-y-6">
                {/* URL Display with Copy Button */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">
                    Application URL
                  </label>
                  <div className="group/url-container relative">
                    <div 
                      className="bg-muted/50 border border-border rounded-lg p-3 pr-12 cursor-pointer hover:bg-muted/70 hover:border-primary/40 transition-all duration-200 group/url-click"
                      onClick={() => window.open(canister.frontendUrl, '_blank')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          window.open(canister.frontendUrl, '_blank')
                        }
                      }}
                      aria-label={`Open application URL: ${canister.frontendUrl}`}
                    >
                      <div 
                        className="font-mono text-sm text-foreground break-all select-text leading-relaxed group-hover/url-click:text-primary transition-colors duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canister.frontendUrl}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <ExternalLink className="h-3 w-3" />
                        <span>Click to open in new tab</span>
                      </div>
                    </div>
                    
                    {/* Compact Copy Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(canister.frontendUrl!)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-accent hover:text-primary transition-all duration-200 group/copy"
                      title={copied ? "Copied!" : "Copy URL"}
                      disabled={copied}
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-green-600 animate-in zoom-in duration-200" />
                      ) : (
                        <Copy className="h-4 w-4 transition-transform duration-200 group-hover/copy:scale-110" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Copy Success Feedback */}
                {copied && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800/50 rounded-lg animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        URL copied successfully!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
             /* Empty State */
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Frontend Deployed</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  No frontend deployed yet
                </p>
                <TooltipWrapper content={deployTooltip} disabled={!deployTooltip}>
                  <Button onClick={() => setIsDeployModalOpen(true)} disabled={!canDeploy}>
                  <Upload className="mr-2 h-4 w-4" />
                  Deploy Now
                </Button>
                </TooltipWrapper>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        onDeploy={handleDeploy}
        onDeployFromGit={handleDeployFromGit}
        canister={canister}
        error={deployError}
      />

      <TransferOwnershipModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onTransfer={handleTransferOwnership}
        canister={canister}
        isLoading={isTransferring}
        error={transferError}
      />

      <CustomDomainModal
        isOpen={isCustomDomainModalOpen}
        onClose={() => setIsCustomDomainModalOpen(false)}
        canister={canister}
      />
    </div>
  )
}