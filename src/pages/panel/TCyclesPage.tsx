import { RefreshCw, Info, Coins } from "lucide-react";
import { Button } from "../../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { CopyButton } from "../../components/ui/CopyButton";
import { useTCycles } from "../../hooks/useTCycles";
import { useAuth } from "../../hooks/useAuth";

export function TCyclesPage() {
  const { principal } = useAuth();
  const { balanceTC, isLoading, isFetching, error, refresh } = useTCycles(
    principal ?? undefined
  );

  const handleRefresh = async () => {
    await refresh();
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Cycles</h1>
          <p className="text-muted-foreground">Manage your cycles balance</p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isLoading || isFetching}
          className="flex items-center gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              isLoading || isFetching ? "animate-spin" : ""
            }`}
          />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card
          className="hover:shadow-lg transition-all duration-200"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <CardHeader>
            <CardTitle className="flex items-center">
              <Coins className="mr-2 h-5 w-5" />
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent
            style={{ display: "flex", flexDirection: "column", flexGrow: "1" }}
          >
            <div className="text-center" style={{ display: "contents" }}>
              {isLoading ? (
                <div className="flex items-center justify-center gap-3 py-6">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  <span>Loading balance...</span>
                </div>
              ) : error ? (
                <div className="text-destructive">{error}</div>
              ) : (
                <>
                  <div style={{ flexGrow: "1" }}></div>
                  <div className="text-4xl font-bold mb-2">
                    {principal ? (balanceTC ?? "0.0000") + " TC" : "-"}
                  </div>
                  <div style={{ flexGrow: "1" }}></div>
                  {principal && (
                    <div className="mt-4">
                      <Button
                        onClick={() =>
                          window.open(
                            `https://cycle.express/?to=${principal}`,
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                        size="sm"
                      >
                        Deposit using Cycle Express
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="mr-2 h-5 w-5" />
              About Cycles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Hosting costs on the Internet Computer only arise for canister
              creation, upload and storage, not for traffic. All hosting cost is
              paid in cycles. Your first canister is provided for free by
              hosty.live and will accommodate uploading a small website and
              hosting it for over a year. For additional services you need a
              cycle balance. You can buy cycles with a credit card through Cycle
              Express.
            </p>
            <p>
              Expert note: The cycle balance you see here is self-hosted by your
              principal. Hosty.live does not have access to your cycles. If you
              already own TCYCLES in another wallet then you can transfer them
              here by sending them your principal.
            </p>
            {principal ? (
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground mb-2">
                  Your principal
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-sm break-all text-foreground flex-1">
                    {principal}
                  </div>
                  <CopyButton text={principal} size="icon" variant="ghost" />
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Your principal will be displayed here
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
