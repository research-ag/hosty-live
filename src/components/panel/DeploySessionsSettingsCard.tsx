import { KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useDeploySessions } from "../../hooks/useDeploySessions";
import { useToast } from "../../hooks/useToast";

const VARIANT: Record<string, "success" | "secondary" | "default" | "destructive" | "outline"> = {
  ACTIVE: "success",
  PENDING: "default",
  EXPIRED: "secondary",
  ENDED: "secondary",
  DECLINED: "outline",
};

export function DeploySessionsSettingsCard() {
  const { sessions, isLoading, end, decline } = useDeploySessions();
  const { toast } = useToast();

  const stop = async (id: string, status: string) => {
    try {
      if (status === "PENDING") await decline(id);
      else await end(id);
    } catch (err) {
      toast.error("Failed", err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center">
          <KeyRound className="mr-2 h-5 w-5" />
          Deploy sessions
        </CardTitle>
        <CardDescription>
          A deploy session lets hosty.live act as you for a limited time: install backend canister
          modules, set up and import canisters, and create canisters or top them up from your cycles
          balance. Agents request one; you approve it here or on any panel page. hosty.live never
          becomes a controller of your canisters, and the session key is deleted when the session ends.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deploy sessions yet.</p>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 10).map((s) => {
              const open = s.status === "ACTIVE" || s.status === "PENDING";
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <Badge variant={VARIANT[s.status] ?? "secondary"}>{s.status}</Badge>
                  <span className="font-medium">{s.requestedByName ?? "hosty.live"}</span>
                  <span className="text-muted-foreground">
                    {s.status === "ACTIVE" && s.expiresAt
                      ? `until ${new Date(s.expiresAt).toLocaleString()}`
                      : s.status === "PENDING"
                        ? `requested until ${new Date(s.requestedUntil).toLocaleString()}`
                        : new Date(s.endedAt ?? s.createdAt).toLocaleString()}
                  </span>
                  {open && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                      onClick={() => stop(s.id, s.status)}
                    >
                      {s.status === "PENDING" ? "Decline" : "End"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
