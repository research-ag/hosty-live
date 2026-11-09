import { useState } from 'react'
import { Bot, KeyRound, ShieldCheck, Trash2, BookOpen, Plug, ExternalLink, Unplug } from 'lucide-react'
import { Principal } from '@icp-sdk/core/principal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { CopyButton } from '../ui/CopyButton'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useApiTokens } from '../../hooks/useApiTokens'
import { useConnectedApps } from '../../hooks/useConnectedApps'
import { useCanisters } from '../../hooks/useCanisters'
import { useToast } from '../../hooks/useToast'
import { Link } from 'react-router-dom'
import {
  DeployAccessOutcome,
  explainIcError,
  grantDeployAccessChecked,
} from '../../api/certified-assets/deploy-access'
import { API_BASE_URL, ApiTokenInfo } from '../../services/api'
import type { ConnectedApp } from '../../services/oauth'

const MCP_URL = `${API_BASE_URL}/mcp`
const SKILL_URL = `${API_BASE_URL}/skill`
const CLAUDE_CONNECTORS_URL = 'https://claude.ai/customize/connectors'

function claudeCodeCommand(token: string) {
  return `claude mcp add --transport http hosty ${MCP_URL} --header "Authorization: Bearer ${token}"`
}

function mcpJsonConfig(token: string) {
  return JSON.stringify(
    { mcpServers: { hosty: { url: MCP_URL, headers: { Authorization: `Bearer ${token}` } } } },
    null,
    2,
  )
}

// For agents that start from a git repository (Claude Code on the web): the
// committed file holds no token; the cloud environment's network secret does.
const CLOUD_MCP_JSON = JSON.stringify({ mcpServers: { hosty: { type: 'http', url: MCP_URL } } }, null, 2)
const API_HOST = new URL(MCP_URL).host

function Snippet({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <CopyButton text={value} />
      </div>
      <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
        {value}
      </pre>
    </div>
  )
}

