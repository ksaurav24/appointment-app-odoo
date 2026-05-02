export function parseTtlToMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) {
    const asNumber = Number(ttl);
    if (!Number.isFinite(asNumber)) {
      throw new Error(`Invalid TTL: ${ttl}`);
    }
    return asNumber * 1000;
  }
  const value = Number(match[1]);
  const unit = match[2];
  const multiplier =
    unit === 's'
      ? 1000
      : unit === 'm'
        ? 60_000
        : unit === 'h'
          ? 3_600_000
          : 86_400_000;
  return value * multiplier;
}
