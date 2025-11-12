import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { getStoredAccessToken } from "../services/api";
import type {
  ApiDeployment,
  Deployment,
  DeploymentStatus,
  SourceType,
} from "../types";

// Get WebSocket URL - remove /api path if present since WebSocket is at root
function getWebSocketUrl(): string {
  let apiBase =
    (import.meta as any).env?.VITE_HOSTY_API_BASE ||
    "https://mrresearch.xyz/hosty-live-api";

  apiBase = apiBase.replace(/\/api\/?$/, "");
  apiBase = apiBase.replace(/\/hosty-live-api\/?$/, "");

  return apiBase;
}

const WS_URL = getWebSocketUrl();

interface DeploymentLogEvent {
  deploymentId: string;
  chunk: string;
  timestamp: string;
}

type DeploymentUpdatedEvent = ApiDeployment;

// Simple conversion from API response to typed deployment
// No transformation - backend is source of truth
function toDeployment(apiDeployment: ApiDeployment): Deployment {
  return {
    id: apiDeployment.id,
    canisterId: apiDeployment.canisterId,
    principal: apiDeployment.principal,
    status: apiDeployment.status as DeploymentStatus,
    statusReason: apiDeployment.statusReason,
    buildCommand: apiDeployment.buildCommand,
    outputDir: apiDeployment.outputDir,
    envVars: apiDeployment.envVars,
    sourceType: apiDeployment.sourceType as SourceType,
    sourceZipUrl: apiDeployment.sourceZipUrl,
    sourceGitRepo: apiDeployment.sourceGitRepo,
    gitBranch: apiDeployment.gitBranch,
    buildServiceJobId: apiDeployment.buildServiceJobId,
    buildLogs: apiDeployment.buildLogs,
    builtAssetsUrl: apiDeployment.builtAssetsUrl,
    durationMs: apiDeployment.durationMs,
    deployedAt: apiDeployment.deployedAt,
    createdAt: apiDeployment.createdAt,
    updatedAt: apiDeployment.updatedAt,
  };
}

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

interface UseRealTimeDeploymentsOptions {
  onLog?: (deploymentId: string, chunk: string) => void;
  onDeploymentUpdated?: (deployment: Deployment) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
}

/**
 * Hook for real-time deployment updates via WebSocket
 *
 * Connects to the backend WebSocket server and:
 * - Updates React Query cache when deployments change
 * - Streams build logs in real-time
 * - Provides connection status
 */
export function useRealTimeDeployments(
  options: UseRealTimeDeploymentsOptions = {}
) {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isUnmountingRef = useRef(false);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    optionsRef.current.onConnectionChange?.(status);
  }, []);

  const connect = useCallback(() => {
    // Don't connect if unmounting or already connected
    if (isUnmountingRef.current || socketRef.current?.connected) {
      return;
    }

    const token = getStoredAccessToken();
    if (!token) {
      console.log(
        "🔌 [useRealTimeDeployments] No auth token, skipping connection"
      );
      return;
    }

    console.log(
      "🔌 [useRealTimeDeployments] Connecting to WebSocket...",
      WS_URL
    );
    updateConnectionStatus("connecting");

    const socket = io(WS_URL, {
      auth: {
        token: `Bearer ${token}`,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      path: "/socket.io", // Default Socket.io path
    });

    socketRef.current = socket;

    // Connection successful
    socket.on("connect", () => {
      console.log("✅ [useRealTimeDeployments] Connected to WebSocket");
      updateConnectionStatus("connected");

      // Clear any pending reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
    });

    // Connection error
    socket.on("connect_error", (error) => {
      console.error(
        "❌ [useRealTimeDeployments] Connection error:",
        error.message
      );
      updateConnectionStatus("error");
    });

    // Disconnection
    socket.on("disconnect", (reason) => {
      console.log("🔌 [useRealTimeDeployments] Disconnected:", reason);
      updateConnectionStatus("disconnected");

      // Auto-reconnect if not intentional disconnect
      if (!isUnmountingRef.current && reason !== "io client disconnect") {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("🔄 [useRealTimeDeployments] Attempting to reconnect...");
          connect();
        }, 3000);
      }
    });

    // Listen for deployment updates
    socket.on("deployment:updated", (data: DeploymentUpdatedEvent) => {
      console.log(
        "📦 [useRealTimeDeployments] Deployment updated:",
        data.id,
        data.status
      );

      const deployment = toDeployment(data);

      // Update single deployment cache
      queryClient.setQueryData(["deployment", data.id], deployment);

      // Update deployments list cache
      queryClient.setQueryData(
        ["deployments"],
        (oldData: Deployment[] | undefined) => {
          if (!oldData) return oldData;

          const index = oldData.findIndex((d) => d.id === data.id);
          if (index !== -1) {
            const newData = [...oldData];
            newData[index] = deployment;
            return newData;
          } else {
            // New deployment, add to the beginning
            return [deployment, ...oldData];
          }
        }
      );

      optionsRef.current.onDeploymentUpdated?.(deployment);
    });

    // Listen for deployment logs
    socket.on("deployment:log", (data: DeploymentLogEvent) => {
      console.log(
        "📝 [useRealTimeDeployments] Log chunk for deployment:",
        data.deploymentId
      );

      // Update deployment cache with new log chunk
      queryClient.setQueryData(
        ["deployment", data.deploymentId],
        (oldData: Deployment | undefined) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            buildLogs: (oldData.buildLogs || "") + data.chunk,
          };
        }
      );

      optionsRef.current.onLog?.(data.deploymentId, data.chunk);
    });

    return socket;
  }, [queryClient, updateConnectionStatus]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log("🔌 [useRealTimeDeployments] Disconnecting...");
      socketRef.current.disconnect();
      socketRef.current = null;
      updateConnectionStatus("disconnected");
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
  }, [updateConnectionStatus]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    isUnmountingRef.current = false;
    connect();

    return () => {
      isUnmountingRef.current = true;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connectionStatus,
    socket: socketRef.current,
    reconnect: connect,
    disconnect,
  };
}
