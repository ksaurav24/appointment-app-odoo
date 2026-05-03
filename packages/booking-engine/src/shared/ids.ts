import type { EntityId } from '../domain/value-objects.ts';

export function toIdString(id: EntityId): string {
  return typeof id === 'string' ? id : String(id);
}

export function idsEqual(
  left: EntityId | null | undefined,
  right: EntityId | null | undefined,
): boolean {
  if (left == null || right == null) {
    return left == null && right == null;
  }

  return toIdString(left) === toIdString(right);
}
