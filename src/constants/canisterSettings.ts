/**
 * Freezing threshold of the canisters hosty.live creates and resets, and the most a frontend
 * keeps before a deploy (higher ones are lowered to it); keep equal to the API's
 * USER_CANISTER_FREEZING_THRESHOLD and the backend pool's. The frozen reserve is idle burn
 * x threshold and grows with memory, so a long threshold (we used 365 days) makes the asset
 * canister's first upload fail on a ~1T balance with "cannot grow memory due to
 * insufficient cycles", and topping up barely helps.
 */
export const FREEZING_THRESHOLD_SECONDS = 30n * 24n * 60n * 60n;
