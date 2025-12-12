export const parseTCToRaw = (tc: string | number): bigint => {
  const DECIMALS = 12n
  if (typeof tc === 'number') {
    tc = tc.toFixed(12);
  }
  const parts = tc.trim()
  if (!/^\d*(?:\.\d{0,12})?$/.test(parts)) {
    throw new Error('Invalid amount format. Use up to 12 decimal places.')
  }
  const [wholeStr, fracStr = ''] = parts.split('.')
  const whole = BigInt(wholeStr || '0')
  const fracPadded = (fracStr + '0'.repeat(12)).slice(0, 12)
  const frac = BigInt(fracPadded)
  return whole * 10n ** DECIMALS + frac
}

export const formatTCFromRaw = (raw: string | number | bigint): string => {
  const n = typeof raw === "bigint" ? raw : BigInt(raw.toString());
  const DECIMALS = 12n;
  const denom = 10n ** DECIMALS;
  const whole = n / denom;
  const frac = n % denom;
  const fracStr = (Number(frac) / Number(denom)).toFixed(4).split(".")[1];
  return `${whole.toString()}.${fracStr}`;
}