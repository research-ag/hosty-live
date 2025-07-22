import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useToast } from '../../hooks/useToast'
import { Canister } from '../../types'

interface DeleteCanisterModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmDelete: () => void
  canister: Canister | null
  isLoading?: boolean
  error?: string
}

export function DeleteCanisterModal({ 
  isOpen, 
  onClose, 
  onConfirmDelete, 
  canister, 
  isLoading = false, 
  error 
}: DeleteCanisterModalProps) {
  const { toast } = useToast()

  const handleConfirm = () => {
    onConfirmDelete()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Canister">
      <div className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}
        
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete canister <strong>{canister?.icCanisterId}</strong>? 
          This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Deleting...
              </div>
            ) : (
              'Delete Canister'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}