import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "./Button";

interface CopyButtonProps {
  text: string;
  variant?: "ghost" | "outline";
  size?: "sm" | "icon";
  className?: string;
  buttonClassName?: string;
  children?: React.ReactNode;
}

export function CopyButton({
  text,
  variant = "ghost",
  size = "sm",
  className = "",
  buttonClassName = "",
  children,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <Button
        variant={variant}
        size={size}
        onClick={handleCopy}
        className={`transition-all duration-200 ${buttonClassName}`}
      >
        {children || (
          <>
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </>
        )}
      </Button>

      {/* Tooltip */}
      <div
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 ${
          copied ? "bg-green-600 dark:bg-green-600" : ""
        }`}
      >
        {copied ? "Copied!" : "Copy"}
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900 dark:border-t-gray-700"
          style={{ borderTopColor: copied ? "#16a34a" : undefined }}
        />
      </div>
    </div>
  );
}
