export interface Canister {
  id: string
  userId: string
  icCanisterId: string
  name: string
  cycles: number
  lastDeployment: string
  status: 'active' | 'inactive'
  frontendUrl?: string
  createdAt: string
  updatedAt: string
  deleted: boolean
  deletedAt?: string
  cyclesBalance?: string
  cyclesBalanceRaw?: string
  wasmBinarySize?: string
  moduleHash?: string
  controllers?: string[]
  _apiData?: ApiCanister
  isAssetCanister?: boolean
  isSystemController?: boolean
}

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

export interface CyclesClaim {
  lastClaimAt: string
  nextClaimAt: string
  amount: number
}

export interface CyclesBalance {
  balance: number
  lastUpdated: string
}

// API Response Types
export interface CyclesInfo {
  cyclesBalance: string
  canisterCreationCost: string
  canCreateCanister: boolean
  balanceFormatted: string
}

export interface FaucetStatus {
  canUseFaucet: boolean
  cyclesBalance: string
  faucetAmount: string
  lastUsedAt: string | null
  nextAvailableAt: string | null
  cooldownMs: number
}

export interface FaucetClaimResult {
  success: boolean
  cyclesAdded: string
  newBalance: string
  faucetUsedAt: string
  nextAvailableAt: string
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