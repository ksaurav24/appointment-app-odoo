import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordService } from './password.service';

const cfg = (cost = 4): ConfigService<any, true> =>
  ({ get: () => cost }) as unknown as ConfigService<any, true>;

describe('PasswordService', () => {
  describe('validatePolicy', () => {
    it.each([
      ['short', 'short1A'],
      ['letters only', 'lettersonly'],
      ['numbers only', '12345678'],
      ['empty', ''],
    ])('rejects %s', (_label, pw) => {
      const svc = new PasswordService(cfg());
      expect(() => svc.validatePolicy(pw)).toThrow(BadRequestException);
    });

    it('accepts a compliant password', () => {
      const svc = new PasswordService(cfg());
      expect(() => svc.validatePolicy('Abcdef12')).not.toThrow();
    });

    it('rejects passwords longer than 72 bytes', () => {
      const svc = new PasswordService(cfg());
      const pw = 'a1' + 'x'.repeat(80);
      expect(() => svc.validatePolicy(pw)).toThrow(BadRequestException);
    });
  });

  describe('hash + compare', () => {
    it('round-trips a password', async () => {
      const svc = new PasswordService(cfg(4));
      const hash = await svc.hash('Abcdef12');
      expect(hash).not.toBe('Abcdef12');
      await expect(svc.compare('Abcdef12', hash)).resolves.toBe(true);
      await expect(svc.compare('wrongPass1', hash)).resolves.toBe(false);
    });
  });
});
