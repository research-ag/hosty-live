import { useState, useEffect } from 'react'
import { Globe, Info, Loader2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { customDomainApi } from '../../services/api'
import { Canister } from '../../types'

interface CustomDomainModalProps {
  isOpen: boolean
  onClose: () => void
  canister?: Canister | null
}

// Simple domain validation
const isValidDomain = (domain: string): boolean => {
  if (!domain) return false
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/
  return domainRegex.test(domain) && domain.length <= 253
}

export function CustomDomainModal({ isOpen, onClose, canister }: CustomDomainModalProps) {
  const [domain, setDomain] = useState('')
  const [initialDomain, setInitialDomain] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingInitial, setIsLoadingInitial] = useState(false)
  const [error, setError] = useState('')
  const [requestId, setRequestId] = useState('')
  const [registrationStatus, setRegistrationStatus] = useState<any>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setDomain('')
      setInitialDomain('')
      setError('')
      setRequestId('')
      setRegistrationStatus(null)
      setIsCheckingStatus(false)
      
      // Fetch current domain
      if (canister?.icCanisterId) {
        fetchCurrentDomain()
      }
    }
  }, [isOpen, canister?.icCanisterId])

  const fetchCurrentDomain = async () => {
    if (!canister?.icCanisterId) return
    
    setIsLoadingInitial(true)
    try {
      const currentDomain = await customDomainApi.getCurrentDomain(canister.icCanisterId)
      if (currentDomain) {
        setDomain(currentDomain)
        setInitialDomain(currentDomain)
      }
    } catch (err) {
      // Silently fail, just use empty string
    } finally {
      setIsLoadingInitial(false)
    }
  }

  const checkRegistrationStatus = async (reqId: string) => {
    setIsCheckingStatus(true)
    try {
      const result = await customDomainApi.checkRegistrationStatus(reqId)
      if (result.success) {
        setRegistrationStatus(result.data)
      } else {
        setError(result.error || 'Failed to check registration status')
      }
    } catch (err) {
      setError('Failed to check registration status')
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canister?.icCanisterId || !domain || !isValidDomain(domain)) return

    setIsLoading(true)
    setError('')
    setRequestId('')
    setRegistrationStatus(null)

    const isCheckStatus = initialDomain && domain === initialDomain && isValidDomain(initialDomain)

    try {
      const result = await customDomainApi.addDomain(canister.icCanisterId, domain, isCheckStatus)
      
      if (result.success && result.requestId) {
        setRequestId(result.requestId)
        // Immediately check status
        await checkRegistrationStatus(result.requestId)
      } else {
        setError(result.error || 'Failed to register domain')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register domain')
    } finally {
      setIsLoading(false)
    }
  }

  const isSubmitDisabled = !domain || !isValidDomain(domain) || isLoading || isLoadingInitial
  const isCheckStatus = initialDomain && domain === initialDomain && isValidDomain(initialDomain)
  const submitButtonText = isCheckStatus ? 'Check Status' : 'Register Domain'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Custom Domain" className="max-w-lg">
      <div className="space-y-6">
        {/* Tip Section */}
        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="mb-2">Before registering a domain here, you need to configure DNS settings.</p>
              <p>
                Please follow the setup guide at:{' '}
                <a 
                  href="https://internetcomputer.org/docs/building-apps/frontends/custom-domains/dns-setup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors underline"
                >
                  Click here
                </a>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
         
          {/* Domain Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Custom Domain</label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              disabled={isLoading || isLoadingInitial}
              className="font-mono text-sm"
            />
            {domain && !isValidDomain(domain) && (
              <p className="text-sm text-destructive mt-1">Please enter a valid domain name</p>
            )}
          </div>

           {error && (
            <div className="p-3 break-all text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={isSubmitDisabled}
            className="w-full"
          >
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="animate-spin rounded-full h-4 w-4 mr-2" />
                {isCheckStatus ? 'Checking...' : 'Registering...'}
              </div>
            ) : (
              submitButtonText
            )}
          </Button>

          {/* Registration Status */}
          {requestId && (
            <div className="mt-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4" />
                <span className="text-sm font-medium">Registration Status</span>
                {isCheckingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              
              {registrationStatus ? (
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Domain:</span> {registrationStatus.name}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Canister:</span> {registrationStatus.canister}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Status:</span>{' '}
                    <span className={`font-medium ${
                      registrationStatus.state === 'Available' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {registrationStatus.state}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Request ID: {requestId}
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </Modal>
  )
}