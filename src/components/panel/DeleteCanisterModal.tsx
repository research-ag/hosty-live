import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Canister } from '../../types'

interface DeleteCanisterModalProps {
  isOpen: boolean
  onClose: () => void
  canister: Canister | null
  onConfirmDelete: () => void
  onConfirmDonate: () => void
  isDeleting?: boolean
  isDonating?: boolean
  error?: string
}

export function DeleteCanisterModal(
  {
    isOpen,
    onClose,
    onConfirmDelete,
    onConfirmDonate,
    canister,
    isDeleting = false,
    isDonating = false,
    error
  }: DeleteCanisterModalProps) {

  const handleConfirm = () => {
    onConfirmDelete()
  }
  const handleDonate = () => {
    onConfirmDonate()
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
          Are you sure you want to delete canister <strong>{canister?.id}</strong>?
          This action cannot be undone. Consider donating your canister instead.
        </p>
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting || isDonating}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDonate} disabled={isDeleting || isDonating}>
            {isDonating ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"/>
                Donating...
              </div>
            ) : (
              'Donate'
            )}
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isDeleting || isDonating}>
            {isDeleting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"/>
                Deleting...
              </div>
            ) : (
              'Delete'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}