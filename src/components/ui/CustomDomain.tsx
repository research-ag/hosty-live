import { Loader2, AlertCircle } from "lucide-react";
import type {
  CustomDomainCheckResult,
  DomainStatus,
} from "../../api/custom-domain/endpoints";

interface CustomDomainProps {
  domain: string;
  checkResult: CustomDomainCheckResult | null;
  isLoading?: boolean;
  className?: string;
}

/**
 * Status → Color mapping (direct from IC API + our additions)
 */
const STATUS_CONFIG: Record<DomainStatus, { color: string; label: string }> = {
  registered: { color: "bg-green-500", label: "Registered" },
  registering: { color: "bg-blue-500", label: "Registering" },
  not_configured: { color: "bg-yellow-500", label: "Not configured" },
  failed: { color: "bg-red-500", label: "Failed" },
  expired: { color: "bg-red-500", label: "Expired" },
  routing_error: { color: "bg-orange-500", label: "Routing mismatch" },
};

const getStatusConfig = (status: DomainStatus) =>
  STATUS_CONFIG[status] || { color: "bg-gray-400", label: status };

export function CustomDomain({
  domain,
  checkResult,
  isLoading = false,
  className = "",
}: CustomDomainProps) {
  const config = checkResult?.status
    ? getStatusConfig(checkResult.status)
    : null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <p className="text-sm font-mono">{domain}</p>

      <div className="flex items-center gap-1">
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : config ? (
          <div className="relative group">
            <div className={`h-3 w-3 rounded-full ${config.color} cursor-help`} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {config.label}
            </div>
          </div>
        ) : (
          <div className="h-3 w-3 rounded-full bg-gray-400" />
        )}

        {checkResult?.errorMessage && (
          <div className="relative group">
            <AlertCircle className="h-3 w-3 text-red-500 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-red-600 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 max-w-[200px] w-max">
              {checkResult.errorMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
