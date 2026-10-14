import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Cpu, Globe, Server } from 'lucide-react'
import type { CanisterKind } from '../../types'

interface CreateCanisterModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateCanister: (kind: CanisterKind) => void
  isLoading?: boolean
  statusMessage?: string
  error?: string
}

export function CreateCanisterModal({ 
  isOpen, 
  onClose, 
  onCreateCanister, 
  isLoading = false, 
  statusMessage,
  error 
}: CreateCanisterModalProps) {

  const [kind, setKind] = useState<CanisterKind>('frontend')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateCanister(kind)
  }

  const options: { value: CanisterKind; title: string; text: string; icon: typeof Globe }[] = [
    { value: 'frontend', title: 'Frontend', text: 'Static site: upload built files, custom domains.', icon: Globe },
    { value: 'backend', title: 'Backend', text: 'Your own Wasm module (Motoko, Rust, Azle). Created empty.', icon: Cpu },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Canister" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}
        
        <div>
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
              <Server className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Create New Canister</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will create a new Internet Computer canister for hosting your applications.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4 text-left">
              {options.map(({ value, title, text, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={kind === value}
                  disabled={isLoading}
                  onClick={() => setKind(value)}
                  className={`rounded-lg border p-3 transition-colors ${
                    kind === value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium text-sm mb-1">
                    <Icon className="h-4 w-4" />
                    {title}
                  </div>
                  <p className="text-xs text-muted-foreground">{text}</p>
                </button>
              ))}
            </div>
            <div className="bg-muted/50 border rounded-lg p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cost:</span>
                <span className="font-semibold">0.84 TC</span>
              </div>
            </div>
            {isLoading && (
              <div className="mt-4 text-sm text-muted-foreground">
                {statusMessage || 'Starting canister creation...'}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Creating...
              </div>
            ) : (
              'Create Canister'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}