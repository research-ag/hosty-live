import { useState, useEffect } from 'react'
import { Info, AlertTriangle, Zap, Server, Upload, Github } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { FileUploader } from '../ui/FileUploader'
import { TooltipWrapper } from '../ui/TooltipWrapper'
import { useToast } from '../../hooks/useToast'
import { Canister } from '../../types'

type DeploymentMethod = 'zip' | 'git'

interface DeployModalProps {
  isOpen: boolean
  onClose: () => void
  onDeploy: (data: { file: File; buildCommand: string; outputDir: string }) => void
  onDeployFromGit: (data: { gitRepoUrl: string; branch: string; buildCommand: string; outputDir: string }) => void
  canister?: Canister | null
  error?: string
}

export function DeployModal({ isOpen, onClose, onDeploy, onDeployFromGit, canister, error }: DeployModalProps) {
  const [deploymentMethod, setDeploymentMethod] = useState<DeploymentMethod>('zip')
  const [file, setFile] = useState<File | null>(null)
  const [gitRepoUrl, setGitRepoUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [buildCommand, setBuildCommand] = useState('npm run build')
  const [outputDir, setOutputDir] = useState('dist')
  const [isDeploying, setIsDeploying] = useState(false)
  const { toast } = useToast()

  type PersistedDeployForm = {
    method: DeploymentMethod
    gitRepoUrl: string
    branch: string
    buildCommand: string
    outputDir: string
  }

  const getLsKey = (canisterId: string) => `deploy_form:${canisterId}`

  const persistForm = () => {
    const canisterId = canister?.icCanisterId
    if (!canisterId) return
    const payload: PersistedDeployForm = {
      method: deploymentMethod,
      gitRepoUrl,
      branch,
      buildCommand,
      outputDir,
    }
    try {
      localStorage.setItem(getLsKey(canisterId), JSON.stringify(payload))
    } catch {}
  }

  useEffect(() => {
    const canisterId = canister?.icCanisterId
    if (!isOpen || !canisterId) return
    try {
      const raw = localStorage.getItem(getLsKey(canisterId))
      if (!raw) return
      const data = JSON.parse(raw) as Partial<PersistedDeployForm>
      if (data.method === 'zip' || data.method === 'git') setDeploymentMethod(data.method)
      if (typeof data.gitRepoUrl === 'string') setGitRepoUrl(data.gitRepoUrl)
      if (typeof data.branch === 'string') setBranch(data.branch)
      if (typeof data.buildCommand === 'string') setBuildCommand(data.buildCommand)
      if (typeof data.outputDir === 'string') setOutputDir(data.outputDir)
    } catch {}
  }, [isOpen, canister?.icCanisterId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsDeploying(true)
    
    try {
      if (deploymentMethod === 'zip') {
        if (!file) {
          toast.error('Please select a file', 'A ZIP file is required for deployment.')
          return
        }
        await onDeploy({ file, buildCommand, outputDir })
      } else {
        if (!gitRepoUrl) {
          toast.error('Please enter a repository URL', 'A GitHub repository URL is required for deployment.')
          return
        }
        await onDeployFromGit({ gitRepoUrl, branch, buildCommand, outputDir })
      }
      
      if (!error) {
        // Persist form values per canister on successful run
        persistForm()
        onClose()
        // Reset form
        setFile(null)
        setGitRepoUrl('')
        setBranch('main')
        setBuildCommand('npm run build')
        setOutputDir('dist')
      }
    } finally {
      setIsDeploying(false)
    }
  }

  const handleClose = () => {
    // Reset form when closing
    setFile(null)
    setGitRepoUrl('')
    setBranch('main')
    setBuildCommand('npm run build')
    setOutputDir('dist')
    setDeploymentMethod('zip')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Deploy to Canister" className="max-w-sm sm:max-w-lg md:max-w-xl lg:max-w-2xl">
      <div className="space-y-6">
        {/* Canister Info Section */}
        {canister && (
          <div className="bg-muted/30 border border-border/50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Server className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm">Target Canister</h3>
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-muted-foreground text-xs sm:text-sm">ID:</span>
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded break-all">
                  {canister.icCanisterId}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-muted-foreground text-xs sm:text-sm">Status:</span>
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  {canister.status}
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}
          
          {/* Deployment Method Tabs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label className="block text-sm font-medium">Source type</label>
              <TooltipWrapper content="Choose how you want to deploy your application - upload a ZIP file or connect a GitHub repository.">
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipWrapper>
            </div>
            <div className="flex rounded-lg border p-1 bg-muted/30">
              <button
                type="button"
                onClick={() => setDeploymentMethod('zip')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  deploymentMethod === 'zip'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Upload className="h-4 w-4" />
                ZIP Upload
              </button>
              <button
                type="button"
                onClick={() => setDeploymentMethod('git')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  deploymentMethod === 'git'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Github className="h-4 w-4" />
                GitHub Repo
              </button>
            </div>
          </div>
          {/* ZIP File Upload */}
          {deploymentMethod === 'zip' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <label className="block text-sm font-medium">Application Package</label>
                <TooltipWrapper content="Upload a ZIP file containing your built frontend application. The ZIP should include all necessary files and assets for your web application.">
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipWrapper>
              </div>
              <FileUploader
                onFileSelect={setFile}
                accept=".zip"
                maxSize={100 * 1024 * 1024} // 100MB
              />
            </div>
          )}

          {/* GitHub Repository */}
          {deploymentMethod === 'git' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium">GitHub Repository URL</label>
                  <TooltipWrapper content="Enter the URL of your public GitHub repository. The repository should contain your frontend application source code.">
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipWrapper>
                </div>
                <Input
                  value={gitRepoUrl}
                  onChange={(e) => setGitRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  required
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium">Branch</label>
                  <TooltipWrapper content="The branch to deploy from. Usually 'main' or 'master' for production deployments.">
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipWrapper>
                </div>
                <Input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  required
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}

          {/* Build Command */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium">Build Command</label>
              <TooltipWrapper content="The command used to build your application. This should generate production-ready files in your output directory.">
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipWrapper>
            </div>
            <Input
              value={buildCommand}
              onChange={(e) => setBuildCommand(e.target.value)}
              placeholder="npm run build"
              required
              className="font-mono text-sm"
            />
          </div>

          {/* Output Directory */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium">Output Directory</label>
              <TooltipWrapper content="The directory containing the built files after running the build command. Common examples: dist, build, out, public.">
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipWrapper>
            </div>
            <Input
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
              placeholder="dist"
              required
              className="font-mono text-sm"
            />
          </div>

          {/* Important Notes */}
          <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h4 className="font-medium text-sm sm:text-base text-amber-800 dark:text-amber-200">
                Notes
              </h4>
            </div>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-amber-700 dark:text-amber-300">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1 shrink-0"></span>
                <span>This deployment will replace the current version of your application</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1 shrink-0"></span>
                <span>The canister may be briefly unavailable during the deployment process</span>
              </li>
              {deploymentMethod === 'zip' && (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-1 shrink-0"></span>
                  <span>Ensure your ZIP file includes all necessary assets and dependencies</span>
                </li>
              )}
              {deploymentMethod === 'git' && (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-2 shrink-0"></span>
                  <span>Make sure your repository is public and accessible</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mt-2 shrink-0"></span>
                <span>Ensure your ZIP file includes all necessary assets and dependencies</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-3 sm:gap-0 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isDeploying}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={(deploymentMethod === 'zip' && !file) || (deploymentMethod === 'git' && !gitRepoUrl) || isDeploying}
              className="flex items-center justify-center gap-2"
            >
              {isDeploying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  <span className="hidden sm:inline">Deploying...</span>
                  <span className="sm:hidden">Deploy...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">Deploy Application</span>
                  <span className="sm:hidden">Deploy</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}