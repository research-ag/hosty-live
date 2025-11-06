import { CanisterInfo } from "../hooks/useCanisters.ts";

export type Canister = CanisterInfo

export interface Deployment {
  id: string
  canisterId: string
  status: 'pending' | 'building' | 'deployed' | 'failed'
  statusReason?: string
  userId: string
  buildCommand: string
  outputDirectory: string
  duration?: number
  createdAt: string
  updatedAt: string
  buildServiceJobId?: string
  deployedAt?: string
  buildLogs?: string
  sourceGitRepo?: string
  sourceType?: 'zip' | 'git'
  gitBranch?: string
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

export enum DeploymentStatus {
  PENDING = 'PENDING',
  BUILDING = 'BUILDING',
  DEPLOYING = 'DEPLOYING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum SourceType {
  ZIP = 'ZIP',
  GIT = 'GIT',
  URL = 'URL',
}

export interface ApiDeployment {
  id: string
  principal: string
  canisterId: string
  status: DeploymentStatus | keyof typeof DeploymentStatus | string
  statusReason?: string
  buildCommand?: string
  outputDir?: string
  envVars?: Record<string, string>
  sourceType: SourceType | keyof typeof SourceType | string
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