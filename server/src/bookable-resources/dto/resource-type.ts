export const RESOURCE_TYPE_VALUES = [
  'ROOM',
  'EQUIPMENT',
  'VENUE',
  'OTHER',
] as const;

export type ResourceTypeValue = (typeof RESOURCE_TYPE_VALUES)[number];
