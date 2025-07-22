import { Loader2 } from 'lucide-react'

export function LoadingPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-primary/20" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-1">Loading</h2>
          <p className="text-sm text-muted-foreground">Please wait while we load the page...</p>
        </div>
      </div>
    </div>
  )
}