import type { DeploymentStatus, SourceType } from '../types'

/**
 * UI helpers for displaying deployment data
 * These don't transform data - they only provide display formatting
 */

export function getStatusVariant(status: DeploymentStatus): 'secondary' | 'default' | 'success' | 'destructive' {
  switch (status) {
    case 'PENDING':
      return 'secondary'
    case 'BUILDING':
    case 'DEPLOYING':
      return 'default'
    case 'SUCCESS':
      return 'success'
    case 'FAILED':
    case 'CANCELLED':
      return 'destructive'
    default:
      return 'secondary'
  }
}

export function getStatusLabel(status: DeploymentStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pending'
    case 'BUILDING':
      return 'Building'
    case 'DEPLOYING':
      return 'Deploying'
    case 'SUCCESS':
      return 'Success'
    case 'FAILED':
      return 'Failed'
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return status
  }
}

export function isActivelyBuilding(status: DeploymentStatus): boolean {
  return status === 'BUILDING' || status === 'DEPLOYING' || status === 'PENDING'
}

export function getSourceTypeLabel(sourceType: SourceType): string {
  switch (sourceType) {
    case 'ZIP':
      return 'ZIP Upload'
    case 'GIT':
      return 'Git Repository'
    case 'URL':
      return 'Archive URL'
    default:
      return sourceType
  }
}

export function formatDuration(durationMs?: number): string {
  if (!durationMs) return 'N/A'
  return `${(durationMs / 1000).toFixed(1)}s`
}

