import { getBackendActor } from '../api/backend'
import { type Canister, mapCanister, mapProfile } from '../types'

export async function getMyCanisters(): Promise<Canister[]> {
  const backend = await getBackendActor()
  const [rawCanisters, profile] = await Promise.all([
    backend.listCanisters(),
    backend.getProfile(),
  ])
  let canisters = rawCanisters.map((c: any) => mapCanister(c))
  if (profile.length) {
    const mappedProfile = mapProfile(profile[0])
    if (mappedProfile?.rentedCanister) {
      canisters = [mappedProfile.rentedCanister, ...canisters]
    }
  }
  return canisters
}