export function AgentAccessCard() {
  const { tokens, isLoading, createToken, isCreating, revokeToken, isRevoking } = useApiTokens()
  const { canisters } = useCanisters()
  const { apps, enabled: oauthEnabled, disconnect, isDisconnecting } = useConnectedApps()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [tokenToRevoke, setTokenToRevoke] = useState<ApiTokenInfo | null>(null)
  const [appToDisconnect, setAppToDisconnect] = useState<ConnectedApp | null>(null)
  const [isGranting, setIsGranting] = useState(false)
  const [grantReport, setGrantReport] = useState<Array<{ id: string; name: string; outcome: DeployAccessOutcome }>>([])

  const handleCreate = async () => {
    const trimmed = name.trim() || 'AI agent'
    try {
      const result = await createToken(trimmed)
      setCreatedToken(result.token)
      setName('')
      toast.success('Token created', 'Copy it now; it will not be shown again.')
    } catch (err) {
      toast.error('Failed to create token', err instanceof Error ? err.message : undefined)
    }
  }

  const handleRevoke = async () => {
    if (!tokenToRevoke) return
    try {
      await revokeToken(tokenToRevoke.id)
      toast.success('Token revoked')
    } catch (err) {
      toast.error('Failed to revoke token', err instanceof Error ? err.message : undefined)
    } finally {
      setTokenToRevoke(null)
    }
  }

  const handleDisconnect = async () => {
    if (!appToDisconnect) return
    try {
      await disconnect(appToDisconnect.id)
      toast.success('App disconnected', `"${appToDisconnect.clientName}" no longer has access.`)
    } catch (err) {
      toast.error('Failed to disconnect the app', err instanceof Error ? err.message : undefined)
    } finally {
      setAppToDisconnect(null)
    }
  }

  // Agents deploy through the hosty.live builder, which needs deploy access on each canister.
  // The web UI grants it before every deploy; agents cannot, so grant it upfront here.
  const handleGrantAccess = async () => {
    const builderText = import.meta.env.VITE_BACKEND_PRINCIPAL as string | undefined
    let builder: Principal
    try {
      builder = Principal.fromText(builderText ?? '')
    } catch {
      toast.error('Builder principal is not configured', builderText ? `Invalid principal: ${builderText}` : undefined)
      return
    }
    const targets = canisters.filter((c) => c.status === 'active')
    if (targets.length === 0) {
      toast.warning('No canisters to update', 'Create or rent a canister first.')
      return
    }
    setIsGranting(true)
    setGrantReport([])
    const report: typeof grantReport = []
    try {
      for (const canister of targets) {
        let outcome: DeployAccessOutcome
        if (canister.network === 'cloud') {
          // hosty.live controls cloud engine canisters and authorized the builder at creation
          report.push({ id: canister.id, name: canister.alias || canister.id, outcome: { status: 'skipped', reason: 'Cloud engine canister: hosty.live already deploys to it.' } })
          continue
        }
        try {
          outcome = await grantDeployAccessChecked(canister.id, builder, canister.kind)
        } catch (err) {
          outcome = { status: 'failed', reason: explainIcError(err) }
        }
        report.push({ id: canister.id, name: canister.alias || canister.id, outcome })
      }
    } finally {
      setIsGranting(false)
      setGrantReport(report)
    }
    const granted = report.filter((r) => r.outcome.status === 'granted').length
    const failed = report.filter((r) => r.outcome.status === 'failed').length
    const skipped = report.length - granted - failed
    const summary = `${granted} granted${skipped ? `, ${skipped} skipped` : ''}${failed ? `, ${failed} failed` : ''}. Details below.`
    if (failed === 0 && skipped === 0) {
      toast.success('Agent deploy access granted', `${granted} canister${granted === 1 ? '' : 's'} updated.`)
    } else if (failed === 0 && granted === 0) {
      toast.warning('No canisters updated', `${skipped} skipped. Details below.`)
    } else if (failed === 0) {
      toast.success('Agent deploy access granted', summary)
    } else {
      toast.warning('Some canisters were not updated', summary)
    }
  }

  const tokensSection = (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center">
        <KeyRound className="mr-2 h-4 w-4" /> {oauthEnabled ? 'API tokens' : '1. API tokens'}
      </h3>
      <div className="flex gap-2">
        <Input
          placeholder="Token name (e.g. Claude Code on my laptop)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={64}
          onKeyDown={(e) => e.key === 'Enter' && !isCreating && handleCreate()}
        />
        <Button onClick={handleCreate} disabled={isCreating}>
          {isCreating ? 'Creating…' : 'Create token'}
        </Button>
      </div>

      {createdToken && (
        <div className="rounded-md border border-green-600/30 bg-green-600/5 p-3 space-y-3">
          <p className="text-sm font-medium">
            New token. Copy it now — it will not be shown again.
          </p>
          <Snippet label="Token" value={createdToken} />
          <Snippet label="Claude Code (one command)" value={claudeCodeCommand(createdToken)} />
          <Snippet label="MCP JSON config (Cursor, Windsurf, …)" value={mcpJsonConfig(createdToken)} />
          <Button variant="outline" size="sm" onClick={() => setCreatedToken(null)}>
            I have saved it
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading tokens…</p>
      ) : tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active tokens.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {tokens.map((token) => (
            <li key={token.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{token.name}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {token.prefix}… · created {new Date(token.createdAt).toLocaleDateString()}
                  {token.lastUsedAt && ` · last used ${new Date(token.lastUsedAt).toLocaleString()}`}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTokenToRevoke(token)}
                title="Revoke token"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )

  const grantSection = (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center">
        <ShieldCheck className="mr-2 h-4 w-4" /> {oauthEnabled ? 'Grant agent deploy access' : '2. Grant agent deploy access'}
      </h3>
      <p className="text-sm text-muted-foreground">
        Allows the hosty.live builder to upload files into your canisters without you clicking
        “Deploy” in the browser. Rented canisters already have it. Run this again after creating or
        importing canisters. Empty canisters need hosty’s asset module first (“Install asset module” on
        the canister page). An agent with an approved deploy session can do both itself.
      </p>
      <Button variant="outline" onClick={handleGrantAccess} disabled={isGranting}>
        {isGranting ? 'Granting…' : `Grant deploy access on ${canisters.length} canister${canisters.length === 1 ? '' : 's'}`}
      </Button>
      {grantReport.length > 0 && (
        <ul className="space-y-1 text-sm">
          {grantReport.map(({ id, name, outcome }) => (
            <li key={id} className="flex flex-wrap gap-x-2">
              <Link to={`/panel/canister/${id}`} className="font-medium hover:underline">
                {name}
              </Link>
              <span
                className={
                  outcome.status === 'granted'
                    ? 'text-green-600'
                    : outcome.status === 'failed'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                }
              >
                {outcome.status === 'granted' ? 'Granted' : outcome.reason}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )

  const teachSection = (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center">
        <BookOpen className="mr-2 h-4 w-4" /> {oauthEnabled ? 'Connect with a token' : '3. Teach your agent'}
      </h3>
      <p className="text-sm text-muted-foreground">
        Connect the MCP server with the snippet shown when you create a token, and add the deployment
        skill to your project or generation prompt:
      </p>
      <Snippet label="MCP endpoint" value={MCP_URL} />
      <Snippet
        label="Claude Code on the web and other cloud agents: commit as .mcp.json in the repository"
        value={CLOUD_MCP_JSON}
      />
      <p className="text-sm text-muted-foreground">
        Then, in the cloud environment&apos;s settings, add a <strong>network secret</strong>: type Bearer,
        allowed website <code>{API_HOST}</code>, header <code>Authorization</code> with prefix{' '}
        <code>Bearer</code>, your token as the value. The environment adds it to requests outside the
        session, so the agent never sees your token. Also allow <code>{API_HOST}</code> in its network access.
        Where network secrets are not available, add{' '}
        <code>{'"headers": { "Authorization": "Bearer ${HOSTY_TOKEN}" }'}</code> to the server in{' '}
        <code>.mcp.json</code> and set <code>HOSTY_TOKEN</code> in the environment&apos;s variables instead;
        anyone who can use that environment can read it. A cloud agent cannot show you a page it
        serves itself: ask it to put previews into a rented canister.
      </p>
      <Snippet label="Skill file (paste its URL or contents into your prompt)" value={SKILL_URL} />
      <Snippet
        label="Prompt snippet for Claude / Caffeine"
        value={`When the app is ready, deploy it to the Internet Computer using hosty.live. Read ${SKILL_URL} and follow it. My hosty.live MCP server is configured; if it is not, use the REST API from the skill with my token.`}
      />
    </section>
  )

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bot className="mr-2 h-5 w-5" />
          AI agent access
        </CardTitle>
        <CardDescription>
          {oauthEnabled ? (
            <>
              Let Claude, Cursor or any MCP-capable agent deploy frontends and backend canisters. Connect it once
              with your passkey. Spending cycles and backend installs additionally ask you to approve a time-boxed
              deploy session, right here in the panel.
            </>
          ) : (
            <>
              Let Claude Code, Cursor or any MCP-capable agent deploy frontends and backend canisters.
              Three steps: create a token, grant deploy access, connect the agent. Backend installs
              additionally ask you to approve a time-boxed deploy session, right here in the panel.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {oauthEnabled && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center">
              <Plug className="mr-2 h-4 w-4" /> Connect Claude
            </h3>
            <Snippet label="MCP server URL" value={MCP_URL} />
            <p className="text-sm text-muted-foreground">
              In{' '}
              <a href={CLAUDE_CONNECTORS_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                Claude’s connector settings <ExternalLink className="h-3 w-3" />
              </a>
              : <strong>Add custom connector</strong>, paste this URL, sign in with your passkey, approve. Once per
              Claude account: chat, the desktop app and Claude Code sessions all get the hosty.live tools. Other
              MCP clients (Cursor, VS Code, Codex) take the same URL and open the same sign-in.
            </p>
          </section>
        )}

        {oauthEnabled && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center">
              <Bot className="mr-2 h-4 w-4" /> Connected apps
            </h3>
            {apps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No connected apps.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {apps.map((app) => (
                  <li key={app.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {app.clientName}{' '}
                        <span className={`text-xs font-normal ${app.clientVerified ? 'text-green-700 dark:text-green-500' : 'text-muted-foreground'}`}>
                          {app.clientVerified ? `verified (${app.clientHost})` : 'name not verified'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        returns to {app.redirectHost} · connected {new Date(app.createdAt).toLocaleDateString()}
                        {app.lastUsedAt && ` · last used ${new Date(app.lastUsedAt).toLocaleString()}`}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setAppToDisconnect(app)} title="Disconnect app">
                      <Unplug className="h-4 w-4 mr-1 text-destructive" />
                      Disconnect
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {oauthEnabled ? (
          <>
            {grantSection}
            <details className="rounded-md border px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                For scripts and other MCP clients: API tokens
              </summary>
              <div className="space-y-6 pt-3">
                {tokensSection}
                {teachSection}
              </div>
            </details>
          </>
        ) : (
          <>
            {tokensSection}
            {grantSection}
            {teachSection}
          </>
        )}
      </CardContent>

      <ConfirmDialog
        isOpen={!!tokenToRevoke}
        title="Revoke token?"
        description={`Agents using "${tokenToRevoke?.name}" will lose access immediately, and deploy sessions it requested end. An agent that holds its own session key keeps its signed delegation until it expires.`}
        confirmLabel="Revoke"
        isLoading={isRevoking}
        onConfirm={handleRevoke}
        onCancel={() => setTokenToRevoke(null)}
      />

      <ConfirmDialog
        isOpen={!!appToDisconnect}
        title="Disconnect app?"
        description={`"${appToDisconnect?.clientName}" loses access to hosty.live at once, and deploy sessions it requested end. To use it again, connect it again and sign in.`}
        confirmLabel="Disconnect"
        isLoading={isDisconnecting}
        onConfirm={handleDisconnect}
        onCancel={() => setAppToDisconnect(null)}
      />
    </Card>
  )
}
