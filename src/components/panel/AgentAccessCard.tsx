import { useState } from 'react'
import { Bot, KeyRound, ShieldCheck, Trash2, BookOpen } from 'lucide-react'
import { Principal } from '@icp-sdk/core/principal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { CopyButton } from '../ui/CopyButton'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useApiTokens } from '../../hooks/useApiTokens'
import { useCanisters } from '../../hooks/useCanisters'
import { useToast } from '../../hooks/useToast'
import { Link } from 'react-router-dom'
import {
  DeployAccessOutcome,
  explainIcError,
  grantDeployAccessChecked,
} from '../../api/certified-assets/deploy-access'
import { API_BASE_URL, ApiTokenInfo } from '../../services/api'

const MCP_URL = `${API_BASE_URL}/mcp`
const SKILL_URL = `${API_BASE_URL}/skill`

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
// committed file names the token, the cloud environment holds it.
const CLOUD_MCP_JSON = JSON.stringify(
  { mcpServers: { hosty: { type: 'http', url: MCP_URL, headers: { Authorization: 'Bearer ${HOSTY_TOKEN}' } } } },
  null,
  2,
)
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
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [tokenToRevoke, setTokenToRevoke] = useState<ApiTokenInfo | null>(null)
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

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bot className="mr-2 h-5 w-5" />
          AI agent access
        </CardTitle>
        <CardDescription>
          Let Claude Code, Cursor or any MCP-capable agent deploy frontends and backend canisters.
          Three steps: create a token, grant deploy access, connect the agent. Backend installs
          additionally ask you to approve a time-boxed deploy session, right here in the panel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center">
            <KeyRound className="mr-2 h-4 w-4" /> 1. API tokens
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

        <section className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center">
            <ShieldCheck className="mr-2 h-4 w-4" /> 2. Grant agent deploy access
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

        <section className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center">
            <BookOpen className="mr-2 h-4 w-4" /> 3. Teach your agent
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
            Then, in the cloud environment&apos;s settings, set the environment variable{' '}
            <code>HOSTY_TOKEN</code> to your token and allow <code>{API_HOST}</code> in its network access. Everyone
            who can use that environment can read its variables, so use a personal environment you don&apos;t share.
            A cloud agent cannot show you a page it serves itself: ask it to put previews into a rented canister.
          </p>
          <Snippet label="Skill file (paste its URL or contents into your prompt)" value={SKILL_URL} />
          <Snippet
            label="Prompt snippet for Claude / Caffeine"
            value={`When the app is ready, deploy it to the Internet Computer using hosty.live. Read ${SKILL_URL} and follow it. My hosty.live MCP server is configured; if it is not, use the REST API from the skill with my token.`}
          />
        </section>
      </CardContent>

      <ConfirmDialog
        isOpen={!!tokenToRevoke}
        title="Revoke token?"
        description={`Agents using "${tokenToRevoke?.name}" will lose access immediately.`}
        confirmLabel="Revoke"
        isLoading={isRevoking}
        onConfirm={handleRevoke}
        onCancel={() => setTokenToRevoke(null)}
      />
    </Card>
  )
}
