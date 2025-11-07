import { useState } from 'react'
import { UserCheck, Info, AlertTriangle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { TooltipWrapper } from '../ui/TooltipWrapper'
import { Canister } from '../../types'

interface TransferOwnershipModalProps {
  isOpen: boolean
  onClose: () => void
  onTransfer: (userPrincipal: string) => void
  canister?: Canister | null
  isLoading?: boolean
  error?: string
}

export function TransferOwnershipModal({ 
  isOpen, 
  onClose, 
  onTransfer, 
  canister, 
  isLoading = false, 
  error 
}: TransferOwnershipModalProps) {
  const [userPrincipal, setUserPrincipal] = useState('')
  const [validationError, setValidationError] = useState('')

  const validatePrincipal = (principal: string): boolean => {
    // IC principal format: 27-63 characters, alphanumeric + dashes
    const principalRegex = /^[a-z0-9-]{27,63}$/
    return principalRegex.test(principal)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError('')

    if (!userPrincipal.trim()) {
      setValidationError('User principal is required')
      return
    }

    if (!validatePrincipal(userPrincipal.trim())) {
      setValidationError('Invalid principal format. Must be 27-63 characters, alphanumeric and dashes only.')
      return
    }

    onTransfer(userPrincipal.trim())
  }

  const handleClose = () => {
    setUserPrincipal('')
    setValidationError('')
    onClose()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserPrincipal(e.target.value)
    if (validationError) {
      setValidationError('')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Transfer Canister Ownership" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}
        
        {/* Explanation Section */}
        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h4 className="font-medium text-blue-800 dark:text-blue-200">
              About Controller Transfer
            </h4>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            This adds your IC principal as a controller to the canister, giving you direct access to manage it using IC tools like dfx. You'll be able to deploy and modify the canister independently from this platform.
          </p>
        </div>

        {/* Canister Info */}
        {canister && (
          <div className="bg-muted/30 border border-border/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm">Target Canister</h3>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-muted-foreground text-xs sm:text-sm">ID:</span>
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded break-all">
                  {canister.id}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* User Principal Input */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium">User Principal</label>
            <TooltipWrapper content="Enter the Internet Computer principal ID of the user who should become a controller of this canister. This should be a valid IC principal (27-63 characters, alphanumeric and dashes).">
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipWrapper>
          </div>
          <Input
            value={userPrincipal}
            onChange={handleInputChange}
            placeholder="xlmdg-vkosz-cckqz-v2vpr-f3g55-zvhvo-eag3u-dfdqe-a7cqd-5txaj-uae"
            required
            className="font-mono text-sm"
            disabled={isLoading}
          />
          {validationError && (
            <p className="text-sm text-destructive mt-1">{validationError}</p>
          )}
        </div>

        {/* Warning */}
        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h4 className="font-medium text-sm text-amber-800 dark:text-amber-200">
              Important
            </h4>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Once a principal is added as a controller, they will have full control over the canister. Make sure you trust the recipient and have verified the principal.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-3 sm:gap-0 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={!userPrincipal.trim() || isLoading}
            className="flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                Adding Controller...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4" />
                Add Controller
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}