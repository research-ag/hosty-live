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

export interface ApiDeployment {
  id: string
  canister_id: string
  status: 'PENDING' | 'BUILDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'DEPLOYING'
  status_reason?: string
  user_id: string
  build_command: string
  output_dir: string
  duration_ms?: number
  created_at: string
  updated_at: string
  build_service_job_id?: string
  deployed_at?: string
  build_logs?: string
  source_git_repo?: string
  source_type?: 'zip' | 'git'
  git_branch?: string
}

export type Response<T> = {
  success: true
  data: T
} | {
  success: false
  error: string
}