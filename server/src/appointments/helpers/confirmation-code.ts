import { randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generates a customer-facing confirmation code in the form `CC-XXXXXXX`.
 * Uses Crockford-ish base32 (no I/L/O/0/1) so codes are easy to read aloud.
 * 7 characters from a 30-symbol alphabet ≈ 2.2e10 possibilities — collision
 * risk is negligible at hackathon scale; the unique constraint on the column
 * is the final guard.
 */
export function generateConfirmationCode(): string {
  const bytes = randomBytes(7);
  let out = 'CC-';
  for (let i = 0; i < 7; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
