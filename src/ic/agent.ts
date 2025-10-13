import { HttpAgent, Identity } from '@dfinity/agent'
import { AuthClient } from '@dfinity/auth-client'

// Singleton HttpAgent shared across the app
let agent: HttpAgent | null = null
let identity: Identity | undefined

// Subscribers for auth-related errors (e.g., delegation expiration)
type AuthErrorKind = 'unauthorized' | 'expired'
type AuthErrorListener = (kind: AuthErrorKind, error: unknown) => void
const authErrorListeners = new Set<AuthErrorListener>()

export function onAuthError(listener: AuthErrorListener) {
  authErrorListeners.add(listener)
  return () => authErrorListeners.delete(listener)
}

function notifyAuthError(kind: AuthErrorKind, error: unknown) {
  authErrorListeners.forEach((l) => {
    try { l(kind, error) } catch { /* pass */ }
  })
}

function createAgent() {
  const a = new HttpAgent({ identity, host: 'https://ic0.app' })
  // Note: In local dev one may need root key: a.fetchRootKey()
  // Attach a simple wrapper to catch 401s; @dfinity/agent throws errors from fetch
  const originalFetch = (a as any)._fetch;
  (a as any)._fetch = async (...args: any[]) => {
    try {
      const resp = await (originalFetch ? originalFetch(...args) : fetch(...(args as [RequestInfo, RequestInit])))
      if (resp && (resp.status === 401 || resp.status === 403)) {
        notifyAuthError('unauthorized', new Error(`HTTP ${resp.status}`))
      }
      return resp
    } catch (e: any) {
      const msg = String(e?.message || e || '')
      if (/Expired|delegation|401|unauthorized/i.test(msg)) {
        notifyAuthError('expired', e)
      }
      throw e
    }
  }
  return a
}

export function getAgent(): HttpAgent {
  if (!agent) agent = createAgent()
  return agent!
}

export function setIdentity(newIdentity?: Identity) {
  identity = newIdentity
  if (agent) {
    agent = createAgent()
  }
}

// Utility to sync with AuthClient
let authClient: AuthClient | null = null
let initPromise: Promise<void> | null = null

export async function initAgentAuthSync() {
  if (initPromise) return initPromise
  initPromise = (async () => {
    authClient = await AuthClient.create()
    const authed = await authClient.isAuthenticated()
    if (authed) setIdentity(authClient.getIdentity())

    // Set up auto-logout when delegation expires
    scheduleExpiryCheck()
  })()
  await initPromise
}

function getDelegationExpiryNs(): number | undefined {
  try {
    const identity: any = (authClient as any)?.getIdentity?.()
    const getDelegation = identity?.getDelegation
    const del = typeof getDelegation === 'function' ? getDelegation.call(identity) : undefined
    const first = del?.delegations?.[0]
    const exp = first?.expiration
    if (!exp) return undefined
    // expiration is BigInt nanoseconds
    const ns = typeof exp === 'bigint' ? Number(exp) : Number(BigInt(exp))
    return ns
  } catch {
    return undefined
  }
}

let expiryTimer: any = null
function scheduleExpiryCheck() {
  if (!authClient) return
  if (expiryTimer) clearTimeout(expiryTimer)
  const ns = getDelegationExpiryNs()
  if (!ns) return
  const nowNs = BigInt(Date.now()) * 1_000_000n
  const deltaMs = Math.max(0, Number(BigInt(ns) - nowNs) / 1_000_000) // convert ns to ms
  // Logout a bit earlier (10 seconds) to be safe
  const timeout = Math.max(0, deltaMs - 10_000)
  expiryTimer = setTimeout(async () => {
    try {
      notifyAuthError('expired', new Error('Delegation expired'))
    } catch {/* noop */}
  }, timeout)
}

// Expose helper to be called by II hook on login/logout
export function onLogin(identityFromII: Identity) {
  setIdentity(identityFromII)
  scheduleExpiryCheck()
}
export function onLogout() {
  setIdentity(undefined)
  if (expiryTimer) clearTimeout(expiryTimer)
}
