import { User, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { AgentAccessCard } from '../../components/panel/AgentAccessCard'
import { useAuth } from '../../hooks/useAuth'

export function SettingsPage() {
  const { principal } = useAuth()

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and AI agent access</p>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <AgentAccessCard />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-1">Principal</p>
            <p className="text-sm font-mono break-all">{principal ?? '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              API tokens give full deployment rights to your canisters. Revoke tokens you no longer use.
              Sessions expire automatically with your Internet Identity session.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
