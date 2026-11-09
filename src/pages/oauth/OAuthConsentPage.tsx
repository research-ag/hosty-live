import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Ban, Check, KeyRound, Loader2, Plug, ShieldCheck, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { ThemeLogo } from '../../components/shared/ThemeLogo'
import { useAuth } from '../../hooks/useAuth'
import { getStoredAccessToken } from '../../services/api'
import { isKnownRedirectHost, oauthApi } from '../../services/oauth'

function age(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return `${seconds} s ago`
  return `${Math.floor(seconds / 60)} min ago`
}

/** The API session (hosty JWT) is fetched in the background after Internet Identity sign-in. */
function useApiSession(): boolean {
  const [ready, setReady] = useState(() => !!getStoredAccessToken())
  useEffect(() => {
    if (ready) return
    const id = setInterval(() => {
      if (getStoredAccessToken()) setReady(true)
    }, 300)
    return () => clearInterval(id)
  }, [ready])
  return ready
}

/**
 * Consent for a connected app (claude.ai connector, Claude Code /mcp, other MCP clients):
 * the API's /oauth/authorize sends the browser here. Never approves by itself.
 */
export function OAuthConsentPage() {
  const [params] = useSearchParams()
  const requestId = params.get('request') ?? ''
  const { principal } = useAuth()
  const apiSession = useApiSession()
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null)
  const [error, setError] = useState('')
  const [leaving, setLeaving] = useState<'approved' | 'declined' | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])

  const { data: request, isLoading, error: loadError } = useQuery({
    queryKey: ['oauth-request', requestId],
    queryFn: () => oauthApi.getRequest(requestId),
    enabled: !!requestId,
    retry: false,
  })

  const decide = async (decision: 'approve' | 'decline') => {
    setBusy(decision)
    setError('')
    try {
      const { redirectUrl } = decision === 'approve' ? await oauthApi.approve(requestId) : await oauthApi.decline(requestId)
      setLeaving(decision === 'approve' ? 'approved' : 'declined')
      window.location.assign(redirectUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(null)
    }
  }

  const expired = !!request && new Date(request.expiresAt).getTime() <= now
  const pending = request?.status === 'PENDING' && !expired
  const knownHost = request ? isKnownRedirectHost(request.redirectHost) : true

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <ThemeLogo className="h-12" alt="hosty.live" />
          </div>
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <Plug className="h-5 w-5" /> Connect an app to hosty.live
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {!requestId || loadError ? (
            <p className="text-sm text-destructive text-center">
              This connection request does not exist. Start the connection again in the app.
            </p>
          ) : isLoading || !request ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leaving ? (
            <p className="text-sm text-center text-muted-foreground">
              {leaving === 'approved' ? 'Approved.' : 'Declined.'} Returning you to {request.clientName}…
            </p>
          ) : !pending ? (
            <p className="text-sm text-center text-muted-foreground">
              This request was {request.status === 'APPROVED' ? 'already approved' : request.status === 'DECLINED' ? 'declined' : 'not answered in time and expired'}.
              Start the connection again in the app if you still want to connect it.
            </p>
          ) : (
            <>
              <section className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Who asks</p>
                <p className="text-lg font-semibold break-words">{request.clientName}</p>
                <p className="text-xs flex items-center gap-1">
                  {request.clientVerified && request.clientHost ? (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-green-700 dark:text-green-500">
                        Verified: published by {request.clientHost}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Name not verified: the app registered itself under this name.</span>
                  )}
                </p>
              </section>

              <section
                className={`rounded-lg border p-4 space-y-1 ${
                  knownHost ? 'border-border bg-muted/40' : 'border-destructive/50 bg-destructive/10'
                }`}
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Where the approval goes</p>
                <p className="text-2xl font-bold font-mono break-all">{request.redirectHost}</p>
                {request.redirectHost === 'localhost' ? (
                  <p className="text-xs text-muted-foreground">An app on this computer, such as Claude Code.</p>
                ) : null}
                {!knownHost && (
                  <p className="text-sm text-destructive flex items-start gap-2 pt-1">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    This is not a host hosty.live knows. Whoever runs it gets access to your hosty.live account.
                    Approve only if you set up this app yourself and trust it.
                  </p>
                )}
              </section>

              <section className="space-y-2 text-sm">
                <p className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>It gets</strong> hosty.live's tools as you
                    {principal ? (
                      <>
                        {' '}(<span className="font-mono text-xs break-all">{principal}</span>)
                      </>
                    ) : null}
                    : see your canisters and deployments, deploy frontends, and get free canisters (rentals, cloud engine).
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <Ban className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>It never gets</strong> to spend your cycles, create mainnet canisters or install Wasm
                    modules on canisters you control on its own (except where you allowed unattended deploys). Each
                    of those still needs a deploy session that you approve here with your passkey.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    Disconnect it at any time in Settings → AI agent access.
                  </span>
                </p>
              </section>

              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                Only approve if you just clicked <strong>Connect</strong> in {request.clientName}. Requested{' '}
                {age(request.createdAt, now)}.
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <Button variant="outline" onClick={() => decide('decline')} disabled={!!busy || !apiSession}>
                  <X className="h-4 w-4 mr-1" />
                  {busy === 'decline' ? 'Declining…' : 'Decline'}
                </Button>
                <Button onClick={() => decide('approve')} disabled={!!busy || !apiSession}>
                  <Check className="h-4 w-4 mr-1" />
                  {busy === 'approve' ? 'Approving…' : `Approve ${request.clientName}`}
                </Button>
              </div>
              {!apiSession && (
                <p className="text-xs text-muted-foreground text-right flex items-center justify-end gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Finishing sign-in…
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
