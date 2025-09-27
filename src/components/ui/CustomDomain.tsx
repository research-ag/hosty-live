import { Loader2, AlertCircle } from "lucide-react";
import type { CustomDomainCheckResult } from "../../api/custom-domain/endpoints";

interface CustomDomainProps {
  domain: string;
  checkResult: CustomDomainCheckResult | null;
  isLoading?: boolean;
  className?: string;
}

const getDomainStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-500";
    case "not_configured":
    case "registration_pending":
      return "bg-yellow-500";
    case "dns_invalid":
    case "registration_failed":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
};

const getDomainStatusName = (status: string) => {
  switch (status) {
    case "active":
      return "Active";
    case "not_configured":
      return "Not configured";
    case "registration_pending":
      return "Registration pending";
    case "dns_invalid":
      return "DNS invalid";
    case "registration_failed":
      return "Registration failed";
    default:
      return status;
  }
};

export function CustomDomain({
  domain,
  checkResult,
  isLoading = false,
  className = "",
}: CustomDomainProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <p className="text-sm font-mono">{domain}</p>

      {/* Status Indicator */}
      <div className="flex items-center gap-1">
        {isLoading ? (
          // Loading state
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : checkResult?.status ? (
          // Status circle with tooltip
          <div className="relative group">
            <div
              className={`h-3 w-3 rounded-full ${getDomainStatusColor(
                checkResult.status
              )} cursor-help`}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              {getDomainStatusName(checkResult.status)}
            </div>
          </div>
        ) : (
          // No status available
          <div className="h-3 w-3 rounded-full bg-gray-400" />
        )}

        {/* Error indicator with tooltip */}
        {checkResult?.errorMessage && (
          <div className="relative group">
            <AlertCircle className="h-3 w-3 text-red-500 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-red-600 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-[180px] w-max">
              {checkResult.errorMessage}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-red-600" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
