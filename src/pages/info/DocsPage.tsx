import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../../services/api'
import { SUPPORT_EMAIL } from '../../constants/contact'
import { A, Block, Bullets, Code, InfoArticle, InfoSection, P } from './InfoContent'

const MCP_URL = `${API_BASE_URL}/mcp`
const DEPLOY_SKILL_URL = `${API_BASE_URL}/skills/hosty-live-deploy/SKILL.md`
const BUILD_SKILL_URL = `${API_BASE_URL}/skills/hosty-live-build/SKILL.md`

const EXAMPLE_PROMPTS = [
  'Deploy the frontend in this repository to a free cloud engine canister on hosty.live and give me the URL.',
  'Build this Motoko backend, install it on a new hosty.live canister and call its greet method with "world".',
  'List my hosty.live canisters and tell me which ones are low on cycles.',
  'Redeploy my last hosty.live deployment and check that it succeeded.',
]

export function DocsPage() {
  return (
    <InfoArticle
      title="hosty.live documentation"
      subtitle="Hosting for frontends and backend canisters on the Internet Computer, from the web app or from an AI agent."
    >
      <InfoSection id="what" title="What hosty.live does">
        <P>
          hosty.live puts websites and backends on the Internet Computer, a public blockchain network that runs
          code in canisters. It uploads a built frontend (any framework that produces an HTML/JS/CSS folder) to an
          asset canister, and installs compiled WebAssembly modules (Motoko, Rust, Azle) as backend canisters. It
          does not compile backends: you build and test them locally and send the <Code>.wasm</Code>.
        </P>
        <P>
          You sign in with Internet Identity (a passkey). hosty.live never asks for a password or an email address.
        </P>
      </InfoSection>

      <InfoSection id="canisters" title="Canisters">
        <Bullets>
          <li>
            <strong>Cloud engine (free)</strong>: canisters on hosty.live's cloud engine, controlled by hosty.live, with
            no cycles to manage. Free-tier canisters have no fixed expiry or other limitation but may be deleted at the
            provider's discretion, so they suit development and staging.
          </li>
          <li>
            <strong>Rental</strong>: a free mainnet canister for 24 hours, one per user. Afterwards it returns to the
            pool and its content is wiped.
          </li>
          <li>
            <strong>Mainnet</strong>: a permanent canister you control, paid with cycles (prepaid compute) from your
            hosty.live cycles balance. The <Link to="/panel/cycles" className="text-primary hover:underline">Cycles page</Link>{' '}
            shows the balance and how to add to it (card payment, or an ICP deposit).
          </li>
        </Bullets>
      </InfoSection>

      <InfoSection id="deploy" title="Deploying from the web app">
        <Bullets>
          <li>
            Frontends: on a canister page, choose Deploy and upload a ZIP of your build output, or give a public git
            repository or archive URL that hosty.live builds for you (a lockfile is required). Build environment
            variables apply to that build only.
          </li>
          <li>
            Backends: on a backend canister's page, choose Install module and upload the <Code>.wasm</Code> or{' '}
            <Code>.wasm.gz</Code>, or install a module from the hosty.live module store.
          </li>
          <li>
            Canister environment variables (canister settings) are on the canister page. Values of{' '}
            <Code>PUBLIC_*</Code> variables are published to the page and are public.
          </li>
        </Bullets>
      </InfoSection>

      <InfoSection id="agents" title="Connecting Claude and other AI agents">
        <P>The hosty.live MCP server is at:</P>
        <Block>{MCP_URL}</Block>
        <Bullets>
          <li>
            <strong>Claude (web, desktop, mobile)</strong>: in Claude's connector settings add hosty.live (or add a
            custom connector with the URL above), sign in to hosty.live with your passkey and approve the app once.
          </li>
          <li>
            <strong>Claude Code</strong>: <Code>claude mcp add --transport http hosty {MCP_URL}</Code>, then{' '}
            <Code>/mcp</Code> → hosty → Authenticate. A connector added to your Claude account works there as well.
          </li>
          <li>
            <strong>Other MCP clients and scripts</strong>: the same URL with OAuth sign-in, or an API token from{' '}
            <Link to="/panel/settings" className="text-primary hover:underline">Settings</Link>, "AI agent access",
            sent as <Code>Authorization: Bearer hl_…</Code>.
          </li>
        </Bullets>
        <P>
          Connected apps and tokens are listed in Settings, "AI agent access". Disconnect an app or revoke a token
          there at any time; that also ends its deploy sessions.
        </P>
      </InfoSection>

      <InfoSection id="sessions" title="What an agent can do, and what needs your approval">
        <P>
          A connected agent can read your canisters and deployments, deploy frontends, and do everything on cloud
          engine canisters. On mainnet, anything signed with your own identity needs a <strong>deploy session</strong>{' '}
          that you approve in the web app: creating, importing and topping up canisters, card orders it tracks for
          you, setting canister environment variables and installing backends.
        </P>
        <Bullets>
          <li>
            The agent requests the session and shows you a request code. The approval card on every panel page shows
            the same code, the app or token that asked, and the agent's stated purpose. Approve only a request whose
            code matches; otherwise choose decline.
          </li>
          <li>
            A session lasts one hour by default and eight hours at most. It serves only the app or token that
            requested it.
          </li>
          <li>
            Spending cycles takes them from your hosty.live cycles balance into your own canisters only. hosty.live
            never asks for card details; card payments happen on the payment provider's page.
          </li>
        </Bullets>
      </InfoSection>

      <InfoSection id="examples" title="Example prompts">
        <Bullets>
          {EXAMPLE_PROMPTS.map((prompt) => (
            <li key={prompt}>“{prompt}”</li>
          ))}
        </Bullets>
      </InfoSection>

      <InfoSection id="troubleshooting" title="Troubleshooting">
        <Bullets>
          <li>
            <strong>The hosty.live tools are missing or answer 401</strong>: reconnect the connector (or run{' '}
            <Code>/mcp</Code> → hosty → Authenticate in Claude Code). With a token, check in Settings that it has not
            been revoked.
          </li>
          <li>
            <strong>The agent keeps waiting for a deploy session</strong>: open hosty.live, compare the request code
            with the one the agent showed, and approve or decline.
          </li>
          <li>
            <strong>"Not enough cycles" or a frozen canister</strong>: top up the canister from its page or follow
            the top-up link the agent gives you. Cloud engine canisters never need cycles.
          </li>
          <li>
            <strong>IC0532 "cannot grow memory" although the canister holds cycles</strong>: lower its freezing
            threshold (the agent can do it, and hosty.live does it before installs). Do not reinstall a backend for
            this: a reinstall wipes its state.
          </li>
          <li>
            <strong>A ZIP deployment fails</strong>: the archive must contain the build output folder (for example{' '}
            <Code>dist</Code>) at its top level and be smaller than 100 MB. A malformed <Code>_headers</Code> file
            fails the deployment with its line number.
          </li>
          <li>
            <strong>A backend install fails</strong>: the deployment's status reason is the network's reject message
            (a trapped init or upgrade, a bad argument, too few cycles). Fix it and install again.
          </li>
        </Bullets>
      </InfoSection>

      <InfoSection id="reference" title="Full reference">
        <P>
          The complete guides that agents load are public: <A href={DEPLOY_SKILL_URL}>hosty-live-deploy</A> (every
          deploy flow, the REST API, troubleshooting) and <A href={BUILD_SKILL_URL}>hosty-live-build</A> (how to
          build for hosty.live).
        </P>
      </InfoSection>

      <InfoSection id="support" title="Support">
        <P>
          Write to <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>. How hosty.live handles your data is in
          the <Link to="/privacy" className="text-primary hover:underline">privacy policy</Link>.
        </P>
      </InfoSection>
    </InfoArticle>
  )
}
