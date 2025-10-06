import { useState, useEffect } from 'react'
import { Clock, Zap, Info, RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { useCycles } from '../../hooks/useCycles'
import { useToast } from '../../hooks/useToast'

export function CyclesPage() {
  const { 
    cyclesInfo, 
    faucetStatus, 
    isLoading, 
    error, 
    claimCycles, 
    refreshData, 
    formatCycles
  } = useCycles()
  const { toast } = useToast()

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState<number>(0)
  const [isClaimLoading, setIsClaimLoading] = useState(false)
  const [claimStatus, setClaimStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [claimMessage, setClaimMessage] = useState<string>('')

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshData()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Update countdown timer
  useEffect(() => {
    if (!faucetStatus?.nextAvailableAt) return

    const updateTimer = () => {
      const now = Date.now()
      const nextClaimTime = new Date(faucetStatus.nextAvailableAt!).getTime()
      const timeLeft = nextClaimTime - now

      setTimeUntilNextClaim(Math.max(0, timeLeft))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [faucetStatus?.nextAvailableAt])

  const formatTimeLeft = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)

    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  const handleClaimCycles = async () => {
    if (!faucetStatus?.canUseFaucet || isClaimLoading) return

    setIsClaimLoading(true)
    setClaimStatus('idle')
    setClaimMessage('')

    const result = await claimCycles()
    
    if (result.success) {
      setClaimStatus('success')
      const faucetAmountTC = formatCycles(faucetStatus.faucetAmount)
      toast.success('Cycles claimed!', `Successfully claimed ${faucetAmountTC} TC from the faucet.`)
      setClaimMessage(`Successfully claimed ${faucetAmountTC} TC! 🎉`)
    } else {
      setClaimStatus('error')
      toast.error('Claim failed', result.error || 'Unable to claim cycles from faucet.')
      setClaimMessage(result.error || 'Failed to claim cycles')
    }

    setIsClaimLoading(false)
    
    // Clear message after 5 seconds
    setTimeout(() => {
      setClaimStatus('idle')
      setClaimMessage('')
    }, 5000)
  }

  const formatBalance = (balance: string) => {
    return formatCycles(balance)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">Credits</h1>
          <p className="text-muted-foreground">Manage your compute cycles for canister operations</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg">Loading cycles data...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2">Credits</h1>
          <p className="text-muted-foreground">Manage your compute cycles for canister operations</p>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => {
                refreshData()
              }}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isClaimDisabled = !faucetStatus?.canUseFaucet || timeUntilNextClaim > 0 || isClaimLoading

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Credits</h1>
          <p className="text-muted-foreground">Manage your compute cycles for canister operations</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {/* Balance Card */}
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5" />
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {formatBalance(cyclesInfo?.cyclesBalance || '0')} TC
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Raw: {BigInt(cyclesInfo?.cyclesBalance || '0').toLocaleString()} cycles
              </p>
              {cyclesInfo?.canCreateCanister !== undefined && (
                <Badge variant={cyclesInfo.canCreateCanister ? 'success' : 'secondary'}>
                  {cyclesInfo.canCreateCanister ? 'Can create canister' : 'Insufficient for canister'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Faucet Card */}
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Free Cycles Faucet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <Button
                onClick={handleClaimCycles}
                disabled={isClaimDisabled}
                className="w-full"
                size="lg"
              >
                {isClaimLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Claiming...
                  </div>
                ) : isClaimDisabled && timeUntilNextClaim > 0 ? (
                  `Next claim in ${formatTimeLeft(timeUntilNextClaim)}`
                ) : faucetStatus?.canUseFaucet ? (
                  `Get ${formatCycles(faucetStatus.faucetAmount)} TC Free`
                ) : (
                  'Faucet Unavailable'
                )}
              </Button>
            </div>

            {claimMessage && (
              <div className={`p-3 border rounded-md ${
                claimStatus === 'success' 
                  ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
              }`}>
                <p className={`text-sm text-center ${
                  claimStatus === 'success' 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {claimMessage}
                </p>
              </div>
            )}

            {faucetStatus?.lastUsedAt && (
              <div className="text-center">
                <Badge variant="secondary">
                  Last claim: {new Date(faucetStatus.lastUsedAt).toLocaleDateString()}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Information Cards */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 mt-6">
        {/* Cycles Info Card */}
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="mr-2 h-5 w-5" />
              About Cycles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cycles are the fuel that powers your canisters on the Internet Computer. They're consumed 
              when your canisters perform computations, store data, or serve HTTP requests.
            </p>
            <div className="grid gap-3">
              <div className="p-3 bg-muted/50 rounded-md">
                <h4 className="text-sm font-medium mb-1">What are cycles used for?</h4>
                <p className="text-xs text-muted-foreground">
                  Running canisters, storing data, processing requests, and maintaining your applications
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-md">
                <h4 className="text-sm font-medium mb-1">Faucet Information</h4>
                <p className="text-xs text-muted-foreground">
                  Get {faucetStatus ? formatCycles(faucetStatus.faucetAmount) : '2'} TC every 7 days from the free faucet
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Canister Creation Cost Card */}
        {cyclesInfo?.canisterCreationCost && (
          <Card className="hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="mr-2 h-5 w-5" />
                Canister Creation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">
                  {formatCycles(cyclesInfo.canisterCreationCost)} TC
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Cost to create a new canister
                </p>
                <Badge variant={cyclesInfo.canCreateCanister ? 'success' : 'destructive'}>
                  {cyclesInfo.canCreateCanister ? 'Sufficient Balance' : 'Insufficient Balance'}
                </Badge>
              </div>
              {!cyclesInfo.canCreateCanister && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  You need more cycles to create a canister. Use the faucet or top up your balance.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}