import { Link } from 'react-router-dom'
import { SUPPORT_EMAIL } from '../../constants/contact'
import { A, Bullets, Code, InfoArticle, InfoSection, P } from './InfoContent'

const EFFECTIVE_DATE = '27 November 2026'

export function PrivacyPage() {
  const mail = <A href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</A>
  return (
    <InfoArticle title="Privacy policy" subtitle={`Effective ${EFFECTIVE_DATE}`}>
      <InfoSection id="who" title="Who we are">
        <P>
          hosty.live (the web app at hosty.live, the API and MCP server at api.hosty.live, and hosty.live's canisters
          on the Internet Computer) is operated by MR Research AG, the controller of the personal data described
          here. Contact: {mail}.
        </P>
      </InfoSection>

      <InfoSection id="collect" title="What we collect and why">
        <Bullets>
          <li>
            <strong>Your account</strong>: you sign in with Internet Identity, which gives hosty.live a principal (a
            pseudonymous identifier for hosty.live). We do not collect names, email addresses or passwords. We use the
            principal to tell which canisters, deployments, tokens and sessions are yours.
          </li>
          <li>
            <strong>Your canisters</strong>: the canisters you rent, create or import, with the alias, description,
            kind and domain you give them. This registry is kept in hosty.live's backend canister on the Internet
            Computer, and a canister's registry entry can be read publicly.
          </li>
          <li>
            <strong>Deployments</strong>: for each deployment, the canister, the source (git repository and branch,
            archive URL or uploaded ZIP), the build command, the output folder, the build environment variables you
            set, the build logs, status and timing; for backend installs also the module hash, install mode, init
            argument and Candid interface. We keep them to show your history, to redeploy and to troubleshoot. Do not
            put secrets in build environment variables: they are stored with the deployment.
          </li>
          <li>
            <strong>Uploaded files</strong>: an uploaded ZIP is deleted once its deployment has processed it. Working
            copies of the source and build output stay in a temporary build area on our server until it is cleared.
          </li>
          <li>
            <strong>Module store</strong>: Wasm modules installed through hosty.live (and modules published to it) are
            stored with their Candid interface and served publicly by their hash, so that others can verify and build
            on deployed canisters. Modules confirmed as installed are kept indefinitely; unconfirmed uploads expire
            after 24 hours.
          </li>
          <li>
            <strong>AI agent access</strong>: for API tokens, a name, a prefix, dates and a hash of the token (never
            the token itself). For connected apps (OAuth), the app's name and redirect host, dates and hashes of its
            tokens. For deploy sessions, the request code, the purpose the agent stated, the app or token that asked,
            and the delegation you approved; for sessions hosty.live holds, an encrypted session key. Sessions end
            when they expire (after at most eight hours) or when you disconnect the app or revoke the token.
          </li>
          <li>
            <strong>Conversations with AI assistants</strong>: hosty.live does not receive your conversations. It
            receives only the tool calls an assistant makes to it and their arguments (for example a canister id, a
            purpose text or an uploaded file), and uses them only to carry out the call.
          </li>
          <li>
            <strong>Technical data</strong>: IP addresses reach our servers with every request. We use them to limit
            request rates and they appear in our server logs. We use no analytics, no advertising and no tracking
            cookies.
          </li>
        </Bullets>
      </InfoSection>

      <InfoSection id="browser" title="Data in your browser">
        <P>
          The web app keeps your Internet Identity sign-in in your browser's storage (IndexedDB), and your principal,
          its access token, your theme and pending ICP deposits in local storage. It sets no cookies. Signing out
          removes the sign-in.
        </P>
      </InfoSection>

      <InfoSection id="ic" title="Data on the Internet Computer">
        <P>
          The Internet Computer is a public network. Files you deploy to a frontend canister are served to anyone,
          canister metadata (controllers, module hash, cycles) is public, and values of <Code>PUBLIC_*</Code> canister
          environment variables are published to the page. A canister's state is visible as its code allows. Mainnet
          canisters are controlled by you; we cannot delete their content for you. Cloud engine canisters are
          controlled by hosty.live and may be deleted at the provider's discretion.
        </P>
      </InfoSection>

      <InfoSection id="payments" title="Payments">
        <P>
          hosty.live does not process card payments and never sees card details. Card payments for cycles happen on
          the pages of CyclePay or Cycle Express, under their own privacy policies; a card order an agent tracks for
          you is created with CyclePay in your name. ICP deposits are converted to cycles by the web app in your
          browser, through the Internet Computer's ledgers.
        </P>
      </InfoSection>

      <InfoSection id="providers" title="Service providers">
        <Bullets>
          <li>Hetzner (Germany): the servers that run the API, the builds and the module store.</li>
          <li>Supabase (EU, Sweden): the database for deployments, tokens, connected apps and deploy sessions.</li>
          <li>Cloudflare: DNS, TLS and request proxying for hosty.live and api.hosty.live.</li>
          <li>
            DFINITY and the Internet Computer: Internet Identity sign-in and the network your canisters and
            hosty.live's canisters run on.
          </li>
          <li>The cloud engine's operator: the subnet that runs cloud engine canisters.</li>
          <li>
            GitHub: when you deploy from a git repository or an agent loads a listed skill, we fetch it from there.
          </li>
        </Bullets>
        <P>We do not sell personal data or share it for advertising.</P>
      </InfoSection>

      <InfoSection id="retention" title="How long we keep it">
        <P>
          Deployment records, build logs and the records of tokens, connected apps and sessions are kept until you
          ask us to delete them. Access tokens of connected apps expire after an hour and their refresh tokens after
          30 days without use; unused sign-in requests expire after ten minutes. Backups of the module store are kept
          for 14 days.
        </P>
      </InfoSection>

      <InfoSection id="rights" title="Your rights">
        <P>
          You can ask for access to, correction or deletion of your personal data, object to its processing, or ask
          for a copy, by writing to {mail}. You can disconnect apps and revoke tokens yourself in{' '}
          <Link to="/panel/settings" className="text-primary hover:underline">Settings</Link>. You may also complain
          to your data protection authority.
        </P>
      </InfoSection>

      <InfoSection id="changes" title="Changes">
        <P>
          We update this page when our practices change, with a new effective date. hosty.live is not directed at
          children under 16.
        </P>
      </InfoSection>
    </InfoArticle>
  )
}
