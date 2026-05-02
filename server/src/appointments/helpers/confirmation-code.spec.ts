import { generateConfirmationCode } from './confirmation-code';

describe('generateConfirmationCode', () => {
  it('matches the CC- prefix format with 7 alphanumeric chars', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateConfirmationCode();
      expect(code).toMatch(/^CC-[A-HJKMNP-Z2-9]{7}$/);
    }
  });

  it('produces distinct codes across many invocations', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateConfirmationCode());
    // Strong probabilistic uniqueness: never expect collisions across 1000.
    expect(seen.size).toBe(1000);
  });
});
