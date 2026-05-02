import {
  addMinutes,
  durationMinutes,
  mergeRanges,
  rangesOverlap,
  subtractBusyFromWindow,
} from './range';

const at = (h: number, m = 0) => new Date(Date.UTC(2026, 4, 5, h, m));

describe('range helpers', () => {
  describe('rangesOverlap', () => {
    it('returns true for partial overlap', () => {
      expect(
        rangesOverlap(
          { start: at(9), end: at(10) },
          { start: at(9, 30), end: at(10, 30) },
        ),
      ).toBe(true);
    });
    it('returns false when ranges are adjacent (end == start)', () => {
      expect(
        rangesOverlap(
          { start: at(9), end: at(10) },
          { start: at(10), end: at(11) },
        ),
      ).toBe(false);
    });
    it('returns false when disjoint', () => {
      expect(
        rangesOverlap(
          { start: at(9), end: at(10) },
          { start: at(11), end: at(12) },
        ),
      ).toBe(false);
    });
  });

  describe('mergeRanges', () => {
    it('merges overlapping ranges into one', () => {
      const merged = mergeRanges([
        { start: at(9), end: at(10) },
        { start: at(9, 30), end: at(11) },
      ]);
      expect(merged).toEqual([{ start: at(9), end: at(11) }]);
    });
    it('keeps disjoint ranges separate', () => {
      const merged = mergeRanges([
        { start: at(9), end: at(10) },
        { start: at(11), end: at(12) },
      ]);
      expect(merged.length).toBe(2);
    });
    it('merges adjacent (touching) ranges', () => {
      const merged = mergeRanges([
        { start: at(9), end: at(10) },
        { start: at(10), end: at(11) },
      ]);
      expect(merged).toEqual([{ start: at(9), end: at(11) }]);
    });
  });

  describe('subtractBusyFromWindow', () => {
    it('returns the full window when no busy ranges overlap', () => {
      const result = subtractBusyFromWindow({ start: at(9), end: at(17) }, [
        { start: at(20), end: at(21) },
      ]);
      expect(result).toEqual([{ start: at(9), end: at(17) }]);
    });
    it('punches a single hole in the middle', () => {
      const result = subtractBusyFromWindow({ start: at(9), end: at(17) }, [
        { start: at(12), end: at(13) },
      ]);
      expect(result).toEqual([
        { start: at(9), end: at(12) },
        { start: at(13), end: at(17) },
      ]);
    });
    it('clips busy ranges to the window edges', () => {
      const result = subtractBusyFromWindow({ start: at(9), end: at(17) }, [
        { start: at(8), end: at(10) },
      ]);
      expect(result).toEqual([{ start: at(10), end: at(17) }]);
    });
    it('handles multiple busy ranges and gaps', () => {
      const result = subtractBusyFromWindow({ start: at(9), end: at(17) }, [
        { start: at(10), end: at(11) },
        { start: at(13), end: at(14) },
      ]);
      expect(result).toEqual([
        { start: at(9), end: at(10) },
        { start: at(11), end: at(13) },
        { start: at(14), end: at(17) },
      ]);
    });
    it('returns empty when window is fully covered', () => {
      const result = subtractBusyFromWindow({ start: at(9), end: at(11) }, [
        { start: at(8), end: at(12) },
      ]);
      expect(result).toEqual([]);
    });
  });

  it('durationMinutes computes minutes between dates', () => {
    expect(durationMinutes({ start: at(9), end: at(10, 30) })).toBe(90);
  });

  it('addMinutes shifts the date', () => {
    expect(addMinutes(at(9), 45)).toEqual(at(9, 45));
  });
});
