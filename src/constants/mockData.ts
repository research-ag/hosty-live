import { Canister, Deployment } from '../types'

// Additional Blog Platform Examples
export const mockBlogPlatforms: Canister[] = [
  {
    id: 'rdgn6-7iaaa-aaaah-qcaiq-cai',
    name: 'Personal Tech Blog',
    cycles: 3200000000000,
    lastDeployment: '2024-01-16T11:15:00Z',
    status: 'active',
    frontendUrl: 'https://rdgn6-7iaaa-aaaah-qcaiq-cai.ic0.app',
    createdAt: '2024-01-03T16:45:00Z'
  },
  {
    id: 'blogx-4zaaa-aaaah-qebiq-cai',
    name: 'DevBlog Pro',
    cycles: 4500000000000,
    lastDeployment: '2024-01-18T14:22:00Z',
    status: 'active',
    frontendUrl: 'https://blogx-4zaaa-aaaah-qebiq-cai.ic0.app',
    createdAt: '2024-01-01T09:30:00Z'
  },
  {
    id: 'myblog-5xaaa-aaaah-qfciq-cai',
    name: 'Creative Writing Hub',
    cycles: 2800000000000,
    lastDeployment: '2024-01-19T10:45:00Z',
    status: 'active',
    frontendUrl: 'https://creativehub.blog',
    createdAt: '2024-01-02T15:20:00Z'
  },
  {
    id: 'writer-9baaa-aaaah-qgdiq-cai',
    name: 'Minimal Blog',
    cycles: 1200000000000,
    lastDeployment: '2024-01-17T16:30:00Z',
    status: 'active',
    frontendUrl: 'https://writer-9baaa-aaaah-qgdiq-cai.ic0.app',
    createdAt: '2024-01-05T11:15:00Z'
  },
  {
    id: 'travel-6caaa-aaaah-qheiq-cai',
    name: 'Travel Stories',
    cycles: 3800000000000,
    lastDeployment: '2024-01-20T08:15:00Z',
    status: 'active',
    frontendUrl: 'https://wanderlust.travel',
    createdAt: '2024-01-04T13:45:00Z'
  },
  {
    id: 'techie-8daaa-aaaah-qifiq-cai',
    name: 'TechInsights',
    cycles: 5200000000000,
    lastDeployment: '2024-01-21T12:00:00Z',
    status: 'active',
    frontendUrl: 'https://techinsights.dev',
    createdAt: '2023-12-28T10:30:00Z'
  },
  {
    id: 'news-7eaaa-aaaah-qjgiq-cai',
    name: 'Community News',
    cycles: 1800000000000,
    lastDeployment: '2024-01-15T14:20:00Z',
    status: 'inactive',
    frontendUrl: 'https://news-7eaaa-aaaah-qjgiq-cai.ic0.app',
    createdAt: '2024-01-06T09:00:00Z'
  },
  {
    id: 'recipe-3faaa-aaaah-qkhiq-cai',
    name: 'Food & Recipe Blog',
    cycles: 2200000000000,
    lastDeployment: '2024-01-22T09:30:00Z',
    status: 'active',
    frontendUrl: 'https://tastyrecipes.kitchen',
    createdAt: '2024-01-07T16:15:00Z'
  },
  {
    id: 'crypto-1gaaa-aaaah-qliq-cai',
    name: 'Crypto Analysis Blog',
    cycles: 4100000000000,
    lastDeployment: '2024-01-23T11:45:00Z',
    status: 'active',
    frontendUrl: 'https://crypto-1gaaa-aaaah-qliq-cai.ic0.app',
    createdAt: '2024-01-08T12:00:00Z'
  },
  {
    id: 'art-2haaa-aaaah-qmjiq-cai',
    name: 'Digital Art Showcase',
    cycles: 3600000000000,
    lastDeployment: '2024-01-24T15:10:00Z',
    status: 'active',
    frontendUrl: 'https://artgallery.studio',
    createdAt: '2024-01-09T14:30:00Z'
  }
]

