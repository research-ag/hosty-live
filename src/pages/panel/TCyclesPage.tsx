import { RefreshCw, Info, Coins } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { useTCycles } from '../../hooks/useTCycles'
import { useInternetIdentity } from '../../hooks/useInternetIdentity'

export function TCyclesPage() {
  const { principal, isAuthenticated, login } = useInternetIdentity()
  const { balanceTC, balanceRaw, isLoading, isFetching, error, refresh } = useTCycles(principal)

  const handleRefresh = async () => {
    await refresh()
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Cycles</h1>
          <p className="text-muted-foreground">Manage your cycles ICRC-1 ledger balance</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isLoading || isFetching}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading || isFetching ? 'animate-spin' : ''}`}/>
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card className="hover:shadow-lg transition-all duration-200" style={{ display: 'flex', flexDirection: 'column' }}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Coins className="mr-2 h-5 w-5"/>
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent style={{ display: 'flex', flexDirection: 'column', flexGrow: '1' }}>
            <div className="text-center" style={{ display: 'contents' }}>
              {isLoading ? (
                <div className="flex items-center justify-center gap-3 py-6">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary"/>
                  <span>Loading balance...</span>
                </div>
              ) : error ? (
                <div className="text-destructive">
                  {error}
                </div>
              ) : (
                <>
                  <div style={{ flexGrow: '1' }}></div>
                  <div className="text-4xl font-bold mb-2">
                    {isAuthenticated ? ((balanceTC ?? '0.0000') + ' TC') : '-'}
                  </div>
                  {isAuthenticated && (
                    <p className="text-sm text-muted-foreground">
                      Raw: {balanceRaw ? BigInt(balanceRaw).toLocaleString() : '0'} e-12
                    </p>
                  )}
                  <div style={{ flexGrow: '1' }}></div>
                  {isAuthenticated && principal && (
                    <div className="mt-4">
                      <Button
                        onClick={() => window.open(`https://cycle.express/?to=${principal}`, '_blank', 'noopener,noreferrer')}
                        size="sm"
                      >
                        Deposit using Cycle Express
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="mr-2 h-5 w-5"/>
              About Cycles (ICRC-1)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              An ICRC-1 compliant ledger token is used that represents compute cycles on the Internet Computer.
              You can deposit cycles to your account and later spend them within the platform.
            </p>
            <div className="space-y-2">
              <p className="font-medium text-foreground">How to deposit cycles</p>
              {!isAuthenticated ? (
                <div className="space-y-3">
                  <p>Please sign in with Internet Identity to view your deposit account.</p>
                  <Button onClick={login} size="sm">Sign in with Internet Identity</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p>
                    Send cycles from any ICRC-1 compatible wallet to your account below.
                    Use null subaccount.
                  </p>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Your principal</div>
                    <div className="font-mono break-all text-foreground">{principal}</div>
                  </div>
                </div>
              )}
              <p>
                After sending, it may take a short while for the transfer to be confirmed. Click Refresh to update your
                balance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
