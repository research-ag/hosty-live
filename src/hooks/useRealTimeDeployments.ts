import { useEffect, useRef, useCallback, useState } from "react";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
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
    "https://api.hosty.live";

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
    redeployedFromId: apiDeployment.redeployedFromId,
    createdAt: apiDeployment.createdAt,
    updatedAt: apiDeployment.updatedAt,
    isDryRun: apiDeployment.isDryRun,
    pureAssets: apiDeployment.pureAssets,
    kind: apiDeployment.kind as Deployment["kind"],
    installMode: apiDeployment.installMode as Deployment["installMode"],
    wasmHash: apiDeployment.wasmHash,
    initArgText: apiDeployment.initArgText,
    wasmMemoryPersistence: apiDeployment.wasmMemoryPersistence,
    skipPreUpgrade: apiDeployment.skipPreUpgrade,
    postInstallMethod: apiDeployment.postInstallMethod,
    sessionId: apiDeployment.sessionId,
    snapshotId: apiDeployment.snapshotId,
    motokoEntry: apiDeployment.motokoEntry,
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
 * One Socket.IO connection is shared by every mounted hook instance (the panel layout
 * keeps one open so deploy session requests reach every page; the deployment pages add
 * their own log and toast callbacks). The socket closes when the last instance unmounts.
 */
type Subscriber = { current: UseRealTimeDeploymentsOptions };
const subscribers = new Set<Subscriber>();
const statusListeners = new Set<(status: ConnectionStatus) => void>();
let sharedSocket: Socket | null = null;
let sharedStatus: ConnectionStatus = "disconnected";
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

function setSharedStatus(status: ConnectionStatus) {
  sharedStatus = status;
  statusListeners.forEach((l) => l(status));
  subscribers.forEach((s) => s.current.onConnectionChange?.(status));
}

function connectShared(queryClient: QueryClient) {
  if (sharedSocket?.connected || subscribers.size === 0) return;

  const token = getStoredAccessToken();
  if (!token) {
    console.log("🔌 [useRealTimeDeployments] No auth token, skipping connection");
    return;
  }
  if (sharedSocket) {
    // A reconnect must present the current session token, not the one it was created with.
    sharedSocket.auth = { token: `Bearer ${token}` };
    sharedSocket.connect();
    return;
  }

  console.log("🔌 [useRealTimeDeployments] Connecting to WebSocket...", WS_URL);
  setSharedStatus("connecting");

  const socket = io(WS_URL, {
    auth: { token: `Bearer ${token}` },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    path: "/socket.io",
  });
  sharedSocket = socket;

  socket.on("connect", () => {
    console.log("✅ [useRealTimeDeployments] Connected to WebSocket");
    setSharedStatus("connected");
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
  });

  socket.on("connect_error", (error) => {
    console.error("❌ [useRealTimeDeployments] Connection error:", error.message);
    setSharedStatus("error");
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 [useRealTimeDeployments] Disconnected:", reason);
    setSharedStatus("disconnected");
    if (subscribers.size > 0 && reason !== "io client disconnect") {
      reconnectTimer = setTimeout(() => {
        console.log("🔄 [useRealTimeDeployments] Attempting to reconnect...");
        connectShared(queryClient);
      }, 3000);
    }
  });

  socket.on("deployment:updated", (data: DeploymentUpdatedEvent) => {
    console.log("📦 [useRealTimeDeployments] Deployment updated:", data.id, data.status);
    const deployment = toDeployment(data);

    queryClient.setQueryData(["deployment", data.id], deployment);
    queryClient.setQueryData(["deployments"], (oldData: Deployment[] | undefined) => {
      if (!oldData) return oldData;
      const index = oldData.findIndex((d) => d.id === data.id);
      if (index !== -1) {
        const newData = [...oldData];
        newData[index] = deployment;
        return newData;
      }
      return [deployment, ...oldData];
    });

    subscribers.forEach((s) => s.current.onDeploymentUpdated?.(deployment));
  });

  // Deploy session requested / approved / ended: refresh the sessions query
  socket.on("session:updated", () => {
    queryClient.invalidateQueries({ queryKey: ["deploy-sessions"] });
  });

  socket.on("deployment:log", (data: DeploymentLogEvent) => {
    queryClient.setQueryData(
      ["deployment", data.deploymentId],
      (oldData: Deployment | undefined) => {
        if (!oldData) return oldData;
        return { ...oldData, buildLogs: (oldData.buildLogs || "") + data.chunk };
      }
    );
    subscribers.forEach((s) => s.current.onLog?.(data.deploymentId, data.chunk));
  });
}

function disconnectShared() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }
  if (sharedSocket) {
    console.log("🔌 [useRealTimeDeployments] Disconnecting...");
    sharedSocket.disconnect();
    sharedSocket = null;
    setSharedStatus("disconnected");
  }
}

/**
 * Hook for real-time deployment updates via WebSocket
 *
 * - Updates React Query cache when deployments change
 * - Streams build logs in real-time
 * - Refreshes deploy sessions when the API reports a change
 * - Provides connection status
 */
export function useRealTimeDeployments(
  options: UseRealTimeDeploymentsOptions = {}
) {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(sharedStatus);
  const subscriberRef = useRef<Subscriber>({ current: options });

  useEffect(() => {
    subscriberRef.current.current = options;
  }, [options]);

  const connect = useCallback(() => connectShared(queryClient), [queryClient]);

  const disconnect = useCallback(() => {
    subscribers.delete(subscriberRef.current);
    if (subscribers.size === 0) disconnectShared();
  }, []);

  useEffect(() => {
    const subscriber = subscriberRef.current;
    subscribers.add(subscriber);
    statusListeners.add(setConnectionStatus);
    connectShared(queryClient);

    return () => {
      subscribers.delete(subscriber);
      statusListeners.delete(setConnectionStatus);
      if (subscribers.size === 0) disconnectShared();
    };
  }, [queryClient]);

  return {
    connectionStatus,
    socket: sharedSocket,
    reconnect: connect,
    disconnect,
  };
}
