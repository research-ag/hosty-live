import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Cpu, Gift, Globe, Server } from 'lucide-react'
import type { CanisterKind } from '../../types'

interface CreateCanisterModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateCanister: (kind: CanisterKind) => void
  isLoading?: boolean
  statusMessage?: string
  error?: string
  /** Rent a free 24 h canister from the pool instead of creating one. */
  rent?: boolean
}

export function CreateCanisterModal({ 
  isOpen, 
  onClose, 
  onCreateCanister, 
  isLoading = false, 
  statusMessage,
  error,
  rent = false,
}: CreateCanisterModalProps) {

  const [kind, setKind] = useState<CanisterKind>('frontend')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreateCanister(kind)
  }

  const options: { value: CanisterKind; title: string; text: string; icon: typeof Globe }[] = [
    { value: 'frontend', title: 'Frontend', text: 'Static site: upload built files, custom domains.', icon: Globe },
    {
      value: 'backend',
      title: 'Backend',
      text: rent
        ? 'Your own Wasm module (Motoko, Rust, Azle). Your first install replaces the starter page.'
        : 'Your own Wasm module (Motoko, Rust, Azle). Created empty.',
      icon: Cpu,
    },
  ]
  const title = rent ? 'Rent a free canister' : 'Create New Canister'
  const HeaderIcon = rent ? Gift : Server

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}
        
        <div>
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
              <HeaderIcon className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {rent
                ? 'Free for 24 hours, to try things out. Then it goes back to the pool and everything on it is deleted.'
                : 'This will create a new Internet Computer canister for hosting your applications.'}
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
                <span className="font-semibold">{rent ? 'Free for 24 hours' : '0.84 TC'}</span>
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
                {rent ? 'Renting...' : 'Creating...'}
              </div>
            ) : (
              rent ? 'Rent canister' : 'Create Canister'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}