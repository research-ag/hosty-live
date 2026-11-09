import { useState } from "react";
import { AlertTriangle, Bot, Coins, KeyRound, ShieldAlert, ShieldX, X } from "lucide-react";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useDeploySessions } from "../../hooks/useDeploySessions";
import { useAuth } from "../../hooks/useAuth";
import { useTCycles } from "../../hooks/useTCycles";
import { useToast } from "../../hooks/useToast";
import { sessionKeyPrincipal } from "../../lib/delegation";
import type { DeploySessionInfo } from "../../services/sessions";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** The time alone when it is today, else with the date. */
function formatUntil(iso: string): string {
  return new Date(iso).toDateString() === new Date().toDateString() ? formatTime(iso) : formatDateTime(iso);
}

function PendingSession({
  session,
  onApprove,
  onDecline,
  onRevoke,
  busy,
}: {
  session: DeploySessionInfo;
  onApprove: (minutes?: number) => void;
  onDecline: () => void;
  /** Set when an API token made the request. */
  onRevoke?: () => void;
  busy: boolean;
}) {
  const { principal } = useAuth();
  const { balanceTC } = useTCycles(principal);
  const agentHeld = session.holder === "AGENT";
  const keyPrincipal = agentHeld ? sessionKeyPrincipal(session.publicKeyDer) : undefined;
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-amber-500/20 p-2">
          <Bot className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">
              {session.requestedByName ? `"${session.requestedByName}"` : "An agent"} asks for a deploy
              session
            </p>
            <p className="text-xs text-muted-foreground">
              {session.requestedByTokenId
                ? session.requestedByConnectedApp
                  ? `Connected app${session.requestedByName ? ` "${session.requestedByName}"` : ""}${
                      session.requestedByTokenCreatedAt
                        ? `, connected ${formatDateTime(session.requestedByTokenCreatedAt)}`
                        : ""
                    }`
                  : `API token${session.requestedByName ? ` "${session.requestedByName}"` : ""}${
                      session.requestedByTokenCreatedAt
                        ? `, created ${formatDateTime(session.requestedByTokenCreatedAt)}`
                        : ""
                    }`
                : "This web app, signed in as you"}
              {" · "}requested {formatDateTime(session.createdAt)}
            </p>
          </div>
          {(session.requestCode || keyPrincipal) && (
            <div className="rounded-md border border-amber-500/40 bg-background/70 px-3 py-2 space-y-1">
              {session.requestCode && (
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-xs text-muted-foreground">Request code</span>
                  <span className="font-mono text-lg font-semibold tracking-widest">{session.requestCode}</span>
                </div>
              )}
              {keyPrincipal && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Principal of the agent's key: </span>
                  <span className="font-mono break-all">{keyPrincipal}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Approve only if your agent shows you exactly this{" "}
                {[session.requestCode && "code", keyPrincipal && "principal"].filter(Boolean).join(" and ")}.
                If no agent asked you to approve a session just now, or it shows something else, decline
                {onRevoke ? (session.requestedByConnectedApp ? " and disconnect the app" : " and revoke the token") : ""}.
              </p>
            </div>
          )}
          <p className="text-sm">
            {session.purpose ? (
              <>
                <span className="text-muted-foreground">Purpose, in the agent's words: </span>“{session.purpose}”
              </>
            ) : (
              <span className="text-muted-foreground">The agent did not say what it will do.</span>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {agentHeld ? (
              <>
                If you approve, <strong>the agent itself</strong> will be able to act as you until{" "}
                {formatUntil(session.requestedUntil)} with a key it holds: install code on any canister you
                control, and spend your cycles balance. hosty.live never receives that key and cannot act
                on its own. Nothing changes until the agent sends a call.
              </>
            ) : (
              <>
                If you approve, hosty.live will be able to act as you until{" "}
                {formatUntil(session.requestedUntil)}, using a key that only exists for this session: the
                agent can <strong>install code on any canister you control</strong>, and{" "}
                <strong>create canisters and top them up from your cycles balance</strong>. Nothing changes
                until the agent asks for it. You can end the session at any time in Settings.
              </>
            )}
          </p>
          {balanceTC !== undefined && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Coins className="h-3 w-3" />
              Your cycles balance: {balanceTC} TC. A new canister costs 0.84 to 1.5 TC.
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        {onRevoke && (
          <Button
            variant="outline"
            size="sm"
            className="border-red-500/40 text-red-500 hover:bg-red-500/10 hover:text-red-500 sm:mr-auto"
            onClick={onRevoke}
            disabled={busy}
          >
            <ShieldX className="h-4 w-4 mr-1" />
            {session.requestedByConnectedApp ? "Decline and disconnect app" : "Decline and revoke token"}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDecline} disabled={busy}>
          <X className="h-4 w-4 mr-1" />
          Decline
        </Button>
        <Button variant="outline" size="sm" onClick={() => onApprove(15)} disabled={busy}>
          Approve for 15 min
        </Button>
        <Button size="sm" onClick={() => onApprove()} disabled={busy}>
          <KeyRound className="h-4 w-4 mr-1" />
          {busy ? "Signing…" : `Approve until ${formatUntil(session.requestedUntil)}`}
        </Button>
      </div>
    </div>
  );
}

/** Shown on every panel page: pending approvals and a reminder while a session is active. */
export function DeploySessionCard() {
  const { pending, active, approve, decline, end, revokeToken, isApproving, isRevoking } = useDeploySessions();
  const { toast } = useToast();
  const [dismissedActive, setDismissedActive] = useState<string | null>(null);
  const [toRevoke, setToRevoke] = useState<DeploySessionInfo | null>(null);
  // Requests this web app makes itself are approved in place; only agents' ones count here.
  const agentRequests = pending.filter((s) => s.requestedByTokenId);
  // approved, declined or expired while the dialog was open (not by the revoke itself)
  const revokeTargetGone = !!toRevoke && !isRevoking && !pending.some((s) => s.id === toRevoke.id);
  const showBanner = pending.length > 0 || (!!active && dismissedActive !== active.id);

  const handleApprove = async (session: DeploySessionInfo, minutes?: number) => {
    try {
      const approved = await approve(session, minutes);
      toast.success(
        "Deploy session approved",
        approved.expiresAt ? `Active until ${formatUntil(approved.expiresAt)}.` : undefined,
      );
    } catch (err) {
      toast.error("Could not approve", err instanceof Error ? err.message : undefined);
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await decline(id);
    } catch (err) {
      toast.error("Could not decline", err instanceof Error ? err.message : undefined);
    }
  };

  const handleRevoke = async () => {
    if (!toRevoke?.requestedByTokenId) return;
    const app = !!toRevoke.requestedByConnectedApp;
    try {
      await revokeToken(toRevoke.requestedByTokenId, app);
      toast.success(
        app
          ? revokeTargetGone ? "App disconnected" : "Request declined, app disconnected"
          : revokeTargetGone ? "Token revoked" : "Request declined, token revoked",
        `${toRevoke.requestedByName ? `"${toRevoke.requestedByName}"` : app ? "The app" : "The token"} no longer works.`,
      );
    } catch (err) {
      toast.error(app ? "Could not disconnect the app" : "Could not revoke the token", err instanceof Error ? err.message : undefined);
    } finally {
      setToRevoke(null);
    }
  };

  const handleEnd = async (id: string) => {
    try {
      await end(id);
      toast.success("Deploy session ended");
    } catch (err) {
      toast.error("Could not end session", err instanceof Error ? err.message : undefined);
    }
  };

  if (!showBanner && !toRevoke) return null;

  return (
    <>
      {showBanner && (
        <div className="px-4 sm:px-6 pt-4 space-y-3 max-w-7xl mx-auto w-full">
          {agentRequests.length > 1 && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p>
                <strong>{agentRequests.length} deploy session requests are waiting.</strong> An agent asks for
                one session at a time and shows you the code of its request, so more than one usually means
                something went wrong. Approve only the request whose code your agent shows you, and decline the
                others; decline and revoke the token (or disconnect the app) of any request you do not recognize.
              </p>
            </div>
          )}
          {pending.map((session) => (
            <PendingSession
              key={session.id}
              session={session}
              busy={isApproving || isRevoking}
              onApprove={(minutes) => handleApprove(session, minutes)}
              onDecline={() => handleDecline(session.id)}
              onRevoke={session.requestedByTokenId ? () => setToRevoke(session) : undefined}
            />
          ))}
          {active && dismissedActive !== active.id && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
              <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
              <span className="flex-1">
                Deploy session active until {active.expiresAt ? formatUntil(active.expiresAt) : "?"}
                {active.requestedByName ? ` for "${active.requestedByName}"` : ""}: hosty.live can install
                code on your canisters.
              </span>
              <Button variant="outline" size="sm" onClick={() => handleEnd(active.id)}>
                End now
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDismissedActive(active.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
      <ConfirmDialog
        isOpen={!!toRevoke}
        title={
          toRevoke?.requestedByConnectedApp
            ? revokeTargetGone ? "Disconnect the app?" : "Decline and disconnect the app?"
            : revokeTargetGone ? "Revoke the token?" : "Decline and revoke the token?"
        }
        description={
          toRevoke?.requestedByConnectedApp
            ? `${
                revokeTargetGone
                  ? "This request is no longer pending: it was approved, declined or expired meanwhile. Disconnecting"
                  : "The request is declined and disconnecting"
              }${
                toRevoke?.requestedByName ? ` "${toRevoke.requestedByName}"` : " the app"
              } cuts it off from hosty.live at once and ends the deploy sessions it requested. To use it again, connect it again and sign in.`
            : `${
                revokeTargetGone
                  ? "This request is no longer pending: it was approved, declined or expired meanwhile. Revoking"
                  : "The request is declined and revoking"
              } the API token${
                toRevoke?.requestedByName ? ` "${toRevoke.requestedByName}"` : ""
              } cuts off every agent using it from hosty.live at once and ends the deploy sessions it requested. Give agents you trust a new token from Settings.`
        }
        confirmLabel={
          toRevoke?.requestedByConnectedApp
            ? revokeTargetGone ? "Disconnect" : "Decline and disconnect"
            : revokeTargetGone ? "Revoke token" : "Decline and revoke"
        }
        isLoading={isRevoking}
        onConfirm={handleRevoke}
        onCancel={() => setToRevoke(null)}
      />
    </>
  );
}
