import type {
  CanisterInfo as BackendCanisterInfo,
  ProfileInfo as BackendProfileInfo
} from "../api/backend/backend.did";

// Use backend enums directly as source of truth
export type DeploymentStatus = 'PENDING' | 'BUILDING' | 'DEPLOYING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
export type SourceType = 'ZIP' | 'GIT' | 'URL'

export interface Deployment {
  id: string
  canisterId: string
  principal: string
  status: DeploymentStatus
  statusReason?: string
  buildCommand?: string
  outputDir?: string
  envVars?: Record<string, string>
  sourceType: SourceType
  sourceZipUrl?: string
  sourceGitRepo?: string
  gitBranch?: string
  buildServiceJobId?: string
  buildLogs?: string
  builtAssetsUrl?: string
  durationMs?: number
  deployedAt?: string
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  name: string
  email: string
}

export type Canister = {
  id: string;
  alias: string;
  description: string | null;
  cycles: number;
  status: 'active' | 'inactive';
  frontendUrl: string;
  createdAt: string;
  deployedAt: string | undefined;
  deletedAt: string | undefined;
  userIds: string[];
  cyclesBalance: string | undefined;
  cyclesBalanceRaw: string | undefined;
  wasmBinarySize: string | undefined;
  moduleHash: string | undefined;
  controllers: string[] | undefined;
  rentedUntil: string | null;
  ownedBySystem: boolean;
}

export function mapCanister(b: BackendCanisterInfo, rentedUntil: string | null = null): Canister {
  const icId = b.canisterId.toText();
  const createdAt = new Date(Number(b.createdAt / 1_000_000n)).toISOString();
  const deployedAt = b.deployedAt.length
    ? new Date(Number(b.deployedAt[0] / 1_000_000n)).toISOString()
    : undefined;
  const deletedAt = b.deletedAt.length
    ? new Date(Number(b.deletedAt[0] / 1_000_000n)).toISOString()
    : undefined;
  return {
    id: icId,
    alias: b.alias[0] || `Canister ${icId.slice(0, 5)}`,
    description: b.description[0] || null,
    cycles: 0,
    deployedAt,
    status: 'active',
    frontendUrl: b.frontendUrl,
    createdAt: createdAt,
    deletedAt,
    userIds: b.userIds.map(p => p.toText()),
    cyclesBalance: undefined,
    cyclesBalanceRaw: undefined,
    wasmBinarySize: undefined,
    moduleHash: undefined,
    controllers: undefined,
    rentedUntil,
    ownedBySystem: b.ownedBySystem,
  }
}

export interface Profile {
  userId: string
  username: string | null
  rentedCanister: Canister | null
  createdAt: string | null
  updatedAt: string | null
}

export function mapProfile(p: BackendProfileInfo): Profile {
  const toIso = (ns: bigint) => new Date(Number(ns / 1_000_000n)).toISOString();
  return {
    userId: p.userId.toText(),
    username: p.username.length ? p.username[0] : null,
    rentedCanister: p.rentedCanister.length
      ? mapCanister(p.rentedCanister[0][0], toIso(p.rentedCanister[0][1]))
      : null,
    createdAt: toIso(p.createdAt),
    updatedAt: toIso(p.updatedAt),
  };
}

// Backend response type (matches DeploymentResponseDto exactly)
export interface ApiDeployment {
  id: string
  principal: string
  canisterId: string
  status: string  // Backend sends as string (enum serialized)
  statusReason?: string
  buildCommand?: string
  outputDir?: string
  envVars?: Record<string, string>
  sourceType: string  // Backend sends as string (enum serialized)
  sourceZipUrl?: string
  sourceGitRepo?: string
  gitBranch?: string
  buildServiceJobId?: string
  buildLogs?: string
  builtAssetsUrl?: string
  durationMs?: number
  deployedAt?: string
  createdAt: string
  updatedAt: string
}

export interface DeploymentsListResponseDto {
  deployments: ApiDeployment[]
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

export type Response<T> = {
  success: true
  data: T
} | {
  success: false
  error: string
}