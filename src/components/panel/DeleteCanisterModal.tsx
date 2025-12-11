import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Canister } from '../../types'
import { useCanisterStatus } from "../../hooks/useCanisterStatus";
import { Link } from "react-router-dom";

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

  const { cyclesRaw, isCanisterStatusLoading } = useCanisterStatus(canister?.id);
  const cyclesTC = (() => {
    try {
      if (!cyclesRaw) return undefined;
      return Number(BigInt(cyclesRaw)) / 1_000_000_000_000;
    } catch {
      return undefined;
    }
  })();

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

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete canister <strong>{canister?.id}</strong>?
            This action cannot be undone. Consider donating your canister instead.
          </p>

          <div className="p-3 text-sm bg-red-50 border border-red-200 text-red-800 rounded-md">
            {isCanisterStatusLoading ? (
              <span>Loading canister cycles…</span>
            ) : cyclesTC === undefined ? (
              <span>Unable to determine current cycles. Deleting will discard any remaining cycles.</span>
            ) : (
              <div className="space-y-1">
                <div>
                  Deleting will discard approximately <strong>0.31 TC</strong>.
                </div>
                {canister?.id && (
                  <div className="text-xs text-red-700">
                    Tip: You can manage withdrawals and resets on the canister page. <Link
                    to={`/panel/canister/${canister.id}`} className="underline">Open canister</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

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