import { useEffect, useRef, useState } from "react";
import { Terminal, Copy, Check, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "./Button";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";

interface LiveLogConsoleProps {
  logs: string;
  isLive?: boolean;
  title?: string;
  className?: string;
}

/**
 * Live log console component with auto-scroll and syntax highlighting
 *
 * Features:
 * - Auto-scroll to bottom when new logs arrive
 * - Copy all logs to clipboard
 * - Expand/collapse view
 * - Visual indicator when streaming
 */
export function LiveLogConsole({
  logs,
  isLive = false,
  title = "Build Logs",
  className = "",
}: LiveLogConsoleProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLPreElement>(null);
  const prevLogsLengthRef = useRef(0);

  // Auto-scroll to bottom when logs change (if auto-scroll is enabled)
  useEffect(() => {
    if (
      logContainerRef.current &&
      autoScroll &&
      logs.length > prevLogsLengthRef.current
    ) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
    prevLogsLengthRef.current = logs.length;
  }, [logs, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!logContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;

    if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    } else if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy logs:", err);
    }
  };

  const formatLogLine = (line: string) => {
    return line;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="flex items-center gap-2">
              {title}
              {isLive && (
                <span className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-40"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-foreground"></span>
                  </span>
                  Live
                </span>
              )}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {!autoScroll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAutoScroll(true);
                  if (logContainerRef.current) {
                    logContainerRef.current.scrollTop =
                      logContainerRef.current.scrollHeight;
                  }
                }}
                className="text-xs"
              >
                Resume Auto-scroll
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="text-xs">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span className="text-xs">Copy</span>
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="h-4 w-4" />
                  <span className="text-xs">Collapse</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4" />
                  <span className="text-xs">Expand</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          {logs ? (
            <pre
              ref={logContainerRef}
              onScroll={handleScroll}
              className="text-sm text-white/90 bg-black p-4 rounded-md overflow-auto whitespace-pre-wrap font-mono max-h-[600px] border border-white/10"
            >
              {logs.split("\n").map((line, i) => (
                <div key={i} className="hover:bg-white/5 leading-relaxed">
                  <span className="text-white/30 select-none mr-3 inline-block w-8 text-right text-xs">
                    {i + 1}
                  </span>
                  {formatLogLine(line)}
                </div>
              ))}
              {isLive && (
                <div className="text-white/50 animate-pulse mt-2">
                  ▋
                </div>
              )}
            </pre>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Terminal className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No logs available yet</p>
              {isLive && (
                <p className="text-sm mt-2">Waiting for build to start...</p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
