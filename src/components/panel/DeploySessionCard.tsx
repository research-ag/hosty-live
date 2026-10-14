import { useState } from "react";
import { Bot, KeyRound, ShieldAlert, X } from "lucide-react";
import { Button } from "../ui/Button";
import { useDeploySessions } from "../../hooks/useDeploySessions";
import { useToast } from "../../hooks/useToast";
import type { DeploySessionInfo } from "../../services/sessions";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function PendingSession({
  session,
  onApprove,
  onDecline,
  busy,
}: {
  session: DeploySessionInfo;
  onApprove: (minutes?: number) => void;
  onDecline: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-amber-500/20 p-2">
          <Bot className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold">
            {session.requestedByName ? `"${session.requestedByName}"` : "An agent"} asks for a deploy
            session
          </p>
          <p className="text-sm text-muted-foreground">
            If you approve, hosty.live will be able to <strong>install code on any canister you
            control</strong> until {formatTime(session.requestedUntil)}, using a key that only exists
            for this session. Nothing changes on your canisters until a deployment is sent. You can end
            the session at any time in Settings.
          </p>
          <p className="text-xs text-muted-foreground">Requested {formatTime(session.createdAt)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onDecline} disabled={busy}>
          <X className="h-4 w-4 mr-1" />
          Decline
        </Button>
        <Button variant="outline" size="sm" onClick={() => onApprove(15)} disabled={busy}>
          Approve for 15 min
        </Button>
        <Button size="sm" onClick={() => onApprove()} disabled={busy}>
          <KeyRound className="h-4 w-4 mr-1" />
          {busy ? "Signing…" : `Approve until ${formatTime(session.requestedUntil)}`}
        </Button>
      </div>
    </div>
  );
}

/** Shown on every panel page: pending approvals and a reminder while a session is active. */
export function DeploySessionCard() {
  const { pending, active, approve, decline, end, isApproving } = useDeploySessions();
  const { toast } = useToast();
  const [dismissedActive, setDismissedActive] = useState<string | null>(null);

  const handleApprove = async (session: DeploySessionInfo, minutes?: number) => {
    try {
      const approved = await approve(session, minutes);
      toast.success(
        "Deploy session approved",
        approved.expiresAt ? `Active until ${formatTime(approved.expiresAt)}.` : undefined,
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

  const handleEnd = async (id: string) => {
    try {
      await end(id);
      toast.success("Deploy session ended");
    } catch (err) {
      toast.error("Could not end session", err instanceof Error ? err.message : undefined);
    }
  };

  if (pending.length === 0 && (!active || dismissedActive === active.id)) return null;

  return (
    <div className="px-4 sm:px-6 pt-4 space-y-3 max-w-7xl mx-auto w-full">
      {pending.map((session) => (
        <PendingSession
          key={session.id}
          session={session}
          busy={isApproving}
          onApprove={(minutes) => handleApprove(session, minutes)}
          onDecline={() => handleDecline(session.id)}
        />
      ))}
      {active && dismissedActive !== active.id && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1">
            Deploy session active until {active.expiresAt ? formatTime(active.expiresAt) : "?"}
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
  );
}
