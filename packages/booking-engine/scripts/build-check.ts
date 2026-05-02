import * as engine from '../src/index.ts';

const requiredExports = [
  'getAvailability',
  'placeHold',
  'confirmBooking',
  'buildAvailabilityEvents',
  'buildNoShowFeatures',
  'scoreNoShow',
] as const;

for (const exportName of requiredExports) {
  if (typeof engine[exportName] !== 'function') {
    throw new Error(`Missing required engine contract export: ${exportName}`);
  }
}