export const mockCanisters: Canister[] = [
  {
    id: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    name: 'My Frontend App',
    cycles: 2500000000000,
    lastDeployment: '2024-01-15T10:30:00Z',
    status: 'active',
    frontendUrl: 'https://rdmx6-jaaaa-aaaah-qcaiq-cai.icp0.io',
    createdAt: '2024-01-10T08:15:00Z'
  },
  {
    id: 'rrkah-fqaaa-aaaah-qcaiq-cai',
    name: 'Portfolio Website',
    cycles: 1800000000000,
    lastDeployment: '2024-01-14T15:45:00Z',
    status: 'active',
    frontendUrl: 'https://rrkah-fqaaa-aaaah-qcaiq-cai.icp0.io',
    createdAt: '2024-01-08T12:30:00Z'
  },
  {
    id: 'renrk-eyaaa-aaaah-qcaiq-cai',
    name: 'E-commerce Store',
    cycles: 500000000000,
    lastDeployment: '2024-01-12T09:20:00Z',
    status: 'inactive',
    createdAt: '2024-01-05T14:00:00Z'
  },
  {
    id: 'rdgn6-7iaaa-aaaah-qcaiq-cai',
    name: 'Blog Platform',
    cycles: 3200000000000,
    lastDeployment: '2024-01-16T11:15:00Z',
    status: 'active',
    frontendUrl: 'https://rdgn6-7iaaa-aaaah-qcaiq-cai.ic0.app',
    createdAt: '2024-01-03T16:45:00Z'
  }
]

export const mockDeployments: Deployment[] = [
  {
    id: 'dep_001',
    canisterId: 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    status: 'deployed',
    statusReason: 'Deployment completed successfully',
    userId: 'user_123',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    duration: 45000,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:45Z',
    buildServiceJobId: 'job_abc123',
    deployedAt: '2024-01-15T10:30:45Z',
    buildLogs: 'Building application...\n✓ Build completed successfully\n✓ Assets optimized\n✓ Deployed to canister'
  },
  {
    id: 'dep_002',
    canisterId: 'rrkah-fqaaa-aaaah-qcaiq-cai',
    status: 'deployed',
    statusReason: 'Deployment completed successfully',
    userId: 'user_123',
    buildCommand: 'npm run build',
    outputDirectory: 'build',
    duration: 38000,
    createdAt: '2024-01-14T15:45:00Z',
    updatedAt: '2024-01-14T15:45:38Z',
    buildServiceJobId: 'job_def456',
    deployedAt: '2024-01-14T15:45:38Z',
    buildLogs: 'Installing dependencies...\nBuilding React application...\n✓ Build completed\n✓ Deployed successfully'
  },
  {
    id: 'dep_003',
    canisterId: 'rdgn6-7iaaa-aaaah-qcaiq-cai',
    status: 'building',
    statusReason: 'Build in progress',
    userId: 'user_123',
    buildCommand: 'yarn build',
    outputDirectory: 'out',
    createdAt: '2024-01-16T11:15:00Z',
    updatedAt: '2024-01-16T11:17:00Z',
    buildServiceJobId: 'job_ghi789',
    buildLogs: 'Starting build process...\nInstalling dependencies...\nBuilding application...'
  },
  {
    id: 'dep_004',
    canisterId: 'renrk-eyaaa-aaaah-qcaiq-cai',
    status: 'failed',
    statusReason: 'Build failed: Missing dependencies',
    userId: 'user_123',
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    duration: 12000,
    createdAt: '2024-01-12T09:20:00Z',
    updatedAt: '2024-01-12T09:20:12Z',
    buildServiceJobId: 'job_jkl012',
    buildLogs: 'Installing dependencies...\n✗ Error: Package not found\n✗ Build failed'
  }
]