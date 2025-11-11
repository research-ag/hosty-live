import { CanisterInfo } from "../hooks/useCanisters.ts";

export type Canister = CanisterInfo

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

// Profile from backend
export interface Profile {
  userId: string
  username: string | null
  freeCanisterClaimedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

// Free Canister Claim Result
export interface FreeCanisterClaimResult {
  success: boolean
  data?: {
    canisterNumber: number
    canisterId: string
    frontendUrl: string
  }
  error?: string
}

// API Types for Edge Functions
export interface ApiCanister {
  id: string
  userId: string
  icCanisterId: string
  deleted: boolean
  deletedAt?: string
  createdAt: string
  updatedAt: string
  frontendUrl: string
  cyclesBalance?: string
  cyclesBalanceRaw?: string
  wasmBinarySize?: string
  moduleHash?: string
  controllers?: string[]
  isAssetCanister?: boolean
  isSystemController?: boolean
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