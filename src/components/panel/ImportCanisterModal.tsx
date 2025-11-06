import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Copy } from 'lucide-react'
import { useAuth } from "../../hooks/useAuth.ts";

interface ImportCanisterModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (canisterId: string, opts: { reset: boolean }) => Promise<void>
  isWorking?: boolean
  error?: string
}

export function ImportCanisterModal({
  isOpen,
  onClose,
  onImport,
  isWorking = false,
  error,
}: ImportCanisterModalProps) {
  const [canisterId, setCanisterId] = useState('')
  const [reset, setReset] = useState(true)

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canisterId) return
    await onImport(canisterId.trim(), { reset })
  }

  const { principal } = useAuth();

  const dfxCmd = `dfx canister --network ic update-settings ${canisterId || '<canister-id>'} --add-controller ${principal || '...'}`

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import existing canister" className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Canister ID</label>
          <Input
            placeholder="ryjl3-tyaaa-aaaaa-aaaba-cai"
            value={canisterId}
            onChange={e => setCanisterId(e.target.value)}
            disabled={isWorking}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Before you import</h3>
          <p className="text-sm text-muted-foreground">
            Make sure your current II principal is a controller of this canister. If not, add yourself as a controller first:
          </p>
          <div className="bg-muted/50 border rounded-lg p-3 text-xs font-mono break-all select-text">
            {dfxCmd}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-2 h-6 px-2 inline-flex items-center"
              onClick={() => copy(dfxCmd)}
            >
              <Copy className="h-3 w-3 mr-1" /> Copy
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="reset"
            type="checkbox"
            className="h-4 w-4"
            checked={reset}
            onChange={(e) => setReset(e.target.checked)}
            disabled={isWorking}
          />
          <label htmlFor="reset" className="text-sm">Reset canister after importing (recommended)</label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isWorking}>
            Cancel
          </Button>
          <Button type="submit" disabled={isWorking || !canisterId}>
            {isWorking ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"/>
                Working...
              </div>
            ) : (
              'Import canister'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
